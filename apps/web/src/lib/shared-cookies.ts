/*
 * COOKIES COMPARTIDAS ENTRE SUBDOMINIOS (proyecto «SEPARACION DE SEO TOTAL»).
 *
 * El Día Cero SEO Total responde en tres direcciones del mismo `.com`:
 * seototal.lasolucionweb.com, articulos.lasolucionweb.com y redes.lasolucionweb.com.
 * Para que quien inicia sesión en una siga identificado en las otras (y para que
 * el retorno de una conexión OAuth, que llega siempre a la dirección de siempre,
 * reconozca al usuario), la cookie de sesión debe valer para todo el `.com`.
 *
 * INTERRUPTOR: la variable de entorno SHARED_COOKIE_DOMAIN (p. ej. «.lasolucionweb.com»).
 * Sin ella (o con un valor inválido) TODO funciona exactamente como antes: cookie
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

/** Dominio compartido válido (empieza por punto y tiene al menos dos etiquetas) o undefined. */
export function sharedCookieDomain(env: Env = process.env): string | undefined {
  const raw = env.SHARED_COOKIE_DOMAIN?.trim().toLowerCase();
  return raw && /^\.[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw) ? raw : undefined;
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
