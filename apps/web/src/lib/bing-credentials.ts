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
  await prisma.systemSetting.deleteMany({ where: { key: { in: [BING_CLIENT_ID_SETTING, BING_CLIENT_SECRET_SETTING] } } });
}

export function maskBingValue(value: string): string {
  return `••••••••${value.slice(-4)}`;
}
