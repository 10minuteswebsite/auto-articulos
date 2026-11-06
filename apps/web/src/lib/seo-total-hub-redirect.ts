export const SEO_TOTAL_CANONICAL_HOSTS = new Set([
  "seototal.lasolucionweb.com",
  "articulos.lasolucionweb.com",
  "articulos.lasolucionweb.net",
  "redes.lasolucionweb.com",
  "redes.lasolucionweb.net",
]);

/**
 * Rutas humanas de entrada que pueden llevar a una persona sin sesión al HUB.
 * Las APIs, callbacks y la ruta de intercambio del HUB quedan fuera a propósito.
 */
export function isSeoTotalHumanEntry(hostname: string | null | undefined, pathname: string): boolean {
  const host = (hostname ?? "").toLowerCase().split(":")[0];
  if (!SEO_TOTAL_CANONICAL_HOSTS.has(host)) return false;
  return pathname === "/" || pathname === "/login" || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}
