import { prisma } from "@auto-articulos/db";
import {
  BING_CLIENT_ID_SETTING,
  BING_CLIENT_SECRET_SETTING,
  decryptSecret,
  encryptSecret,
  type BingClientCredentials,
} from "@auto-articulos/shared";

/** Credenciales de Bing guardadas por un administrador (cifradas en SystemSetting). */
export async function getStoredBingCredentials(): Promise<BingClientCredentials | null> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [BING_CLIENT_ID_SETTING, BING_CLIENT_SECRET_SETTING] } },
  });
  const read = (key: string) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return null;
    try {
      return decryptSecret(row.encryptedValue);
    } catch {
      return null;
    }
  };
  const clientId = read(BING_CLIENT_ID_SETTING);
  const clientSecret = read(BING_CLIENT_SECRET_SETTING);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export async function saveBingCredentials(clientId: string, clientSecret: string): Promise<void> {
  for (const [key, value] of [
    [BING_CLIENT_ID_SETTING, clientId],
    [BING_CLIENT_SECRET_SETTING, clientSecret],
  ] as const) {
    const encryptedValue = encryptSecret(value);
    await prisma.systemSetting.upsert({ where: { key }, create: { key, encryptedValue }, update: { encryptedValue } });
  }
}

export async function deleteBingCredentials(): Promise<void> {
  await prisma.systemSetting.deleteMany({ where: { key: { in: [BING_CLIENT_ID_SETTING, BING_CLIENT_SECRET_SETTING, BING_REDIRECT_SETTING] } } });
}

export function maskBingValue(value: string): string {
  return `••••••••${value.slice(-4)}`;
}

/** Dirección de retorno de Bing guardada por un administrador (manda sobre la variable de entorno). */
export const BING_REDIRECT_SETTING = "bing_webmaster_redirect_uri";

export async function getStoredBingRedirect(): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key: BING_REDIRECT_SETTING } });
  if (!row) return null;
  try {
    return decryptSecret(row.encryptedValue);
  } catch {
    return null;
  }
}

export async function saveBingRedirect(redirectUri: string): Promise<void> {
  const encryptedValue = encryptSecret(redirectUri);
  await prisma.systemSetting.upsert({
    where: { key: BING_REDIRECT_SETTING },
    create: { key: BING_REDIRECT_SETTING, encryptedValue },
    update: { encryptedValue },
  });
}
