import type { NextRequest } from "next/server";

// Hosts de SEO Total: el principal y los dos productos (decisión de Milton
// 2026-10-02: subdominios en el .com, sin «seototal.»; Mario crea el DNS).
const DEFAULT_ALLOWED_HOSTS = [
  "seototal.lasolucionweb.com",
  "articulos.lasolucionweb.com",
  "redes.lasolucionweb.com",
];

/**
 * Devuelve el origen de la petición solo si el host está explícitamente
 * permitido. Así los callbacks conservan la cookie y la sesión del host que
 * inició OAuth, sin aceptar un Host header arbitrario ni comodines.
 */
export function getAllowedOAuthOrigin(request: NextRequest): string | null {
  const configured = (process.env.SEO_TOTAL_OAUTH_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowed = new Set([...DEFAULT_ALLOWED_HOSTS, ...configured]);
  const host = request.nextUrl.host.toLowerCase();
  return allowed.has(host) ? request.nextUrl.origin : null;
}

export function getOAuthRedirectUri(
  request: NextRequest,
  path: string,
  configuredRedirectUri: string,
): string {
  const origin = getAllowedOAuthOrigin(request);
  return origin ? `${origin}${path}` : configuredRedirectUri;
}
