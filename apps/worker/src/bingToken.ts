import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  getBingAccessToken,
  BING_CLIENT_ID_SETTING,
  BING_CLIENT_SECRET_SETTING,
  type BingClientCredentials,
  parseBingTokenPayload,
  formatBingTokenPayload,
} from "@auto-articulos/shared";

/** Credenciales de Bing guardadas por un administrador (cifradas); si no hay, se usan las variables. */
async function getStoredBingCredentials(): Promise<BingClientCredentials | null> {
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

/**
 * Mismo criterio que apps/web/src/lib/bing-token.ts: único punto por el que el
 * worker pide un access token de Bing.
 */
export async function getBingTokenForIntegration(integration: {
  id: string;
  encryptedRefreshToken: string;
}): Promise<string> {
  const decrypted = decryptSecret(integration.encryptedRefreshToken);
  const tokenData = parseBingTokenPayload(decrypted);

  if (
    tokenData.accessToken &&
    tokenData.expiresAt &&
    Date.now() < tokenData.expiresAt - 120000
  ) {
    return tokenData.accessToken;
  }

  const { accessToken, expiresInSeconds } = await getBingAccessToken(
    tokenData.refreshToken,
    await getStoredBingCredentials(),
  );

  try {
    const updatedPayload = formatBingTokenPayload({
      refreshToken: tokenData.refreshToken,
      accessToken,
      expiresAt: Date.now() + Math.max(((expiresInSeconds ?? 3600) - 300) * 1000, 60000),
    });
    await prisma.searchIntegration.update({
      where: { id: integration.id },
      data: { encryptedRefreshToken: encryptSecret(updatedPayload) },
    });
  } catch (error) {
    console.error(
      "[bing] No se pudo persistir el access token en worker DB:",
      error instanceof Error ? error.message : String(error),
    );
  }

  return accessToken;
}
