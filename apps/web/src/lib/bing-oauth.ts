export const BING_STATE_COOKIE = "bing_webmaster_oauth_state";
export const BING_SCOPE = "webmaster.manage";

export function bingOAuthConfig(stored?: { clientId: string; clientSecret: string } | null) {
  // Las credenciales guardadas en Administración mandan; las variables quedan de respaldo.
  const clientId = stored?.clientId || process.env.BING_WEBMASTER_CLIENT_ID;
  const clientSecret = stored?.clientSecret || process.env.BING_WEBMASTER_CLIENT_SECRET;
  const redirectUri =
    process.env.BING_WEBMASTER_REDIRECT_URI ??
    "https://seototal.lasolucionweb.com/api/search-integrations/bing/callback";
  if (!clientId || !clientSecret)
    throw new Error("Bing Webmaster Tools OAuth no está configurado.");
  return { clientId, clientSecret, redirectUri };
}

/**
 * Con el cliente nuevo de Bing (cambio de 2026-10-17) la dirección de retorno es
 * UNA sola y debe coincidir letra por letra con la registrada en Bing. Si la
 * variable BING_WEBMASTER_REDIRECT_URI está definida, manda sobre cualquier
 * cálculo por host. Sin ella, todo sigue como hasta hoy.
 */
export function bingExplicitRedirect(env: Record<string, string | undefined> = process.env): URL | null {
  const raw = env.BING_WEBMASTER_REDIRECT_URI?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
