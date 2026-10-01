import type { NextRequest } from "next/server";

const DEFAULT_ALLOWED_HOSTS = [
  "seototal.lasolucionweb.com",
  "seototal.articulos.lasolucionweb.com",
  "seototal.redes.lasolucionweb.com",
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
