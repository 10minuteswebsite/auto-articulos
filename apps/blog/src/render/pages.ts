// Vistas públicas: portada, categoría, artículo, búsqueda y estados (blueprint §8.5–8.9).

import type { TenantCtx, ArticleRow, CategoryRow } from "../types";
import { esc, formatDate, truncate, stripTags } from "../util";
import { layout, type PageMeta } from "./layout";
import { t } from "./i18n";
import { qrSvg } from "../qr";

const abs = (ctx: TenantCtx, path: string) => ctx.baseUrl + path;

function card(ctx: TenantCtx, a: ArticleRow): string {
  return `<article class="card">
${a.cover_image_url ? `<a class="img" href="/${esc(a.slug)}/" tabindex="-1" aria-hidden="true"><img src="${esc(a.cover_image_url)}" alt="" loading="lazy" width="640" height="360"></a>` : `<div class="img"></div>`}
<div class="body"><h3><a href="/${esc(a.slug)}/">${esc(a.title)}</a></h3><p>${esc(truncate(a.excerpt, 140))}</p>
<span class="meta"><time datetime="${esc(a.published_at)}">${esc(formatDate(a.published_at, ctx.language))}</time></span></div></article>`;
}

function pager(ctx: TenantCtx, basePath: string, page: number, pages: number): string {
  if (pages <= 1) return "";
  const s = t(ctx.language);
  const href = (n: number) => (n === 1 ? basePath : `${basePath}page/${n}/`);
  const items: string[] = [];
  if (page > 1) items.push(`<a rel="prev" href="${href(page - 1)}">‹ ${esc(s.prev)}</a>`);
  for (let n = 1; n <= pages; n++) {
    if (pages > 9 && n !== 1 && n !== pages && Math.abs(n - page) > 2) continue;
    items.push(n === page ? `<span class="cur" aria-current="page">${n}</span>` : `<a href="${href(n)}">${n}</a>`);
  }
  if (page < pages) items.push(`<a rel="next" href="${href(page + 1)}">${esc(s.next)} ›</a>`);
  return `<nav class="pager" aria-label="${esc(s.pageNav)}">${items.join("")}</nav>`;
}

function breadcrumbLd(items: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: url })),
  };
}

export function homePage(
  ctx: TenantCtx,
  p: { articles: ArticleRow[]; cats: (CategoryRow & { n: number })[]; page: number; pages: number; total: number },
) {
  const s = t(ctx.language);
  const name = ctx.brand.name || ctx.hostname;
  const heroTitle = ctx.brand.tagline || s.defaultHero;
  const first = p.page === 1 ? p.articles[0] : undefined;
  const rest = first ? p.articles.slice(1) : p.articles;
  const shownCats = p.cats.filter((c) => c.n > 0); // solo categorías con artículos reales

  const featured = first
    ? `<section class="featured" aria-label="${esc(s.featured)}">
${first.cover_image_url ? `<a class="img" href="/${esc(first.slug)}/" tabindex="-1" aria-hidden="true"><img src="${esc(first.cover_image_url)}" alt="" width="960" height="540"></a>` : `<div class="img"></div>`}
<div><span class="tag">${esc(s.featured)}</span><h2><a href="/${esc(first.slug)}/">${esc(first.title)}</a></h2><p>${esc(truncate(first.excerpt, 200))}</p>
<a class="btn" href="/${esc(first.slug)}/">${esc(s.readMore)}</a></div></section>`
    : "";

  const cats =
    p.page === 1 && shownCats.length
      ? `<section aria-label="${esc(s.categories)}"><h2 class="section">${esc(s.categories)}</h2><div class="cats">${shownCats
          .map(
            (c) =>
              `<a class="catcard" href="/categoria/${esc(c.slug)}/"><strong>${esc(c.name)}</strong><span>${c.n} ${esc(c.n === 1 ? s.article : s.articles)}</span></a>`,
          )
          .join("")}</div></section>`
      : "";

  const body = `<section class="hero"><h1>${esc(heroTitle)}</h1><p>${esc(s.defaultHeroText)}</p></section>
${
  p.total === 0
    ? `<p class="empty">${esc(s.noArticles)}</p>`
    : `${featured}${cats}<section><h2 class="section">${esc(s.recent)}</h2><div class="grid">${rest.map((a) => card(ctx, a)).join("")}</div>${pager(ctx, "/", p.page, p.pages)}</section>`
}`;

  const meta: PageMeta = {
    title: p.page === 1 ? `${heroTitle} | ${name}` : `${s.page} ${p.page} | ${name}`,
    description: s.defaultHeroText,
    canonical: abs(ctx, p.page === 1 ? "/" : `/page/${p.page}/`),
    noindex: p.total === 0,
    jsonLd: [{ "@context": "https://schema.org", "@type": "Blog", name, url: abs(ctx, "/"), inLanguage: ctx.language }],
  };
  return layout(ctx, meta, body);
}

