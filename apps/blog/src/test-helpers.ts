// Ayudas compartidas por pruebas y por el seed local: envían eventos FIRMADOS
// por el mismo camino que usará SEO Total (nada se inserta "por la puerta de atrás").
import { handle } from "./app";
import { signBody } from "./ingest";
import { sqliteAdapter } from "./node/sqlite-adapter";
import type { Env } from "./types";

export const SECRET = "test-secret";
export const API = "api.blog.test";

export function makeEnv(extra: Partial<Env> = {}): Env & { db: ReturnType<typeof sqliteAdapter> } {
  return { db: sqliteAdapter(), ingestSecret: SECRET, apiHost: API, ...extra } as Env & { db: ReturnType<typeof sqliteAdapter> };
}

let counter = 0;
export async function send(env: Env, tenantId: string, type: string, data: Record<string, unknown>, eventId?: string) {
  const body = JSON.stringify({ event_id: eventId ?? `evt-${++counter}-${Math.random().toString(36).slice(2)}`, type, tenant_id: tenantId, data });
  const ts = String(Math.floor((env.now?.() ?? new Date()).getTime() / 1000));
  const res = await handle(
    env,
    new Request(`https://${API}/api/ingest`, {
      method: "POST",
      headers: { host: API, "x-blogia-timestamp": ts, "x-blogia-signature": await signBody(env.ingestSecret, ts, body), "content-type": "application/json" },
      body,
    }),
  );
  return { status: res.status, json: (await res.json()) as { ok: boolean; result?: string; error?: string } };
}

export function get(env: Env, host: string, path: string, init: RequestInit = {}) {
  return handle(env, new Request(`https://${host}${path}`, { ...init, headers: { host, ...(init.headers as object) } }));
}

/** Crea un tenant listo para servir (dominio verificado y con TLS). */
export async function provisionTenant(env: Env, tenantId: string, hostname: string, brand: Record<string, unknown> = {}) {
  const r1 = await send(env, tenantId, "blog.provision", { seo_total_account_id: `acc-${tenantId}`, hostname, site_url: `https://${hostname.replace(/^blog\./, "")}`, language: "es", brand });
  if (r1.status !== 200) throw new Error(`provision: ${JSON.stringify(r1)}`);
  const r2 = await send(env, tenantId, "blog.domain.change", { hostname, verification_status: "verified", tls_status: "ready", make_primary: true });
  if (r2.status !== 200) throw new Error(`domain: ${JSON.stringify(r2)}`);
}

export function articleData(n: number, over: Record<string, unknown> = {}) {
  return {
    source_article_id: `a${n}`, slug: `articulo-${n}`, title: `Artículo número ${n}`, excerpt: `Resumen del artículo ${n}`,
    body_html: `<p>Introducción ${n}.</p><h2>Primera parte</h2><p>Texto.</p><h2>Segunda parte</h2><p>Texto.</p><h2>Tercera parte</h2><p>Texto.</p>`,
    cover_image_url: `https://images.example.com/${n}.jpg`, author: "Equipo Editorial", revision: 1,
    published_at: new Date(Date.UTC(2026, 0, 1 + n)).toISOString(), category_ids: [] as string[], ...over,
  };
}
