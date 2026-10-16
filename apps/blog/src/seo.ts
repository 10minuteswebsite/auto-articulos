// Sitemaps y robots.txt por tenant (blueprint §9.1). Solo URLs canónicas del tenant resuelto.
import type { TenantCtx } from "./types";
import { esc } from "./util";

const XML = '<?xml version="1.0" encoding="UTF-8"?>\n';

export function sitemapIndex(ctx: TenantCtx, lastmod: string | null): string {
  const lm = lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : "";
  return `${XML}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>${esc(ctx.baseUrl)}/sitemap-articles.xml</loc>${lm}</sitemap>
<sitemap><loc>${esc(ctx.baseUrl)}/sitemap-categories.xml</loc></sitemap>
</sitemapindex>`;
}

export function sitemapArticlesXml(ctx: TenantCtx, rows: { slug: string; updated_at: string }[]): string {
  const urls = rows.map((r) => `<url><loc>${esc(ctx.baseUrl)}/${esc(r.slug)}/</loc><lastmod>${esc(r.updated_at.slice(0, 10))}</lastmod></url>`).join("\n");
  return `${XML}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${esc(ctx.baseUrl)}/</loc></url>\n${urls}\n</urlset>`;
}

export function sitemapCategoriesXml(ctx: TenantCtx, slugs: string[]): string {
  const urls = slugs.map((s) => `<url><loc>${esc(ctx.baseUrl)}/categoria/${esc(s)}/</loc></url>`).join("\n");
  return `${XML}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export function robotsTxt(ctx: TenantCtx): string {
  return `User-agent: *\nAllow: /\nDisallow: /buscar/\nDisallow: /api/\n\nSitemap: ${ctx.baseUrl}/sitemap.xml\n`;
}
