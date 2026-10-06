import { BLOGGER_SCOPE } from "@auto-articulos/shared";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const BLOGGER_STATE_COOKIE = "blogger_oauth_state";
export const BLOGGER_CALLBACK_PATH = "/api/search-integrations/blogger/callback";
const BLOGGER_STATE_TTL_MS = 10 * 60 * 1000;

function stateSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está configurada.");
  return secret;
}

function signState(payload: string): string {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

/** Estado OAuth firmado: permite completar el callback aunque Google no reenvíe la cookie de sesión. */
export function createBloggerOAuthState(userId: string): string {
  const payload = [userId, Date.now() + BLOGGER_STATE_TTL_MS, randomBytes(16).toString("base64url")].join(".");
  return `${payload}.${signState(payload)}`;
}

export function verifyBloggerOAuthState(state: string | null): string | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 4) return null;
  const [userId, expiresAt, nonce, signature] = parts;
  if (!userId || !nonce || !/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return null;
  try {
    const expected = signState([userId, expiresAt, nonce].join("."));
    const actualBytes = Buffer.from(signature, "base64url");
    const expectedBytes = Buffer.from(expected, "base64url");
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes) ? userId : null;
  } catch {
    return null;
  }
}

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
