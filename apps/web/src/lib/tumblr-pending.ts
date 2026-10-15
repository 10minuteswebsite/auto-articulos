import { prisma } from "@auto-articulos/db";
import { isAllowedOAuthHost } from "./oauth-redirect";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";

/*
 * Tumblr (OAuth1) solo vuelve a la dirección registrada en su consola
 * (redes.lasolucionweb.net), que puede ser OTRO dominio que el que inició la
 * conexión (.com): las cookies no cruzan entre .com y .net. Por eso el token
 * temporal, su secreto y la persona que inició el flujo se guardan en el
 * servidor, cifrados y por diez minutos, indexados por el oauth_token que
 * Tumblr devuelve. Se reutiliza SystemSetting (sin migración).
 */
const PREFIX = "tumblr_pending:";
const TTL_MS = 10 * 60 * 1000;

export interface TumblrPending {
  userId: string;
  oauthTokenSecret: string;
  returnHost: string | null;
  createdAt: number;
}

export async function saveTumblrPending(oauthToken: string, data: Omit<TumblrPending, "createdAt">) {
  const value = encryptSecret(JSON.stringify({ ...data, createdAt: Date.now() }));
  await prisma.systemSetting.upsert({
    where: { key: PREFIX + oauthToken },
    create: { key: PREFIX + oauthToken, encryptedValue: value },
    update: { encryptedValue: value },
  });
}

/** Lee y consume (borra) el pendiente; null si no existe o caducó. */
export async function takeTumblrPending(oauthToken: string): Promise<TumblrPending | null> {
  const key = PREFIX + oauthToken;
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row) return null;
  await prisma.systemSetting.delete({ where: { key } }).catch(() => undefined);
  try {
    const data = JSON.parse(decryptSecret(row.encryptedValue)) as TumblrPending;
    if (!data.userId || !data.oauthTokenSecret || Date.now() - data.createdAt > TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

const EXTRA_RETURN_HOSTS = ["redes.lasolucionweb.net", "articulos.lasolucionweb.net"];

/** Host al que devolver a la persona al terminar: el que inició la conexión, solo si es uno propio. */
export function tumblrReturnHost(host: string): string | null {
  const h = host.trim().toLowerCase();
  return isAllowedOAuthHost(h) || EXTRA_RETURN_HOSTS.includes(h) ? h : null;
}
