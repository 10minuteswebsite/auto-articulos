// Acceso a datos del sitio público. REGLA: toda consulta recibe tenantId y lo
// filtra; el tenant sale SIEMPRE del hostname verificado (blueprint §4.3).

import type { Env, TenantCtx, ArticleRow, CategoryRow, Brand } from "./types";
import { normalizeHost } from "./util";

export interface DomainHit {
  ctx: TenantCtx;
  isPrimary: boolean;
  primaryHostname: string;
}

export async function resolveTenant(env: Env, rawHost: string): Promise<DomainHit | null> {
  const hostname = normalizeHost(rawHost);
  const row = await env.db.first<{
    tenant_id: string; subscription_state: string; blog_status: string | null; language: string | null;
    brand_json: string | null; is_primary: number; verification_status: string; tls_status: string;
  }>(
    `SELECT d.tenant_id, t.subscription_state, b.status AS blog_status, b.language, b.brand_json,
            d.is_primary, d.verification_status, d.tls_status
       FROM domains d
       JOIN tenants t ON t.id = d.tenant_id
       LEFT JOIN blogs b ON b.tenant_id = d.tenant_id
      WHERE d.hostname = ?`,
    [hostname],
  );
  if (!row || row.verification_status !== "verified" || row.tls_status !== "ready") return null;

  const primary = await env.db.first<{ hostname: string }>(
    "SELECT hostname FROM domains WHERE tenant_id = ? AND is_primary = 1 AND verification_status = 'verified' AND tls_status = 'ready' LIMIT 1",
    [row.tenant_id],
  );
  const primaryHostname = primary?.hostname ?? hostname;
  let brand: Brand = {};
  try {
    brand = JSON.parse(row.brand_json ?? "{}") as Brand;
  } catch {
    brand = {};
  }
  const origin = env.originFor ? env.originFor(primaryHostname) : `https://${primaryHostname}`;
  return {
    ctx: {
      tenantId: row.tenant_id,
      hostname: primaryHostname,
      baseUrl: origin.replace(/\/$/, ""),
      subscriptionState: row.subscription_state,
      blogStatus: row.blog_status ?? "active",
      language: row.language ?? "es",
      brand,
    },
    isPrimary: primaryHostname === hostname,
    primaryHostname,
  };
}

export const PAGE_SIZE = 9;

export async function listArticles(env: Env, tenantId: string, opts: { categoryId?: string; limit: number; offset: number }): Promise<ArticleRow[]> {
  if (opts.categoryId) {
    return env.db.all<ArticleRow>(
      `SELECT a.* FROM articles a JOIN article_categories ac ON ac.article_id = a.id AND ac.tenant_id = a.tenant_id
        WHERE a.tenant_id = ? AND a.status = 'published' AND ac.category_id = ?
        ORDER BY a.published_at DESC, a.id LIMIT ? OFFSET ?`,
      [tenantId, opts.categoryId, opts.limit, opts.offset],
    );
  }
  return env.db.all<ArticleRow>(
    "SELECT * FROM articles WHERE tenant_id = ? AND status = 'published' ORDER BY published_at DESC, id LIMIT ? OFFSET ?",
    [tenantId, opts.limit, opts.offset],
  );
}

export async function countArticles(env: Env, tenantId: string, categoryId?: string): Promise<number> {
  const row = categoryId
    ? await env.db.first<{ n: number }>(
        `SELECT COUNT(*) AS n FROM articles a JOIN article_categories ac ON ac.article_id = a.id AND ac.tenant_id = a.tenant_id
          WHERE a.tenant_id = ? AND a.status = 'published' AND ac.category_id = ?`,
        [tenantId, categoryId],
      )
    : await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles WHERE tenant_id = ? AND status = 'published'", [tenantId]);
  return row?.n ?? 0;
}

export function getArticleBySlug(env: Env, tenantId: string, slug: string) {
  return env.db.first<ArticleRow>("SELECT * FROM articles WHERE tenant_id = ? AND slug = ? AND status = 'published'", [tenantId, slug]);
}

/** Slug actual del artículo publicado al que apunta una URL anterior (cambio de slug), si existe. */
export async function getRedirectSlug(env: Env, tenantId: string, oldSlug: string): Promise<string | null> {
  const row = await env.db.first<{ slug: string }>(
    `SELECT a.slug FROM slug_redirects r JOIN articles a ON a.id = r.article_id AND a.tenant_id = r.tenant_id
     WHERE r.tenant_id = ? AND r.old_slug = ? AND a.status = 'published'`,
    [tenantId, oldSlug],
  );
  return row?.slug ?? null;
}

export function getCategoryBySlug(env: Env, tenantId: string, slug: string) {
  return env.db.first<CategoryRow>("SELECT * FROM categories WHERE tenant_id = ? AND slug = ? AND status = 'active'", [tenantId, slug]);
}

/** Categorías activas con el número REAL de artículos publicados (solo se muestran las que tienen ≥1). */
export function listCategoriesWithCounts(env: Env, tenantId: string) {
  return env.db.all<CategoryRow & { n: number }>(
    `SELECT c.*, COUNT(a.id) AS n FROM categories c
       LEFT JOIN article_categories ac ON ac.category_id = c.id AND ac.tenant_id = c.tenant_id
       LEFT JOIN articles a ON a.id = ac.article_id AND a.tenant_id = c.tenant_id AND a.status = 'published'
      WHERE c.tenant_id = ? AND c.status = 'active'
      GROUP BY c.id ORDER BY c.sort_order, c.name`,
    [tenantId],
  );
}

export function categoriesOfArticle(env: Env, tenantId: string, articleId: string) {
  return env.db.all<CategoryRow>(
    `SELECT c.* FROM categories c JOIN article_categories ac ON ac.category_id = c.id AND ac.tenant_id = c.tenant_id
      WHERE ac.tenant_id = ? AND ac.article_id = ? AND c.status = 'active' ORDER BY c.sort_order, c.name`,
    [tenantId, articleId],
  );
}

export function relatedArticles(env: Env, tenantId: string, articleId: string, limit = 3) {
  return env.db.all<ArticleRow>(
    `SELECT DISTINCT a.* FROM articles a JOIN article_categories ac ON ac.article_id = a.id AND ac.tenant_id = a.tenant_id
      WHERE a.tenant_id = ? AND a.status = 'published' AND a.id != ?
        AND ac.category_id IN (SELECT category_id FROM article_categories WHERE tenant_id = ? AND article_id = ?)
      ORDER BY a.published_at DESC LIMIT ?`,
    [tenantId, articleId, tenantId, articleId, limit],
  );
}

export function searchArticles(env: Env, tenantId: string, q: string, limit = 20) {
  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  return env.db.all<ArticleRow>(
    `SELECT * FROM articles WHERE tenant_id = ? AND status = 'published'
        AND (title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\')
      ORDER BY published_at DESC LIMIT ?`,
    [tenantId, like, like, limit],
  );
}

export function sitemapArticles(env: Env, tenantId: string) {
  return env.db.all<{ slug: string; updated_at: string }>(
    "SELECT slug, updated_at FROM articles WHERE tenant_id = ? AND status = 'published' ORDER BY published_at DESC LIMIT 50000",
    [tenantId],
  );
}
