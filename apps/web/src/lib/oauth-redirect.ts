import type { NextRequest } from "next/server";
import { applyCookie, clearCookie, diaCeroActive } from "./shared-cookies";

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
  const canonical = canonicalOAuthOrigin();
  if (canonical) return `${canonical}${path}`;
  const origin = getAllowedOAuthOrigin(request);
  return origin ? `${origin}${path}` : configuredRedirectUri;
}

/*
 * RETORNO ÚNICO DE OAUTH (proyecto «SEPARACION DE SEO TOTAL»).
 *
 * Objetivo de Milton: NO volver a tocar ninguna consola de proveedor. Con el
 * interruptor DIA_CERO=on (o OAUTH_CANONICAL_ORIGIN explícito):
 *  - Todos los `connect` (inicien en seototal., articulos. o redes.) le dicen al
 *    proveedor que vuelva a la dirección de SIEMPRE (el origen canónico), que es
 *    la que ya está registrada.
 *  - El host de origen se recuerda en una cookie corta (compartida por todo el
 *    .com) y, al terminar el callback, se devuelve al usuario a ese host.
 * Apagado (sin variables): todo se comporta exactamente como antes.
 */
export const DIA_CERO_CANONICAL_ORIGIN = "https://seototal.lasolucionweb.com";
export const OAUTH_ORIGIN_COOKIE = "oauth_return_origin";

type Env = Record<string, string | undefined>;

/** Origen canónico de los callbacks, o null si el retorno único está apagado. */
export function canonicalOAuthOrigin(env: Env = process.env): string | null {
  const explicit = env.OAUTH_CANONICAL_ORIGIN?.trim();
  if (explicit) {
    try {
      const url = new URL(explicit);
      if (url.protocol === "https:") return url.origin;
    } catch {
      // valor inválido: se ignora y se decide por DIA_CERO
    }
  }
  return diaCeroActive(env) ? DIA_CERO_CANONICAL_ORIGIN : null;
}

/** redirect_uri que se envía al proveedor: canónico si el retorno único está activo; si no, el host de la petición (como siempre). */
export function oauthCallbackUri(request: { url: string }, path: string, env: Env = process.env): string {
  const canonical = canonicalOAuthOrigin(env);
  if (canonical) return `${canonical}${path}`;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}${path}`;
}

function allowedHosts(env: Env): Set<string> {
  const configured = (env.SEO_TOTAL_OAUTH_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_HOSTS, ...configured]);
}

export function isAllowedOAuthHost(host: string, env: Env = process.env): boolean {
  return allowedHosts(env).has(host.trim().toLowerCase());
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