export function categoryPage(
  ctx: TenantCtx,
  p: { category: CategoryRow; articles: ArticleRow[]; page: number; pages: number; total: number },
) {
  const s = t(ctx.language);
  const name = ctx.brand.name || ctx.hostname;
  const base = `/categoria/${p.category.slug}/`;
  const body = `<nav class="crumbs" aria-label="${esc(s.breadcrumb)}"><a href="/">${esc(s.home)}</a> › <span>${esc(p.category.name)}</span></nav>
<section class="hero"><h1>${esc(p.category.name)}</h1>${p.category.description ? `<p>${esc(p.category.description)}</p>` : ""}</section>
${
  p.total === 0
    ? `<p class="empty">${esc(s.noArticles)}</p>`
    : `<div class="grid">${p.articles.map((a) => card(ctx, a)).join("")}</div>${pager(ctx, base, p.page, p.pages)}`
}`;
  const canonical = abs(ctx, p.page === 1 ? base : `${base}page/${p.page}/`);
  const meta: PageMeta = {
    title: `${p.category.name}${p.page > 1 ? ` — ${s.page} ${p.page}` : ""} | ${name}`,
    description: p.category.description || undefined,
    canonical,
    noindex: p.total === 0, // categorías vacías no se indexan (blueprint §7)
    jsonLd: [
      { "@context": "https://schema.org", "@type": "CollectionPage", name: p.category.name, url: canonical, inLanguage: ctx.language },
      breadcrumbLd([[s.home, abs(ctx, "/")], [p.category.name, abs(ctx, base)]]),
    ],
  };
  return layout(ctx, meta, body);
}

/** Añade id a los h2/h3 que no lo tengan y devuelve el índice de contenidos (solo h2). */
export function withHeadingIds(html: string): { html: string; toc: { id: string; text: string }[] } {
  const toc: { id: string; text: string }[] = [];
  const used = new Set<string>();
  const out = html.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, (_m, tag: string, attrs: string, inner: string) => {
    const text = stripTags(inner);
    const existing = /\sid="([^"]+)"/.exec(attrs)?.[1];
    const base =
      existing ||
      text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      "seccion";
    let id = base;
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    if (tag.toLowerCase() === "h2") toc.push({ id, text });
    return `<${tag}${existing ? attrs : `${attrs} id="${id}"`}>${inner}</${tag}>`;
  });
  return { html: out, toc };
}

