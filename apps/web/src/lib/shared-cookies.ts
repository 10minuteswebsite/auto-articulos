/*
 * COOKIES COMPARTIDAS ENTRE SUBDOMINIOS (proyecto «SEPARACION DE SEO TOTAL»).
 *
 * El Día Cero SEO Total responde en tres direcciones del mismo `.com`:
 * seototal.lasolucionweb.com, articulos.lasolucionweb.com y redes.lasolucionweb.com.
 * Para que quien inicia sesión en una siga identificado en las otras (y para que
 * el retorno de una conexión OAuth, que llega siempre a la dirección de siempre,
 * reconozca al usuario), la cookie de sesión debe valer para todo el `.com`.
 *
 * INTERRUPTOR ÚNICO DEL DÍA CERO: la variable de entorno DIA_CERO=on (activa el
 * dominio «.lasolucionweb.com»). También vale SHARED_COOKIE_DOMAIN explícito.
 * Sin ninguna (o con un valor inválido) TODO funciona exactamente como antes: cookie
 * ligada al host. Es lógica pura y válida para el runtime Edge (middleware).
 *
 * Problema que resuelve el doble Set-Cookie: una cookie con Domain y otra
 * ligada al host con el MISMO nombre conviven en el navegador, y el servidor
 * puede leer la vieja. Por eso, al fijar con dominio se BORRA también la variante
 * ligada al host, y al cerrar sesión se borran las dos. `ResponseCookies` de Next
 * guarda una sola entrada por nombre, así que se escriben las cabeceras a mano.
 */
export interface SharedCookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
}

type Env = Record<string, string | undefined>;

/** Dominio por defecto del Día Cero (los tres subdominios de SEO Total viven bajo él). */
export const DIA_CERO_COOKIE_DOMAIN = ".lasolucionweb.com";

/** ¿Está activo el interruptor único del Día Cero (variable DIA_CERO=on)? */
export function diaCeroActive(env: Env = process.env): boolean {
  const raw = env.DIA_CERO?.trim().toLowerCase();
  return raw === "on" || raw === "1" || raw === "true";
}

/**
 * Dominio compartido válido (empieza por punto y tiene al menos dos etiquetas) o undefined.
 * Prioridad: SHARED_COOKIE_DOMAIN explícito; si no, DIA_CERO=on usa el dominio por defecto.
 */
export function sharedCookieDomain(env: Env = process.env): string | undefined {
  const raw = env.SHARED_COOKIE_DOMAIN?.trim().toLowerCase();
  if (raw && /^\.[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw)) return raw;
  return diaCeroActive(env) ? DIA_CERO_COOKIE_DOMAIN : undefined;
}

export function serializeCookie(
  name: string,
  value: string,
  options: SharedCookieOptions & { domain?: string } = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
    if (options.maxAge <= 0) parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  }
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
  return parts.join("; ");
}

/**
 * Cabeceras Set-Cookie para FIJAR una cookie. Con dominio compartido activo:
 * la cookie con dominio y el borrado de la variante ligada al host.
 */
export function setCookieHeaders(
  name: string,
  value: string,
  options: SharedCookieOptions = {},
  env: Env = process.env,
): string[] {
  const domain = sharedCookieDomain(env);
  if (!domain) return [serializeCookie(name, value, options)];
  return [
    serializeCookie(name, value, { ...options, domain }),
    serializeCookie(name, "", { ...options, maxAge: 0 }), // borra la variante ligada al host
  ];
}

/** Cabeceras Set-Cookie para BORRAR una cookie en sus dos variantes. */
export function clearCookieHeaders(
  name: string,
  options: SharedCookieOptions = {},
  env: Env = process.env,
): string[] {
  const domain = sharedCookieDomain(env);
  const base = serializeCookie(name, "", { ...options, maxAge: 0 });
  return domain ? [base, serializeCookie(name, "", { ...options, maxAge: 0, domain })] : [base];
}

/** Añade varias cabeceras Set-Cookie a una respuesta (sin pisar las existentes). */
export function appendCookieHeaders(response: { headers: Headers }, headers: string[]): void {
  for (const header of headers) response.headers.append("Set-Cookie", header);
}

interface CookieResponse {
  headers: Headers;
  cookies: { set(name: string, value: string, options?: SharedCookieOptions): unknown };
}

/**
 * Fija una cookie en una respuesta. SIN dominio compartido hace EXACTAMENTE lo de
 * siempre (`response.cookies.set`), así que apagar la variable de entorno deja el
 * comportamiento idéntico al anterior. Con dominio compartido escribe las cabeceras.
 */
export function applyCookie(
  response: CookieResponse,
  name: string,
  value: string,
  options: SharedCookieOptions = {},
  env: Env = process.env,
): void {
  if (!sharedCookieDomain(env)) {
    response.cookies.set(name, value, options);
    return;
  }
  appendCookieHeaders(response, setCookieHeaders(name, value, options, env));
}

/**
 * Fija una cookie para el host que inició la petición OAuth.
 *
 * Los aliases .net no pueden recibir una cookie Domain=.lasolucionweb.com.
 * Las cookies de estado OAuth deben quedarse en el mismo host para que el
 * callback .net pueda validarlas; en .com se conserva el comportamiento de
 * cookies compartidas del Día Cero.
 */
export function applyOAuthStateCookie(
  response: CookieResponse,
  name: string,
  value: string,
  options: SharedCookieOptions = {},
  request: { url: string },
  env: Env = process.env,
): void {
  const host = new URL(request.url).hostname.toLowerCase();
  const netProductHosts = new Set([
    "seototal.lasolucionweb.net",
    "articulos.lasolucionweb.net",
    "redes.lasolucionweb.net",
  ]);
  if (netProductHosts.has(host)) {
    response.cookies.set(name, value, options);
    return;
  }
  applyCookie(response, name, value, options, env);
}

/** Borra una cookie (en sus dos variantes si hay dominio compartido). */
export function clearCookie(
  response: CookieResponse,
  name: string,
  options: SharedCookieOptions = {},
  env: Env = process.env,
): void {
  if (!sharedCookieDomain(env)) {
    response.cookies.set(name, "", { ...options, maxAge: 0 });
    return;
  }
  appendCookieHeaders(response, clearCookieHeaders(name, options, env));
}
