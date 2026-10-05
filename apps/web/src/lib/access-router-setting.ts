import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";

/*
 * Interruptor del «router de acceso» (Día Cero): cuando está ENCENDIDO, quien entra
 * por una dirección que no le corresponde se redirige a la suya (o a la plataforma
 * de facturación si no tiene ninguna). Por defecto APAGADO = todo como hoy.
 * Un error leyendo el interruptor = apagado: un fallo técnico nunca redirige a nadie.
 */
export const ACCESS_ROUTER_KEY = "access_router_enabled";
const TTL_MS = 30_000;
let cached: { enabled: boolean; at: number } | null = null;

export async function getAccessRouterEnabled(): Promise<boolean> {
  const t = Date.now();
  if (cached && t - cached.at < TTL_MS) return cached.enabled;
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: ACCESS_ROUTER_KEY } });
    let enabled = false;
    if (setting?.encryptedValue) {
      let raw = setting.encryptedValue;
      try {
        raw = decryptSecret(setting.encryptedValue);
      } catch {
        // valor sin cifrar: se usa tal cual
      }
      enabled = raw.trim() === "true";
    }
    cached = { enabled, at: t };
    return enabled;
  } catch (error) {
    console.error("[access-router] No se pudo leer el interruptor; se usa «apagado»:", error);
    return false;
  }
}

export async function setAccessRouterEnabled(enabled: boolean): Promise<void> {
  const encryptedValue = encryptSecret(String(enabled));
  await prisma.systemSetting.upsert({
    where: { key: ACCESS_ROUTER_KEY },
    create: { key: ACCESS_ROUTER_KEY, encryptedValue },
    update: { encryptedValue },
  });
  cached = { enabled, at: Date.now() };
}
