// Utilidades puras compartidas.

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Rutas fijas del sitio: ningún slug de artículo o categoría puede usarlas. */
export const RESERVED_SLUGS = new Set([
  "categoria", "buscar", "page", "sitemap", "sitemap-articles", "robots", "api", "assets", "feed", "favicon", "media",
]);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length <= 120 && !RESERVED_SLUGS.has(slug);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Hostname normalizado: minúsculas, sin puerto ni punto final. */
export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function formatDate(iso: string, language = "es"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(language, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(d);
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}