export function articlePage(ctx: TenantCtx, p: { article: ArticleRow; cats: CategoryRow[]; related: ArticleRow[] }) {
  const s = t(ctx.language);
  const a = p.article;
  const name = ctx.brand.name || ctx.hostname;
  const url = abs(ctx, `/${a.slug}/`);
  const { html, toc } = withHeadingIds(a.body_html);
  const wa = (ctx.brand.whatsapp ?? "").replace(/\D/g, "");
  const waHref = /^\d{8,15}$/.test(wa) ? `https://wa.me/${wa}` : ""; // sin número válido, el módulo se oculta
  const cat = p.cats[0];
  const updated = a.updated_at && a.updated_at.slice(0, 10) !== a.published_at.slice(0, 10) ? a.updated_at : null;
  const enc = encodeURIComponent;

  const crumbItems: [string, string][] = [[s.home, abs(ctx, "/")]];
  if (cat) crumbItems.push([cat.name, abs(ctx, `/categoria/${cat.slug}/`)]);
  crumbItems.push([a.title, url]);

  const body = `<nav class="crumbs" aria-label="${esc(s.breadcrumb)}"><a href="/">${esc(s.home)}</a>${cat ? ` › <a href="/categoria/${esc(cat.slug)}/">${esc(cat.name)}</a>` : ""} › <span>${esc(a.title)}</span></nav>
<div class="layout">
${toc.length >= 3 ? `<nav class="toc" aria-label="${esc(s.contents)}"><strong>${esc(s.contents)}</strong><ol>${toc.map((x) => `<li><a href="#${esc(x.id)}">${esc(x.text)}</a></li>`).join("")}</ol></nav>` : ""}
<article>
${cat ? `<a class="tag" href="/categoria/${esc(cat.slug)}/">${esc(cat.name)}</a>` : ""}
<h1>${esc(a.title)}</h1>
<p class="meta">${a.author ? `${esc(s.by)} ${esc(a.author)} · ` : ""}<time datetime="${esc(a.published_at)}">${esc(s.published)} ${esc(formatDate(a.published_at, ctx.language))}</time>${updated ? ` · <time datetime="${esc(updated)}">${esc(s.updated)} ${esc(formatDate(updated, ctx.language))}</time>` : ""}</p>
${a.cover_image_url ? `<div class="cover"><img src="${esc(a.cover_image_url)}" alt="${esc(a.cover_alt || a.title)}" width="1200" height="675"></div>` : ""}
<div class="prose">${html}</div>
<div class="share"><strong>${esc(s.share)}:</strong>
<a href="https://wa.me/?text=${enc(a.title + " " + url)}" rel="noopener">WhatsApp</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}" rel="noopener">Facebook</a>
<a href="https://twitter.com/intent/tweet?url=${enc(url)}&amp;text=${enc(a.title)}" rel="noopener">X</a>
<a href="https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}" rel="noopener">LinkedIn</a></div>
</article>
<aside class="aside">${waHref ? `<div class="wa"><strong>${esc(s.needHelp)}</strong><span>${esc(s.whatsappHint)}</span><div class="qr">${qrSvg(waHref, s.scanWhatsapp)}<small>${esc(s.scanWhatsapp)}</small></div><p><a class="btn" href="${esc(waHref)}" rel="noopener">${esc(s.whatsapp)}</a></p></div>` : ""}</aside>
</div>
${p.related.length ? `<section class="related"><h2 class="section">${esc(s.related)}</h2><div class="grid">${p.related.map((r) => card(ctx, r)).join("")}</div></section>` : ""}`;

  const meta: PageMeta = {
    title: `${a.seo_title || a.title} | ${name}`,
    description: a.meta_description || truncate(a.excerpt || stripTags(a.body_html), 155),
    canonical: url,
    ogType: "article",
    ogImage: a.cover_image_url,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: a.title,
        url,
        mainEntityOfPage: url,
        datePublished: a.published_at,
        dateModified: a.updated_at || a.published_at,
        inLanguage: a.language,
        ...(a.cover_image_url ? { image: [a.cover_image_url] } : {}),
        ...(a.author ? { author: { "@type": "Person", name: a.author } } : {}),
        publisher: { "@type": "Organization", name, ...(ctx.brand.logoUrl ? { logo: { "@type": "ImageObject", url: ctx.brand.logoUrl } } : {}) },
      },
      breadcrumbLd(crumbItems),
    ],
  };
  return layout(ctx, meta, body, { articleWhatsapp: true });
}

export function searchPage(ctx: TenantCtx, q: string, results: ArticleRow[]) {
  const s = t(ctx.language);
  const name = ctx.brand.name || ctx.hostname;
  const body = `<nav class="crumbs" aria-label="${esc(s.breadcrumb)}"><a href="/">${esc(s.home)}</a> › <span>${esc(s.search)}</span></nav>
<section class="hero"><h1>${q ? `${esc(s.results)} “${esc(q)}”` : esc(s.search)}</h1></section>
${q && results.length === 0 ? `<p class="empty">${esc(s.noResults)}</p>` : `<div class="grid">${results.map((a) => card(ctx, a)).join("")}</div>`}`;
  // Las búsquedas internas nunca se indexan (blueprint §7).
  return layout(ctx, { title: `${s.search} | ${name}`, canonical: abs(ctx, "/buscar/"), noindex: true }, body);
}

export function notFoundPage(ctx: TenantCtx) {
  const s = t(ctx.language);
  const name = ctx.brand.name || ctx.hostname;
  return layout(
    ctx,
    { title: `${s.notFound} | ${name}`, noindex: true },
    `<section class="state"><h1>404</h1><p>${esc(s.notFoundText)}</p><p><a class="btn" href="/">${esc(s.backHome)}</a></p></section>`,
  );
}

export function suspendedPage(ctx: TenantCtx) {
  const s = t(ctx.language);
  const name = ctx.brand.name || ctx.hostname;
  // Conserva la identidad de marca pero sin menú ni datos de cuenta (blueprint §10.2).
  const bare: TenantCtx = { ...ctx, brand: { name: ctx.brand.name, logoUrl: ctx.brand.logoUrl, accentColor: ctx.brand.accentColor } };
  return layout(
    bare,
    { title: `${s.suspended} | ${name}`, noindex: true },
    `<section class="state"><h1>${esc(s.suspended)}</h1><p>${esc(s.suspendedText)}</p></section>`,
  );
}
