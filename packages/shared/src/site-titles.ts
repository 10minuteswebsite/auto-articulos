// Títulos de los artículos que ya tiene un sitio, leídos de su sitemap.
//
// Pedido de Milton (29/10/2026): la guardia anti-canibalización ya no debe
// depender de navegar 10minutesWebsite. Los títulos se guardan en Supabase
// (SiteArticleTitle) y se llenan UNA vez desde el sitemap del sitio. Si el
// sitio no tiene sitemap, simplemente no se llena.
//
// Solo se hace UNA petición por archivo de sitemap (nunca una por artículo): el
// título se deduce del último tramo de la URL (el slug), sin abrir cada página.

import { normalizeTitleKey } from "./published-title";

export interface SitemapTitle {
  title: string;
  titleKey: string;
  url: string;
}

const MAX_SITEMAP_FILES = 20;
const MAX_URLS = 5000;
const FETCH_TIMEOUT_MS = 10_000;
// Mínimo de palabras para considerar que un slug es un título y no una página
// de navegación ("contacto", "blog", "tag/seguros").
const MIN_TITLE_WORDS = 3;

/** Solo http(s) público: el enlace del sitemap lo escribe el usuario. */
export function isSafeSitemapUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }
  if (host.includes(":")) return false; // IPv6 literal
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)) {
      return false;
    }
  }
  return true;
}

/** Extrae los <loc> de un sitemap y dice si es un índice de sitemaps. */
export function parseSitemapXml(xml: string): { locs: string[]; isIndex: boolean } {
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const locs: string[] = [];
  const re = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s][^<\]]*?)\s*(?:\]\]>)?\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    locs.push(match[1].replace(/&amp;/g, "&"));
  }
  return { locs, isIndex };
}

/** Título legible a partir del slug de una URL de artículo, o null si no parece artículo. */
export function titleFromArticleUrl(rawUrl: string): SitemapTitle | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  let slug = segments[segments.length - 1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // se usa el slug tal cual
  }
  slug = slug.replace(/\.(html?|php|aspx?)$/i, "");
  if (/\.(xml|jpe?g|png|webp|gif|pdf)$/i.test(slug)) return null;
  const title = slug.replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();
  if (!title) return null;
  if (title.split(" ").length < MIN_TITLE_WORDS) return null;
  const titleKey = normalizeTitleKey(title);
  if (!titleKey) return null;
  return { title, titleKey, url: rawUrl };
}

type FetchText = (url: string) => Promise<string>;

async function defaultFetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.5", "User-Agent": "AutoArticulos-SitemapReader/1.0" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lee el sitemap (y los sitemaps hijos si es un índice) y devuelve los títulos
 * únicos. Una petición por archivo de sitemap; tope de archivos y de URLs.
 * Lanza si el sitemap raíz no se puede leer.
 */
export async function readSitemapTitles(
  sitemapUrl: string,
  fetchText: FetchText = defaultFetchText,
  deadlineMs = 8_000,
): Promise<SitemapTitle[]> {
  if (!isSafeSitemapUrl(sitemapUrl)) throw new Error("Dirección de sitemap no permitida.");
  // Presupuesto total: leer el sitemap nunca debe demorar el análisis que lo pide.
  const deadline = Date.now() + deadlineMs;
  const queue = [sitemapUrl];
  const visited = new Set<string>();
  const found = new Map<string, SitemapTitle>();
  let files = 0;
  while (queue.length > 0 && files < MAX_SITEMAP_FILES && found.size < MAX_URLS) {
    const next = queue.shift()!;
    if (visited.has(next)) continue;
    visited.add(next);
    if (Date.now() > deadline) throw new Error("Tiempo agotado leyendo el sitemap.");
    files += 1;
    let xml: string;
    try {
      xml = await fetchText(next);
    } catch (err) {
      if (files === 1) throw err;
      continue; // un sitemap hijo caído no invalida los demás
    }
    const { locs, isIndex } = parseSitemapXml(xml);
    if (files === 1 && locs.length === 0) throw new Error("El sitemap no contiene direcciones.");
    for (const loc of locs) {
      if (isIndex) {
        if (isSafeSitemapUrl(loc)) queue.push(loc);
        continue;
      }
      const entry = titleFromArticleUrl(loc);
      if (entry && !found.has(entry.titleKey)) found.set(entry.titleKey, entry);
      if (found.size >= MAX_URLS) break;
    }
  }
  return [...found.values()];
}
