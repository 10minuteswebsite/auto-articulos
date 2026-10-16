// Plantilla única: blanca, editorial, responsive (blueprint §8). Sin JavaScript
// de terceros ni fuentes externas; menú móvil con <details>.

import type { TenantCtx } from "../types";
import { esc } from "../util";
import { t } from "./i18n";

export interface PageMeta {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  ogType?: "website" | "article";
  ogImage?: string | null;
  jsonLd?: unknown[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Oscurece el acento hasta lograr contraste WCAG AA (≥4.5) contra blanco. */
export function accessibleAccent(color: string | undefined): string {
  let c = color && HEX.test(color) ? color : "#1a56db";
  for (let i = 0; i < 20 && contrast(c) < 4.5; i++) c = darken(c);
  return c;
}
function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (hex: string) => 1.05 / (lum(hex) + 0.05);
function darken(hex: string): string {
  const n = [1, 3, 5].map((i) => Math.max(0, Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.9)));
  return "#" + n.map((v) => v.toString(16).padStart(2, "0")).join("");
}

const CSS = `
:root{--accent:#1a56db;--ink:#111827;--muted:#5b6472;--line:#e5e7eb;--soft:#f7f8fa;--r:14px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:#fff;color:var(--ink);font:400 clamp(16px,1.1vw + 12px,18px)/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px}a:hover{text-decoration-thickness:2px}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:4px}
img{max-width:100%;height:auto;display:block}
.skip{position:absolute;left:-999px;top:0;background:#fff;padding:8px 12px;z-index:10}.skip:focus{left:8px;top:8px}
.wrap{max-width:1200px;margin:0 auto;padding:0 clamp(16px,4vw,32px)}
header.site{border-bottom:1px solid var(--line);background:#fff;position:sticky;top:0;z-index:5}
.bar{display:flex;align-items:center;gap:16px;min-height:64px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;color:var(--ink);text-decoration:none;font-size:1.1rem}
.brand img{max-height:36px;width:auto}
nav.main{margin-left:auto;display:flex;gap:20px;align-items:center}
nav.main a{color:var(--ink);text-decoration:none;font-size:.95rem}nav.main a:hover{color:var(--accent)}
.searchform{display:flex;gap:8px}
.searchform input{font:inherit;font-size:.95rem;padding:9px 12px;border:1px solid var(--line);border-radius:10px;min-width:0;width:100%}
.searchform button,.btn{font:inherit;font-size:.95rem;padding:9px 16px;border-radius:10px;border:1px solid var(--accent);background:var(--accent);color:#fff;text-decoration:none;cursor:pointer;display:inline-block}
details.menu{display:none;margin-left:auto}details.menu summary{list-style:none;cursor:pointer;padding:10px 12px;border:1px solid var(--line);border-radius:10px}
details.menu summary::-webkit-details-marker{display:none}
details.menu .panel{position:absolute;left:0;right:0;top:64px;background:#fff;border-bottom:1px solid var(--line);padding:16px clamp(16px,4vw,32px);display:grid;gap:12px}
details.menu .panel a{color:var(--ink);text-decoration:none;padding:6px 0}
main{padding:clamp(24px,4vw,48px) 0}
.hero{padding:clamp(8px,2vw,24px) 0 clamp(16px,3vw,32px);max-width:760px}
.hero h1,h1{font-size:clamp(1.9rem,3.2vw + 1rem,3rem);line-height:1.15;margin:0 0 12px;letter-spacing:-.02em}
.hero p{color:var(--muted);margin:0 0 20px;font-size:1.1rem}
.featured{display:grid;grid-template-columns:1.4fr 1fr;gap:clamp(16px,3vw,40px);align-items:center;margin-bottom:clamp(32px,5vw,56px)}
.featured .img,.card .img{aspect-ratio:16/9;background:var(--soft);border-radius:var(--r);overflow:hidden}
.featured .img img,.card .img img{width:100%;height:100%;object-fit:cover}
.featured h2{font-size:clamp(1.5rem,2vw + 1rem,2.2rem);line-height:1.2;margin:8px 0 12px}
.featured h2 a,.card h3 a{color:var(--ink);text-decoration:none}.featured h2 a:hover,.card h3 a:hover{color:var(--accent)}
.tag{font-size:.8rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);text-decoration:none}
.meta{color:var(--muted);font-size:.875rem}
h2.section{font-size:1.4rem;margin:0 0 20px}
.cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;margin-bottom:clamp(32px,5vw,56px)}
.catcard{border:1px solid var(--line);border-radius:var(--r);padding:18px;text-decoration:none;color:var(--ink);display:block}
.catcard:hover{border-color:var(--accent)}.catcard strong{display:block}.catcard span{color:var(--muted);font-size:.875rem}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2.4vw,32px)}
.card{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:#fff;display:flex;flex-direction:column}
.card .body{padding:16px 18px 20px;display:flex;flex-direction:column;gap:6px}
.card h3{font-size:1.15rem;line-height:1.3;margin:2px 0}.card p{margin:0;color:var(--muted);font-size:.95rem}
.pager{display:flex;gap:12px;justify-content:center;align-items:center;margin-top:36px;flex-wrap:wrap}
.pager a,.pager span{padding:8px 14px;border:1px solid var(--line);border-radius:10px;text-decoration:none;color:var(--ink)}
.pager .cur{background:var(--ink);color:#fff;border-color:var(--ink)}
.crumbs{font-size:.875rem;color:var(--muted);margin-bottom:16px}.crumbs a{color:var(--muted)}
.layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,740px) minmax(0,1fr);gap:32px}
.layout>article{grid-column:2}.aside{grid-column:3;position:sticky;top:88px;align-self:start;font-size:.9rem}
.toc{grid-column:1;position:sticky;top:88px;align-self:start;font-size:.9rem;justify-self:end;max-width:240px}
.toc ol{padding-left:18px;margin:6px 0}.toc a{color:var(--muted);text-decoration:none}.toc a:hover{color:var(--accent)}
.cover{aspect-ratio:16/9;border-radius:var(--r);overflow:hidden;margin:20px 0;background:var(--soft)}.cover img{width:100%;height:100%;object-fit:cover}
.prose h2{font-size:1.6rem;line-height:1.25;margin:2em 0 .5em}.prose h3{font-size:1.25rem;margin:1.6em 0 .4em}
.prose p,.prose ul,.prose ol{margin:0 0 1.1em}.prose img{border-radius:10px;margin:1.2em 0}
.prose table{border-collapse:collapse;width:100%;display:block;overflow-x:auto;margin:1.2em 0}.prose th,.prose td{border:1px solid var(--line);padding:8px 10px;text-align:left}
.prose blockquote{border-left:3px solid var(--accent);margin:1.2em 0;padding:.2em 1em;color:var(--muted)}
.share{display:flex;gap:12px;flex-wrap:wrap;margin:28px 0;font-size:.9rem}
.wa{border:1px solid var(--line);border-radius:var(--r);padding:16px}.wa strong{display:block;margin-bottom:6px}
.wa-mobile{display:none}
.related{margin-top:48px}
.state{text-align:center;padding:clamp(48px,10vw,120px) 0;max-width:620px;margin:0 auto}
footer.site{border-top:1px solid var(--line);background:var(--soft);padding:40px 0;margin-top:48px;font-size:.92rem}
.fcols{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:28px}
.fcols h4{margin:0 0 8px;font-size:.95rem}.fcols a{display:block;color:var(--muted);text-decoration:none;padding:3px 0}.fcols a:hover{color:var(--accent)}
.empty{color:var(--muted);padding:32px 0}
@media (max-width:1100px){.layout{grid-template-columns:minmax(0,1fr)}.layout>article,.aside,.toc{grid-column:1;position:static;max-width:none;justify-self:stretch}.toc{order:-1}.aside .wa{display:none}}
@media (max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}.featured{grid-template-columns:1fr}}
@media (max-width:760px){nav.main,.bar>.searchform{display:none}details.menu{display:block}.grid{grid-template-columns:1fr}
.wa-mobile{display:block;position:fixed;right:16px;bottom:16px;z-index:6}.wa-mobile a{box-shadow:0 4px 14px rgba(0,0,0,.18)}}
@media (prefers-reduced-motion:no-preference){a,.catcard{transition:color .15s,border-color .15s}}
`;

function ld(obj: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
}

export function layout(ctx: TenantCtx, meta: PageMeta, content: string, opts: { articleWhatsapp?: boolean } = {}): string {
  const s = t(ctx.language);
  const b = ctx.brand;
  const name = b.name || ctx.hostname;
  const accent = accessibleAccent(b.accentColor);
  const nav = (b.nav ?? []).filter((n) => n.label && n.href);
  const wa = (b.whatsapp ?? "").replace(/\D/g, "");
  const waHref = /^\d{8,15}$/.test(wa) ? `https://wa.me/${wa}` : "";

  const navLinks = nav.map((n) => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join("");
  const searchForm = `<form class="searchform" role="search" action="/buscar/" method="get"><label class="sr" for="q" style="position:absolute;left:-999px">${esc(s.search)}</label><input id="q" type="search" name="q" placeholder="${esc(s.searchPlaceholder)}" maxlength="80" required><button type="submit">${esc(s.search)}</button></form>`;
  const brand = `<a class="brand" href="/">${b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="" height="36">` : ""}<span>${esc(name)}</span></a>`;

  const footerCols = (b.footer ?? [])
    .map((c) => `<div>${c.title ? `<h4>${esc(c.title)}</h4>` : ""}${c.links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join("")}</div>`)
    .join("");

  const robots = meta.noindex ? "noindex,follow" : "index,follow,max-image-preview:large";
  const head = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<title>${esc(meta.title)}</title>`,
    meta.description ? `<meta name="description" content="${esc(meta.description)}">` : "",
    `<meta name="robots" content="${robots}">`,
    meta.canonical ? `<link rel="canonical" href="${esc(meta.canonical)}">` : "",
    `<meta property="og:site_name" content="${esc(name)}">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    meta.description ? `<meta property="og:description" content="${esc(meta.description)}">` : "",
    meta.canonical ? `<meta property="og:url" content="${esc(meta.canonical)}">` : "",
    `<meta property="og:type" content="${meta.ogType ?? "website"}">`,
    meta.ogImage ? `<meta property="og:image" content="${esc(meta.ogImage)}"><meta name="twitter:card" content="summary_large_image">` : `<meta name="twitter:card" content="summary">`,
    `<style>${CSS}:root{--accent:${accent}}</style>`,
    ...(meta.jsonLd ?? []).map(ld),
  ].filter(Boolean).join("\n");

  return `<!doctype html>
<html lang="${esc(ctx.language)}">
<head>
${head}
</head>
<body>
<a class="skip" href="#contenido">${esc(s.skip)}</a>
<header class="site"><div class="wrap bar">${brand}
<nav class="main" aria-label="${esc(s.menu)}">${navLinks}</nav>${searchForm}
<details class="menu"><summary aria-label="${esc(s.menu)}">☰ ${esc(s.menu)}</summary><div class="panel">${navLinks}${searchForm}</div></details>
</div></header>
<main id="contenido"><div class="wrap">${content}</div></main>
${waHref && opts.articleWhatsapp ? `<div class="wa-mobile"><a class="btn" href="${esc(waHref)}" rel="noopener">${esc(s.whatsapp)}</a></div>` : ""}
<footer class="site"><div class="wrap"><div class="fcols"><div><strong>${esc(name)}</strong>${b.tagline ? `<p>${esc(b.tagline)}</p>` : ""}${b.mainSiteUrl ? `<a href="${esc(b.mainSiteUrl)}">${esc(s.mainSite)}</a>` : ""}</div>${footerCols}</div></div></footer>
</body>
</html>`;
}

export { ld };
