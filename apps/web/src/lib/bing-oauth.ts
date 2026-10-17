export const BING_STATE_COOKIE = "bing_webmaster_oauth_state";
export const BING_SCOPE = "webmaster.manage";

export function bingOAuthConfig(stored?: { clientId: string; clientSecret: string } | null) {
  // Las credenciales guardadas en Administración mandan; las variables quedan de respaldo.
  const clientId = stored?.clientId || process.env.BING_WEBMASTER_CLIENT_ID;
  const clientSecret = stored?.clientSecret || process.env.BING_WEBMASTER_CLIENT_SECRET;
  const redirectUri =
    process.env.BING_WEBMASTER_REDIRECT_URI ??
    "https://articulos.lasolucionweb.net/api/search-integrations/bing/callback";
  if (!clientId || !clientSecret)
    throw new Error("Bing Webmaster Tools OAuth no está configurado.");
  return { clientId, clientSecret, redirectUri };
}

/**
 * Con el cliente nuevo de Bing (cambio de 2026-10-17) la dirección de retorno es
 * UNA sola y debe coincidir letra por letra con la registrada en Bing. Si la
 * variable BING_WEBMASTER_REDIRECT_URI está definida y es válida, manda; si no,
 * se usa SIEMPRE articulos.lasolucionweb.net (el cliente nuevo solo está
 * registrado ahí). Nunca seototal ni el .com.
 */
export const BING_DEFAULT_REDIRECT = "https://articulos.lasolucionweb.net/api/search-integrations/bing/callback";

export function bingExplicitRedirect(env: Record<string, string | undefined> = process.env): URL {
  const raw = env.BING_WEBMASTER_REDIRECT_URI?.trim();
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol === "https:") return url;
    } catch {
      // valor inválido: se usa el de siempre
    }
  }
  return new URL(BING_DEFAULT_REDIRECT);
}
