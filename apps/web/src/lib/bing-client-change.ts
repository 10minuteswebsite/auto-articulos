import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";

/*
 * CAMBIO DEL CLIENTE OAUTH DE BING (2026-10-17). Bing solo admite una dirección
 * de retorno por cliente y no se puede editar, así que el cambio a
 * articulos.lasolucionweb.net exige un cliente nuevo. Los tokens ya guardados
 * pertenecen al cliente anterior y dejan de renovarse: cada persona con Bing
 * conectado debe volver a conectar. Este aviso es el interruptor:
 *  - BING_CLIENT_CHANGED_AT (fecha ISO) apagada/ausente → no se avisa a nadie.
 *  - Con la fecha puesta, se avisa SOLO a quien tiene una conexión de Bing que
 *    no se haya vuelto a conectar después de esa fecha. Quien no tiene Bing, o
 *    ya reconectó, no ve nada.
 * La marca de reconexión vive en SystemSetting (sin migración): la escribe el
 * callback de Bing al guardar el token nuevo. No se usa updatedAt de la
 * integración porque el envío diario del sitemap también lo modifica.
 */
export const BING_RECONNECT_MARK_PREFIX = "bing_reconnected_at:";

export function bingClientChangedAt(env: Record<string, string | undefined> = process.env): Date | null {
  const raw = env.BING_CLIENT_CHANGED_AT?.trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Pura: ¿debe esta conexión volver a conectarse? */
export function bingNeedsReconnect(changedAt: Date | null, reconnectedAt: Date | null): boolean {
  if (!changedAt) return false;
  return !reconnectedAt || reconnectedAt.getTime() < changedAt.getTime();
}

export async function markBingReconnected(integrationId: string, now: Date = new Date()): Promise<void> {
  const key = `${BING_RECONNECT_MARK_PREFIX}${integrationId}`;
  const encryptedValue = encryptSecret(now.toISOString());
  await prisma.systemSetting.upsert({ where: { key }, create: { key, encryptedValue }, update: { encryptedValue } });
}

async function readReconnectedAt(integrationId: string): Promise<Date | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key: `${BING_RECONNECT_MARK_PREFIX}${integrationId}` } });
  if (!row) return null;
  try {
    const date = new Date(decryptSecret(row.encryptedValue));
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/** ¿Esta integración de Bing (ya existente) debe reconectarse por el cambio de cliente? */
export async function integrationNeedsBingReconnect(integrationId: string | null | undefined): Promise<boolean> {
  const changedAt = bingClientChangedAt();
  if (!integrationId || !changedAt) return false;
  return bingNeedsReconnect(changedAt, await readReconnectedAt(integrationId));
}

export { BING_RECONNECT_MESSAGE_TEXT as BING_RECONNECT_MESSAGE } from "./bing-client-change-text";
