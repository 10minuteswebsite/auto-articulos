/*
 * COOKIES COMPARTIDAS ENTRE SUBDOMINIOS.
 *
 * Para que quien inicia sesión en una dirección siga identificado en otras de la
 * misma familia (`.lasolucionweb.net`), la cookie puede llevar un dominio
 * compartido. Se activa solo con la variable SHARED_COOKIE_DOMAIN explícita (o con
 * el dominio que fija `cookieEnvForHost` en el callback del HUB). Sin ninguna (o
 * con un valor inválido) TODO funciona exactamente como siempre: cookie ligada al
 * host. Es lógica pura y válida para el runtime Edge (middleware).
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

/**
 * Selecciona el dominio compartido de la familia de hosts que está emitiendo
 * la cookie. El HUB puede abrir Redes en `.net` o en `.com`; un servidor `.net`
 * no puede fijar una cookie para `.com` porque el navegador la rechaza.
 */
export function cookieEnvForHost(hostname: string, env: Env = process.env): Env {
  const host = hostname.trim().toLowerCase().split(":", 1)[0];
  if (host.endsWith(".lasolucionweb.net")) {
    return { ...env, SHARED_COOKIE_DOMAIN: ".lasolucionweb.net" };
  }
  if (host.endsWith(".lasolucionweb.com")) {
    return { ...env, SHARED_COOKIE_DOMAIN: ".lasolucionweb.com" };
  }
  return env;
}

/**
 * Dominio compartido válido (empieza por punto y tiene al menos dos etiquetas) o undefined.
 * Solo vale SHARED_COOKIE_DOMAIN explícito; sin él, cookie ligada al host.
 */
export function sharedCookieDomain(env: Env = process.env): string | undefined {
  const raw = env.SHARED_COOKIE_DOMAIN?.trim().toLowerCase();
  if (raw && /^\.[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw)) return raw;
  return undefined;
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
