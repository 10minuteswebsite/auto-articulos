// Enrutador principal. Funciona con Request/Response estándar: el mismo código
// corre en un Cloudflare Worker y en el servidor local (node/server.ts).
//
// Orden de decisiones (blueprint §4.3, §10, §7):
//  1. Hostname de la API → /api/ingest y /api/health, nada más.
//  2. Cualquier otro hostname → se resuelve el tenant SOLO por hostname verificado.
//  3. Hostname antiguo (no primario) → 301 al primario, misma ruta.
//  4. Suscripción suspendida → página de marca con HTTP 503 sin caché.
//  5. Rutas públicas GET/HEAD.

import type { Env, TenantCtx } from "./types";
import { handleIngest } from "./ingest";
import {
  resolveTenant, listArticles, countArticles, getArticleBySlug, getCategoryBySlug, listCategoriesWithCounts,
  categoriesOfArticle, relatedArticles, searchArticles, sitemapArticles, PAGE_SIZE,
} from "./repo";
import { homePage, categoryPage, articlePage, searchPage, notFoundPage, suspendedPage } from "./render/pages";
import { sitemapIndex, sitemapArticlesXml, sitemapCategoriesXml, robotsTxt } from "./seo";
import { normalizeHost, RESERVED_SLUGS } from "./util";

const CACHE_PUBLIC = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

function html(body: string, status = 200, cache = CACHE_PUBLIC, req?: Request): Response {
  return new Response(req?.method === "HEAD" ? null : body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache, "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" },
  });
}
function xml(body: string, req: Request, type = "application/xml"): Response {
  return new Response(req.method === "HEAD" ? null : body, { status: 200, headers: { "content-type": `${type}; charset=utf-8`, "cache-control": CACHE_PUBLIC } });
}
const redirect = (location: string) => new Response(null, { status: 301, headers: { location, "cache-control": "public, max-age=3600" } });
const plain404 = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export async function handle(env: Env, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const host = normalizeHost(req.headers.get("host") ?? url.host);

  if (host === normalizeHost(env.apiHost)) {
    if (url.pathname === "/api/ingest") return handleIngest(env, req);
    if (url.pathname === "/api/health") return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
    return plain404();
  }

  // Un hostname que no es de ningún cliente verificado no revela nada: 404 neutro.
  const hit = await resolveTenant(env, host);
  if (!hit) return plain404();
  const { ctx } = hit;

  if (!hit.isPrimary) {
    return redirect(`${ctx.baseUrl}${url.pathname}${url.search}`);
  }

  if (ctx.subscriptionState === "suspended") {
    // Sin Retry-After: no hay expectativa temporal verificable (blueprint §10.2).
    return html(suspendedPage(ctx), 503, "no-store", req);
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }
  return route(env, ctx, url, req);
}

function parsePage(raw: string | undefined): number | null {
  if (raw === undefined) return 1;
  if (!/^[1-9]\d{0,5}$/.test(raw)) return null;
  return Number(raw);
}

async function route(env: Env, ctx: TenantCtx, url: URL, req: Request): Promise<Response> {
  const path = url.pathname;
  const notFound = () => html(notFoundPage(ctx), 404, "public, max-age=60", req);

  // Ficheros especiales (sin barra final).
  if (path === "/robots.txt") return xml(robotsTxt(ctx), req, "text/plain");
  if (path === "/sitemap.xml") {
    const last = await env.db.first<{ m: string | null }>("SELECT MAX(updated_at) AS m FROM articles WHERE tenant_id = ? AND status = 'published'", [ctx.tenantId]);
    return xml(sitemapIndex(ctx, last?.m ? last.m.slice(0, 10) : null), req);
  }
  if (path === "/sitemap-articles.xml") return xml(sitemapArticlesXml(ctx, await sitemapArticles(env, ctx.tenantId)), req);
  if (path === "/sitemap-categories.xml") {
    const cats = (await listCategoriesWithCounts(env, ctx.tenantId)).filter((c) => c.n > 0).map((c) => c.slug);
    return xml(sitemapCategoriesXml(ctx, cats), req);
  }

  // URL canónica: siempre con barra final (301).
  if (!path.endsWith("/")) return redirect(`${ctx.baseUrl}${path}/${url.search}`);

  const segs = path.split("/").filter(Boolean);

  if (segs.length === 0) return homeRoute(env, ctx, 1, req);
  if (segs[0] === "page" && segs.length === 2) {
    const n = parsePage(segs[1]);
    if (n === null) return notFound();
    if (n === 1) return redirect(`${ctx.baseUrl}/`);
    return homeRoute(env, ctx, n, req);
  }
  if (segs[0] === "buscar" && segs.length === 1) {
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
    const results = q ? await searchArticles(env, ctx.tenantId, q) : [];
    const res = html(searchPage(ctx, q, results), 200, "public, max-age=30", req);
    res.headers.set("x-robots-tag", "noindex");
    return res;
  }
  if (segs[0] === "categoria" && segs.length >= 2) {
    const slug = segs[1];
    const cat = await getCategoryBySlug(env, ctx.tenantId, slug);
    if (!cat) return notFound();
    let page = 1;
    if (segs.length === 4 && segs[2] === "page") {
      const n = parsePage(segs[3]);
      if (n === null) return notFound();
      if (n === 1) return redirect(`${ctx.baseUrl}/categoria/${slug}/`);
      page = n;
    } else if (segs.length !== 2) return notFound();
    const total = await countArticles(env, ctx.tenantId, cat.id);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > pages) return notFound();
    const articles = await listArticles(env, ctx.tenantId, { categoryId: cat.id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    return html(categoryPage(ctx, { category: cat, articles, page, pages, total }), 200, CACHE_PUBLIC, req);
  }

  if (segs.length === 1 && !RESERVED_SLUGS.has(segs[0]) && /^[a-z0-9-]+$/.test(segs[0])) {
    const article = await getArticleBySlug(env, ctx.tenantId, segs[0]);
    if (!article) return notFound();
    const [cats, related] = await Promise.all([
      categoriesOfArticle(env, ctx.tenantId, article.id),
      relatedArticles(env, ctx.tenantId, article.id),
    ]);
    return html(articlePage(ctx, { article, cats, related }), 200, CACHE_PUBLIC, req);
  }
  return notFound();
}

async function homeRoute(env: Env, ctx: TenantCtx, page: number, req: Request): Promise<Response> {
  const total = await countArticles(env, ctx.tenantId);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) return html(notFoundPage(ctx), 404, "public, max-age=60", req);
  const [articles, cats] = await Promise.all([
    listArticles(env, ctx.tenantId, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    listCategoriesWithCounts(env, ctx.tenantId),
  ]);
  return html(homePage(ctx, { articles, cats, page, pages, total }), 200, CACHE_PUBLIC, req);
}
