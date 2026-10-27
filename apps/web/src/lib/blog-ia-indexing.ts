// Un blog de BLOG IA nace en una dirección de inicio (*.lasolucionweb.net) con «no indexar» a propósito: todo el SEO se
// acumula en el dominio propio de la persona cuando lo conecte. Mientras tanto Google no lo lee, así que el Historial no
// debe prometer sitemap ni ofrecer «Comprobar indexación» para esas publicaciones.

export const BLOG_IA_STARTER_DOMAIN = "lasolucionweb.net";

/** Hostname del blog si está en la dirección de inicio; null si ya tiene dominio propio o no hay blog. */
export function starterHostOf(blogHostname: string | null | undefined): string | null {
  const host = (blogHostname ?? "").trim().toLowerCase();
  return host.endsWith(`.${BLOG_IA_STARTER_DOMAIN}`) ? host : null;
}

/** ¿Esta publicación está en el blog en dirección de inicio (y por tanto no se indexa)? */
export function isIndexingNotApplicable(starterHost: string | null, articleUrl: string | null | undefined): boolean {
  if (!starterHost || !articleUrl) return false;
  try {
    return new URL(articleUrl).hostname.toLowerCase() === starterHost;
  } catch {
    return false;
  }
}
