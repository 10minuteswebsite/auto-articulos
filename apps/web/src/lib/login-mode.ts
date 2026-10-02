import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { LOGIN_MODE_KEY, parseLoginMode, type LoginMode } from "./login-policy";

/*
 * Lectura/escritura del modo de login (ver login-policy.ts). Mismo patrón que
 * product-enforcement.ts: valor cifrado en SystemSetting, caché corta en
 * memoria, y cualquier error leyendo = «legacy» (nunca deja a nadie fuera).
 */
const TTL_MS = 30_000;
let cached: { mode: LoginMode; at: number } | null = null;

export async function getLoginMode(): Promise<LoginMode> {
  const t = Date.now();
  if (cached && t - cached.at < TTL_MS) return cached.mode;
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: LOGIN_MODE_KEY } });
    let raw = "";
    if (setting?.encryptedValue) {
      try {
        raw = decryptSecret(setting.encryptedValue);
      } catch {
        raw = setting.encryptedValue;
      }
    }
    const mode = parseLoginMode(raw.trim());
    cached = { mode, at: t };
    return mode;
  } catch (error) {
    console.error("[login-mode] No se pudo leer el modo; se usa «legacy»:", error);
    return "legacy";
  }
}

export async function setLoginMode(mode: LoginMode): Promise<void> {
  const encryptedValue = encryptSecret(mode);
  await prisma.systemSetting.upsert({
    where: { key: LOGIN_MODE_KEY },
    create: { key: LOGIN_MODE_KEY, encryptedValue },
    update: { encryptedValue },
  });
  cached = { mode, at: Date.now() };
}
