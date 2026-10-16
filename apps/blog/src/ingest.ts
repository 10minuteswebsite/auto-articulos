// API de ingestión: SEO Total → BLOG IA (blueprint §5).
//
// POST /api/ingest   (solo en env.apiHost)
//   x-blogia-timestamp: epoch en segundos
//   x-blogia-signature: hex(HMAC-SHA256(secret, `${timestamp}.${cuerpo}`))
//   cuerpo JSON: { event_id, type, tenant_id, data }
//
// Garantías: autenticada y con ventana de tiempo anti-repetición; idempotente
// por (tenant_id, event_id); cada evento se aplica en UNA transacción, así que
// un fallo nunca deja contenido a medias (criterio de aceptación 13); el HTML
// se sanitiza al entrar.

import type { Env } from "./types";
import type { Stmt } from "./db";
import { isValidSlug, normalizeHost, stripTags, truncate } from "./util";
import { sanitizeHtml } from "./sanitize";

export const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_SKEW_SECONDS = 300;

export class IngestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function signBody(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${body}`)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verify(env: Env, req: Request, body: string): Promise<void> {
  const ts = req.headers.get("x-blogia-timestamp") ?? "";
  const sig = req.headers.get("x-blogia-signature") ?? "";
  const now = (env.now?.() ?? new Date()).getTime() / 1000;
  if (!env.ingestSecret || !/^\d{9,12}$/.test(ts) || Math.abs(now - Number(ts)) > MAX_SKEW_SECONDS) {
    throw new IngestError(401, "Firma o marca de tiempo inválida");
  }
  if (!timingSafeEqual(await signBody(env.ingestSecret, ts, body), sig)) {
    throw new IngestError(401, "Firma o marca de tiempo inválida");
  }
}

type Json = Record<string, unknown>;
const str = (v: unknown, field: string, max = 100_000, required = true): string => {
  if (v === undefined || v === null || v === "") {
    if (required) throw new IngestError(400, `Falta el campo ${field}`);
    return "";
  }
  if (typeof v !== "string" || v.length > max) throw new IngestError(400, `Campo ${field} inválido`);
  return v;
};
const isoDate = (v: unknown, field: string): string => {
  const s = str(v, field, 40);
  if (Number.isNaN(new Date(s).getTime())) throw new IngestError(400, `Campo ${field} no es una fecha válida`);
  return new Date(s).toISOString();
};

const cid = (tenant: string, sourceId: string) => `${tenant}:${sourceId}`;

export async function handleIngest(env: Env, req: Request): Promise<Response> {
  const json = (status: number, payload: unknown, extra: HeadersInit = {}) =>
    new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });

  if (req.method !== "POST") return json(405, { ok: false, error: "Método no permitido" }, { allow: "POST" });
  try {
    const body = await req.text();
    if (enc.encode(body).length > MAX_BODY_BYTES) throw new IngestError(413, "Cuerpo demasiado grande");
    await verify(env, req, body);

    let evt: Json;
    try {
      evt = JSON.parse(body) as Json;
    } catch {
      throw new IngestError(400, "JSON inválido");
    }
    const eventId = str(evt.event_id, "event_id", 200);
    const type = str(evt.type, "type", 80);
    const tenantId = str(evt.tenant_id, "tenant_id", 120);
    const data = (evt.data && typeof evt.data === "object" ? evt.data : {}) as Json;
    const nowIso = (env.now?.() ?? new Date()).toISOString();

    const done = await env.db.first<{ status: string }>(
      "SELECT status FROM publish_events WHERE tenant_id = ? AND source_event_id = ?",
      [tenantId, eventId],
    );
    if (done?.status === "ok") return json(200, { ok: true, result: "duplicate" });

    try {
      const { stmts, result } = await build(env, type, tenantId, data, nowIso);
      stmts.push({
        sql: "INSERT OR REPLACE INTO publish_events (tenant_id, source_event_id, type, status, error, created_at) VALUES (?, ?, ?, 'ok', NULL, ?)",
        params: [tenantId, eventId, type, nowIso],
      });
      stmts.push({
        sql: "INSERT INTO audit_log (tenant_id, actor, action, result, detail, timestamp) VALUES (?, 'seo-total', ?, ?, ?, ?)",
        params: [tenantId, type, result, eventId, nowIso],
      });
      await env.db.batch(stmts);
      return json(200, { ok: true, result });
    } catch (e) {
      const message = e instanceof IngestError ? e.message : "Error interno";
      // Se registra el fallo (recuperable: el mismo evento puede reintentarse).
      await env.db
        .run(
          "INSERT OR REPLACE INTO publish_events (tenant_id, source_event_id, type, status, error, created_at) VALUES (?, ?, ?, 'error', ?, ?)",
          [tenantId, eventId, type, message, nowIso],
        )
        .catch(() => {});
      throw e instanceof IngestError ? e : new IngestError(500, message);
    }
  } catch (e) {
    if (e instanceof IngestError) return json(e.status, { ok: false, error: e.message });
    return json(500, { ok: false, error: "Error interno" });
  }
}

async function build(env: Env, type: string, tenantId: string, d: Json, nowIso: string): Promise<{ stmts: Stmt[]; result: string }> {
  if (type === "blog.provision") return provision(env, tenantId, d, nowIso);

  const tenant = await env.db.first<{ id: string }>("SELECT id FROM tenants WHERE id = ?", [tenantId]);
  if (!tenant) throw new IngestError(404, "Tenant desconocido");

  switch (type) {
    case "category.upsert": return categoryUpsert(tenantId, d);
    case "article.publish":
    case "article.update": return articleUpsert(env, tenantId, d, nowIso);
    case "article.unpublish": return articleUnpublish(tenantId, d, nowIso);
    case "blog.settings.update": return settingsUpdate(env, tenantId, d);
    case "blog.subscription.suspend":
      return { stmts: [{ sql: "UPDATE tenants SET subscription_state = 'suspended' WHERE id = ?", params: [tenantId] }], result: "applied" };
    case "blog.subscription.resume":
      return { stmts: [{ sql: "UPDATE tenants SET subscription_state = 'active' WHERE id = ?", params: [tenantId] }], result: "applied" };
    case "blog.domain.change": return domainChange(env, tenantId, d, nowIso);
    default: throw new IngestError(400, `Tipo de evento no soportado: ${type}`);
  }
}

async function provision(env: Env, tenantId: string, d: Json, nowIso: string) {
  const account = str(d.seo_total_account_id, "seo_total_account_id", 120);
  const hostname = normalizeHost(str(d.hostname, "hostname", 253));
  const existing = await env.db.first("SELECT id FROM tenants WHERE id = ?", [tenantId]);
  if (existing) return { stmts: [], result: "applied" }; // re-provisionar no duplica nada
  const byAccount = await env.db.first("SELECT id FROM tenants WHERE seo_total_account_id = ?", [account]);
  if (byAccount) throw new IngestError(409, "Esta cuenta ya tiene un blog");
  const host = await env.db.first("SELECT tenant_id FROM domains WHERE hostname = ?", [hostname]);
  if (host) throw new IngestError(409, "Ese hostname ya está en uso");
  return {
    stmts: [
      { sql: "INSERT INTO tenants (id, seo_total_account_id, subscription_state, created_at) VALUES (?, ?, 'active', ?)", params: [tenantId, account, nowIso] },
      {
        sql: "INSERT INTO blogs (tenant_id, status, site_url, language, brand_json) VALUES (?, 'pending_dns', ?, ?, ?)",
        params: [tenantId, str(d.site_url, "site_url", 500, false) || null, str(d.language, "language", 10, false) || "es", JSON.stringify(d.brand ?? {})],
      },
      { sql: "INSERT INTO domains (hostname, tenant_id, verification_status, tls_status, is_primary, created_at) VALUES (?, ?, 'pending', 'pending', 1, ?)", params: [hostname, tenantId, nowIso] },
    ],
    result: "applied",
  };
}

function categoryUpsert(tenantId: string, d: Json) {
  const sourceId = str(d.id, "id", 120);
  const slug = str(d.slug, "slug", 120);
  if (!isValidSlug(slug)) throw new IngestError(400, "Slug de categoría inválido o reservado");
  return {
    stmts: [{
      sql: `INSERT INTO categories (id, tenant_id, slug, name, description, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, description = excluded.description,
            sort_order = excluded.sort_order, status = excluded.status`,
      params: [cid(tenantId, sourceId), tenantId, slug, str(d.name, "name", 200), str(d.description, "description", 2000, false),
        Number.isInteger(d.sort_order) ? d.sort_order : 0, d.status === "inactive" ? "inactive" : "active"],
    }],
    result: "applied",
  };
}

async function articleUpsert(env: Env, tenantId: string, d: Json, nowIso: string) {
  const sourceId = str(d.source_article_id, "source_article_id", 120);
  const slug = str(d.slug, "slug", 120);
  if (!isValidSlug(slug)) throw new IngestError(400, "Slug de artículo inválido o reservado");
  const title = str(d.title, "title", 300);
  const body = sanitizeHtml(str(d.body_html, "body_html", MAX_BODY_BYTES));
  if (!stripTags(body)) throw new IngestError(400, "El artículo no tiene contenido");
  const revision = Number.isInteger(d.revision) && (d.revision as number) > 0 ? (d.revision as number) : 1;
  const publishedAt = isoDate(d.published_at, "published_at");
  const id = cid(tenantId, sourceId);

  const current = await env.db.first<{ revision: number }>("SELECT revision FROM articles WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (current && current.revision >= revision) return { stmts: [], result: "stale" };

  const clash = await env.db.first("SELECT id FROM articles WHERE tenant_id = ? AND slug = ? AND id != ?", [tenantId, slug, id]);
  if (clash) throw new IngestError(409, "Ya existe otro artículo con ese slug");

  const categoryIds = Array.isArray(d.category_ids) ? (d.category_ids as unknown[]).map(String) : [];
  const links: Stmt[] = [];
  for (const c of categoryIds) {
    const cat = await env.db.first("SELECT id FROM categories WHERE id = ? AND tenant_id = ?", [cid(tenantId, c), tenantId]);
    if (!cat) throw new IngestError(400, `Categoría desconocida: ${c}`);
    links.push({ sql: "INSERT OR IGNORE INTO article_categories (tenant_id, article_id, category_id) VALUES (?, ?, ?)", params: [tenantId, id, cid(tenantId, c)] });
  }

  const cover = str(d.cover_image_url, "cover_image_url", 1000, false);
  if (cover && !/^https:\/\//i.test(cover)) throw new IngestError(400, "cover_image_url debe ser https");

  return {
    stmts: [
      {
        sql: `INSERT INTO articles (id, tenant_id, source_article_id, slug, title, excerpt, body_html, cover_image_url, cover_alt, author,
                seo_title, meta_description, language, status, revision, published_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, excerpt = excluded.excerpt,
                body_html = excluded.body_html, cover_image_url = excluded.cover_image_url, cover_alt = excluded.cover_alt,
                author = excluded.author, seo_title = excluded.seo_title, meta_description = excluded.meta_description,
                language = excluded.language, status = 'published', revision = excluded.revision,
                published_at = excluded.published_at, updated_at = excluded.updated_at`,
        params: [id, tenantId, sourceId, slug, title, truncate(str(d.excerpt, "excerpt", 1000, false) || stripTags(body), 300), body,
          cover || null, str(d.cover_alt, "cover_alt", 300, false) || null, str(d.author, "author", 200, false) || null,
          str(d.seo_title, "seo_title", 200, false) || null, str(d.meta_description, "meta_description", 400, false) || null,
          str(d.language, "language", 10, false) || "es", revision, publishedAt, nowIso],
      },
      { sql: "DELETE FROM article_categories WHERE article_id = ? AND tenant_id = ?", params: [id, tenantId] },
      ...links,
    ],
    result: "applied",
  };
}

function articleUnpublish(tenantId: string, d: Json, nowIso: string) {
  const id = cid(tenantId, str(d.source_article_id, "source_article_id", 120));
  return {
    stmts: [{ sql: "UPDATE articles SET status = 'unpublished', updated_at = ? WHERE id = ? AND tenant_id = ?", params: [nowIso, id, tenantId] }],
    result: "applied",
  };
}

async function settingsUpdate(env: Env, tenantId: string, d: Json) {
  const row = await env.db.first<{ brand_json: string }>("SELECT brand_json FROM blogs WHERE tenant_id = ?", [tenantId]);
  const merged = { ...(JSON.parse(row?.brand_json ?? "{}") as Json), ...((d.brand as Json) ?? {}) };
  const stmts: Stmt[] = [{ sql: "UPDATE blogs SET brand_json = ? WHERE tenant_id = ?", params: [JSON.stringify(merged), tenantId] }];
  if (typeof d.language === "string") stmts.push({ sql: "UPDATE blogs SET language = ? WHERE tenant_id = ?", params: [str(d.language, "language", 10), tenantId] });
  if (typeof d.site_url === "string") stmts.push({ sql: "UPDATE blogs SET site_url = ? WHERE tenant_id = ?", params: [str(d.site_url, "site_url", 500), tenantId] });
  return { stmts, result: "applied" };
}

/** Alta/cambio de dominio y estado de verificación/TLS. Activa el blog cuando todo está listo. */
async function domainChange(env: Env, tenantId: string, d: Json, nowIso: string) {
  const hostname = normalizeHost(str(d.hostname, "hostname", 253));
  const verification = d.verification_status === "verified" ? "verified" : "pending";
  const tls = d.tls_status === "ready" ? "ready" : "pending";
  const owner = await env.db.first<{ tenant_id: string }>("SELECT tenant_id FROM domains WHERE hostname = ?", [hostname]);
  if (owner && owner.tenant_id !== tenantId) throw new IngestError(409, "Ese hostname pertenece a otro cliente");
  const ready = verification === "verified" && tls === "ready";
  const status = ready ? "active" : verification === "verified" ? "pending_tls" : "pending_dns";
  const stmts: Stmt[] = [];
  if (d.make_primary === true) stmts.push({ sql: "UPDATE domains SET is_primary = 0 WHERE tenant_id = ?", params: [tenantId] });
  stmts.push({
    sql: `INSERT INTO domains (hostname, tenant_id, verification_status, tls_status, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(hostname) DO UPDATE SET verification_status = excluded.verification_status, tls_status = excluded.tls_status,
          is_primary = CASE WHEN ? THEN 1 ELSE domains.is_primary END`,
    params: [hostname, tenantId, verification, tls, d.make_primary === true ? 1 : 0, nowIso, d.make_primary === true ? 1 : 0],
  });
  stmts.push({ sql: "UPDATE blogs SET status = ? WHERE tenant_id = ? AND status IN ('draft_setup','pending_dns','pending_tls','active')", params: [status, tenantId] });
  return { stmts, result: "applied" };
}
