/*
 * BLOG IA · análisis del sitio principal del cliente (paso 1 del wizard).
 *
 * Lee SOLO la portada pública (HTML) y propone: nombre comercial, logo, color,
 * menú, enlaces del pie y WhatsApp. Son SUGERENCIAS: nada se guarda hasta que la
 * persona las revisa y confirma (blueprint §3.2: «no asumir que lo detectado es
 * correcto»).
 *
 * Como el servidor visita una dirección que escribe un usuario, la lectura está
 * blindada contra SSRF: solo https, sin IPs ni nombres internos, cada salto de
 * redirección se vuelve a validar, el DNS se resuelve y se rechazan direcciones
 * privadas, y hay límites de tiempo y tamaño. Todo lo externo se inyecta
 * (`resolveHost`, `fetchImpl`) para probarlo sin red.
 */

export interface SiteSuggestions {
  name?: string;
  logoUrl?: string;
  accentColor?: string;
  language?: string;
  whatsapp?: string;
  nav: { label: string; href: string }[];
  footerLinks: { label: string; href: string }[];
}

export type AnalysisResult =
  | { ok: true; value: SiteSuggestions; finalUrl: string }
  | { ok: false; error: string; manual: true };

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;

// ----------------------------------------------------------------- red segura

/** ¿Es una dirección IP privada, local o reservada? (IPv4 e IPv6 habituales) */
export function isPrivateAddress(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  if (v.includes(":")) {
    if (v === "::" || v === "::1") return true;
    if (v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")) return true; // link-local
    if (v.startsWith("fc") || v.startsWith("fd")) return true; // ULA
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return true; // no es una IP válida: se trata como no confiable
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) // CGNAT
  );
}

function checkUrlShape(raw: string): URL | string {
  let url: URL;
  try { url = new URL(raw); } catch { return "La dirección del sitio no es válida."; }
  if (url.protocol !== "https:") return "La dirección del sitio debe empezar con https://.";
  if (url.username || url.password) return "La dirección no puede incluir usuario ni contraseña.";
  if (url.port && url.port !== "443") return "Usa la dirección normal de tu sitio, sin puerto.";
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || /^[\d.]+$/.test(host) || host.startsWith("[")) {
    return "Usa el nombre de dominio público de tu sitio.";
  }
  return url;
}

export interface FetchDeps {
  /** Direcciones IP del host. Debe lanzar si no resuelve. */
  resolveHost: (hostname: string) => Promise<string[]>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** Descarga la portada con todas las defensas. Devuelve el HTML o un mensaje en lenguaje claro. */
export async function fetchSiteHtml(rawUrl: string, deps: FetchDeps): Promise<{ html: string; finalUrl: string } | { error: string }> {
  const doFetch = deps.fetchImpl ?? fetch;
  let current = rawUrl.trim();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const shaped = checkUrlShape(current);
    if (typeof shaped === "string") return { error: shaped };
    let ips: string[];
    try { ips = await deps.resolveHost(shaped.hostname); } catch { return { error: "No pudimos encontrar ese sitio. Revisa la dirección." }; }
    if (ips.length === 0 || ips.some(isPrivateAddress)) return { error: "Esa dirección no es un sitio público." };

    let res: Response;
    try {
      res = await doFetch(shaped.toString(), {
        redirect: "manual",
        headers: { accept: "text/html", "user-agent": "SEOTotalBot/1.0 (+analisis de marca)" },
        signal: AbortSignal.timeout(deps.timeoutMs ?? 8_000),
      });
    } catch {
      return { error: "Tu sitio no respondió a tiempo. Puedes escribir los datos a mano." };
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { error: "Tu sitio redirige de forma incorrecta." };
      try { current = new URL(loc, shaped).toString(); } catch { return { error: "Tu sitio redirige a una dirección inválida." }; }
      continue;
    }
    if (!res.ok) return { error: "Tu sitio bloquea la lectura automática. Puedes escribir los datos a mano." };
    if (!/text\/html|application\/xhtml/i.test(res.headers.get("content-type") ?? "")) return { error: "La portada de tu sitio no es una página web legible." };
    const reader = res.body?.getReader();
    if (!reader) return { error: "No se pudo leer la página." };
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { await reader.cancel().catch(() => {}); break; } // se analiza lo recibido
      chunks.push(value);
    }
    return { html: new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks)), finalUrl: shaped.toString() };
  }
  return { error: "Tu sitio redirige demasiadas veces." };
}

