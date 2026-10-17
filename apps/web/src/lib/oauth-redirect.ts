import type { NextRequest } from "next/server";
import { applyCookie, clearCookie } from "./shared-cookies";

// ÚNICOS hosts donde se admite un callback OAuth (orden de Milton 2026-10-17):
// articulos.lasolucionweb.net y redes.lasolucionweb.net. Nada de seototal ni
// del .com. La lista es fija: ninguna variable de entorno puede ampliarla.
const DEFAULT_ALLOWED_HOSTS = [
  "articulos.lasolucionweb.net",
  "redes.lasolucionweb.net",
];

/**
 * Devuelve el origen de la petición solo si el host está explícitamente
 * permitido. Así los callbacks conservan la cookie y la sesión del host que
 * inició OAuth, sin aceptar un Host header arbitrario ni comodines.
 */
export function getAllowedOAuthOrigin(request: NextRequest): string | null {
  const host = request.nextUrl.host.toLowerCase();
  return DEFAULT_ALLOWED_HOSTS.includes(host) ? request.nextUrl.origin : null;
}

export function getOAuthRedirectUri(
  request: NextRequest,
  path: string,
  configuredRedirectUri: string,
): string {
  const canonical = canonicalOAuthOrigin();
  if (canonical) return `${canonical}${path}`;
  const origin = getAllowedOAuthOrigin(request);
  return origin ? `${origin}${path}` : configuredRedirectUri;
}

/*
 * RETORNO ÚNICO DE OAUTH. Ya no existe un origen canónico por defecto (antes era
 * seototal.lasolucionweb.com): cada conexión vuelve al host que la inició
 * (articulos o redes .net). Solo si se define OAUTH_CANONICAL_ORIGIN y su host
 * está en la lista permitida se usa ese origen; cualquier otro valor se ignora.
 */
export const OAUTH_ORIGIN_COOKIE = "oauth_return_origin";

type Env = Record<string, string | undefined>;

/** Origen canónico de los callbacks, o null (lo normal): se usa el host de la petición. */
export function canonicalOAuthOrigin(env: Env = process.env): string | null {
  const explicit = env.OAUTH_CANONICAL_ORIGIN?.trim();
  if (!explicit) return null;
  try {
    const url = new URL(explicit);
    if (url.protocol === "https:" && DEFAULT_ALLOWED_HOSTS.includes(url.host.toLowerCase())) return url.origin;
  } catch {
    // valor inválido: se ignora
  }
  return null;
}

/** redirect_uri que se envía al proveedor: canónico si el retorno único está activo; si no, el host de la petición (como siempre). */
export function oauthCallbackUri(request: { url: string }, path: string, env: Env = process.env): string {
  const canonical = canonicalOAuthOrigin(env);
  if (canonical) return `${canonical}${path}`;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}${path}`;
}

export function isAllowedOAuthHost(host: string, _env: Env = process.env): boolean {
  return DEFAULT_ALLOWED_HOSTS.includes(host.trim().toLowerCase());
}

/** Al iniciar la conexión: recuerda de qué host viene el usuario (solo si el retorno único está activo y el host está permitido). */
export function rememberOAuthOrigin(
  response: Parameters<typeof applyCookie>[0],
  request: { url: string },
  env: Env = process.env,
): void {
  if (!canonicalOAuthOrigin(env)) return;
  const host = new URL(request.url).host.toLowerCase();
  if (!isAllowedOAuthHost(host, env)) return;
  applyCookie(response, OAUTH_ORIGIN_COOKIE, host, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 }, env);
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Base contra la que se arman las redirecciones del callback. Sin retorno único: la
 * propia petición (idéntico a antes). Con él: el host recordado, SOLO si sigue
 * estando en la lista permitida (nunca un destino arbitrario); si no, la petición.
 */
export function oauthReturnBase(request: { url: string; headers: Headers }, env: Env = process.env): string {
  if (!canonicalOAuthOrigin(env)) return request.url;
  const host = readCookie(request.headers.get("cookie"), OAUTH_ORIGIN_COOKIE);
  if (host && isAllowedOAuthHost(host, env)) return `https://${host.toLowerCase()}`;
  return request.url;
}

/** Al terminar el callback: borra la cookie de origen (en sus dos variantes). */
export function clearOAuthOrigin(response: Parameters<typeof clearCookie>[0], env: Env = process.env): void {
  if (!canonicalOAuthOrigin(env)) return;
  clearCookie(response, OAUTH_ORIGIN_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" }, env);
}

/*
 * REDES CONECTADAS POR LOS DOS SITIOS .NET (2026-10-17). Para las conexiones ya
 * registradas en el proveedor con las direcciones de articulos y redes .net, el
 * retorno es SIEMPRE el host .net desde el que se inicia (nunca seototal ni .com).
 */
export const NET_PRODUCT_HOSTS = ["articulos.lasolucionweb.net", "redes.lasolucionweb.net"] as const;
export const NET_DEFAULT_ORIGIN = "https://articulos.lasolucionweb.net";

export function isNetProductHost(host: string): boolean {
  return (NET_PRODUCT_HOSTS as readonly string[]).includes(host.trim().toLowerCase());
}

/** redirect_uri .net: el host de la petición si es articulos/redes .net; si no, articulos .net. */
export function netCallbackUri(request: { url: string }, path: string): string {
  const host = new URL(request.url).host.toLowerCase();
  return `${isNetProductHost(host) ? `https://${host}` : NET_DEFAULT_ORIGIN}${path}`;
}
