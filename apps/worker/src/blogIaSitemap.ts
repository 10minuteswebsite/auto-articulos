// Sitemap de BLOG IA para el envío diario a Google/Bing (2026-10-21).
//
// SEO Total ya envía cada día el sitemap de cada usuario a Search Console y a
// Bing (send-daily-sitemaps.ts). Para una cuenta con BLOG IA ACTIVO, los
// artículos viven en el subdominio del blog, así que se envía el sitemap del
// blog en lugar del de 10minutesWebsite (decisión «solo en el blog», sin
// duplicados). Se REUTILIZA la conexión que la cuenta ya tiene.
//
// Search Console solo acepta un sitemap que pertenezca a la propiedad: una
// propiedad de DOMINIO (`sc-domain:cliente.com`) cubre `blog.cliente.com`; una de
// PREFIJO de URL (`https://cliente.com/`) NO. En ese caso se devuelve un error
// claro en vez de enviar algo que Google rechazaría.

export type BlogSitemapDecision =
  | { kind: "keep" }                              // la cuenta no usa BLOG IA activo: no se toca nada
  | { kind: "use"; sitemapUrl: string }           // enviar el sitemap del blog
  | { kind: "error"; message: string };           // no se puede enviar; mensaje para el historial

export interface BlogForSitemap {
  status: string;
  hostname: string | null;
}

function registrableTail(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** ¿La propiedad de Search Console/Bing cubre este sitemap? */
export function propertyCoversSitemap(siteUrl: string, sitemapUrl: string): boolean {
  let sitemap: URL;
  try { sitemap = new URL(sitemapUrl); } catch { return false; }
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = registrableTail(siteUrl.slice("sc-domain:".length).trim());
    const host = sitemap.hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    const prefix = new URL(siteUrl);
    return sitemap.origin === prefix.origin && sitemap.pathname.startsWith(prefix.pathname === "/" ? "/" : prefix.pathname);
  } catch { return false; }
}

export function resolveSitemapForAccount(input: {
  publishMethod: string | null | undefined;
  blog: BlogForSitemap | null;
  siteUrl: string;
}): BlogSitemapDecision {
  if (input.publishMethod !== "BLOG") return { kind: "keep" };
  if (!input.blog || input.blog.status !== "active" || !input.blog.hostname) {
    // BLOG IA desactivado, suspendido o a medias: no se publica nada nuevo, y el
    // sitemap anterior de 10minutesWebsite tampoco aplica. No se envía.
    return { kind: "error", message: "BLOG IA no está activo; no se envía sitemap." };
  }
  const sitemapUrl = `https://${input.blog.hostname}/sitemap.xml`;
  if (!propertyCoversSitemap(input.siteUrl, sitemapUrl)) {
    return {
      kind: "error",
      message: `Tu propiedad de Search Console (${input.siteUrl}) no incluye ${input.blog.hostname}. Conecta la propiedad de dominio o agrega la del subdominio del blog.`,
    };
  }
  return { kind: "use", sitemapUrl };
}