// ------------------------------------------------------------------- análisis

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  const v = m ? (m[1] ?? m[2] ?? m[3]) : undefined;
  return v === undefined ? undefined : decode(v);
}

function metaContent(html: string, key: string): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const k = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
    if (k === key) return attr(tag, "content");
  }
  return undefined;
}

function absoluteHttps(href: string | undefined, base: URL): string | undefined {
  if (!href) return undefined;
  try {
    const u = new URL(href, base);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch { return undefined; }
}

function linksIn(block: string, base: URL, max: number): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  const seen = new Set<string>();
  for (const m of block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = absoluteHttps(attr(m[1], "href"), base);
    const label = decode(m[2].replace(/<[^>]*>/g, "")).slice(0, 40);
    if (!href || !label || seen.has(href)) continue;
    seen.add(href);
    out.push({ label, href });
    if (out.length >= max) break;
  }
  return out;
}

/** Extrae sugerencias de la portada. Nunca lanza: lo que no se encuentra queda vacío. */
export function analyzeSiteHtml(html: string, finalUrl: string): SiteSuggestions {
  const base = new URL(finalUrl);
  const out: SiteSuggestions = { nav: [], footerLinks: [] };

  const rawName = metaContent(html, "og:site_name") ?? metaContent(html, "application-name") ?? decode((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").split(/[|\-–—·]/)[0]);
  if (rawName) out.name = rawName.slice(0, 80);

  const color = metaContent(html, "theme-color");
  if (color && /^#[0-9a-f]{6}$/i.test(color)) out.accentColor = color.toLowerCase();
  else if (color && /^#[0-9a-f]{3}$/i.test(color)) out.accentColor = `#${[...color.slice(1)].map((c) => c + c).join("")}`.toLowerCase();

  const lang = /<html\b[^>]*\blang\s*=\s*["']?([a-z]{2})/i.exec(html)?.[1];
  if (lang) out.language = lang.toLowerCase();

  // Logo: imagen explícita de marca antes que el ícono de pestaña.
  const logoFromImg = /<img\b[^>]*(?:class|id|alt)\s*=\s*["'][^"']*logo[^"']*["'][^>]*>/i.exec(html)?.[0];
  const icons = (html.match(/<link\b[^>]*>/gi) ?? []).filter((t) => /icon/i.test(attr(t, "rel") ?? ""));
  const apple = icons.find((t) => /apple-touch-icon/i.test(attr(t, "rel") ?? ""));
  const logo = absoluteHttps(logoFromImg ? attr(logoFromImg, "src") : undefined, base)
    ?? absoluteHttps(metaContent(html, "og:image"), base)
    ?? absoluteHttps(apple ? attr(apple, "href") : undefined, base)
    ?? absoluteHttps(icons[0] ? attr(icons[0], "href") : undefined, base);
  if (logo) out.logoUrl = logo;

  const nav = /<nav\b[\s\S]*?<\/nav>/i.exec(html)?.[0] ?? /<header\b[\s\S]*?<\/header>/i.exec(html)?.[0] ?? "";
  out.nav = linksIn(nav, base, 8);
  const footer = /<footer\b[\s\S]*?<\/footer>/i.exec(html)?.[0] ?? "";
  out.footerLinks = linksIn(footer, base, 10);

  // WhatsApp: enlaces wa.me / api.whatsapp.com con número; solo dígitos con código de país.
  const wa = /(?:wa\.me\/|api\.whatsapp\.com\/send\?[^"'\s]*phone=)(\+?\d{8,15})/i.exec(html)?.[1];
  if (wa) out.whatsapp = `+${wa.replace(/\D/g, "")}`;
  return out;
}

export async function analyzeSite(rawUrl: string, deps: FetchDeps): Promise<AnalysisResult> {
  const fetched = await fetchSiteHtml(rawUrl, deps);
  if ("error" in fetched) return { ok: false, error: fetched.error, manual: true };
  return { ok: true, value: analyzeSiteHtml(fetched.html, fetched.finalUrl), finalUrl: fetched.finalUrl };
}

/**
 * Límite simple por persona (memoria de la instancia: freno de abuso «best effort»,
 * no una garantía global en servidores sin estado).
 */
export function createThrottle(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    if (recent.length >= max) { hits.set(key, recent); return false; }
    recent.push(t);
    hits.set(key, recent);
    return true;
  };
}
