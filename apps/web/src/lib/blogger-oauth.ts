import { BLOGGER_SCOPE } from "@auto-articulos/shared";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";

export const BLOGGER_STATE_COOKIE = "blogger_oauth_state";
export const BLOGGER_CALLBACK_PATH = "/api/search-integrations/blogger/callback";

// Blogger usa el mismo cliente OAuth de Google que Search Console y Analytics
// cuando está disponible. Durante la transición conservamos como fallback las
// credenciales antiguas guardadas en systemSetting.
const BLOGGER_ALLOWED_HOSTS = new Set([
  "seototal.lasolucionweb.com",
  "seototal.lasolucionweb.net",
  "redes.lasolucionweb.com",
  "redes.lasolucionweb.net",
]);

export function getBloggerRedirectUri(requestUrl: string) {
  const url = new URL(requestUrl);
  const localDevelopment = process.env.NODE_ENV !== "production" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if ((!localDevelopment && url.protocol !== "https:") || (!localDevelopment && !BLOGGER_ALLOWED_HOSTS.has(url.hostname.toLowerCase()))) {
    throw new Error("El dominio actual no está autorizado para conectar Blogger.");
  }
  return `${url.origin}${BLOGGER_CALLBACK_PATH}`;
}

export async function bloggerOAuthConfig() {
  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "blogger_client_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "blogger_client_secret" } }),
  ]);
  const sharedClientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  const sharedClientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
  const clientId = sharedClientId && sharedClientSecret
    ? sharedClientId
    : idSetting ? decryptSecret(idSetting.encryptedValue) : process.env.BLOGGER_CLIENT_ID;
  const clientSecret = sharedClientId && sharedClientSecret
    ? sharedClientSecret
    : secretSetting ? decryptSecret(secretSetting.encryptedValue) : process.env.BLOGGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth no está configurado.");
  return { clientId, clientSecret, scope: BLOGGER_SCOPE };
}
