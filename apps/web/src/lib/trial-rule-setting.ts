import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { TRIAL_RULE_ENABLED_DEFAULT, TRIAL_RULE_SETTING_KEY, hasTrialAccess } from "./trial";

const TTL_MS = 30_000;
let cached: { enabled: boolean; at: number } | null = null;

/**
 * Lee el interruptor sin migración: la ausencia conserva el valor seguro true
 * (la regla de hoy). Caché de 30 s; un error leyendo = regla encendida, es
 * decir, EXACTAMENTE el comportamiento de antes (nunca bloquea de más).
 */
export async function getTrialRuleEnabled(): Promise<boolean> {
  const t = Date.now();
  if (cached && t - cached.at < TTL_MS) return cached.enabled;
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: TRIAL_RULE_SETTING_KEY } });
    let enabled = TRIAL_RULE_ENABLED_DEFAULT;
    if (setting?.encryptedValue) {
      try {
        enabled = decryptSecret(setting.encryptedValue) !== "false";
      } catch {
        enabled = setting.encryptedValue !== "false";
      }
    }
    cached = { enabled, at: t };
    return enabled;
  } catch (error) {
    console.error("[trial-rule] No se pudo leer el interruptor; se usa la regla actual:", error);
    return TRIAL_RULE_ENABLED_DEFAULT;
  }
}

/** Como hasTrialAccess, pero respetando el interruptor (desde el Día Cero los 7 días de prueba se eliminan). */
export async function checkTrialAccess(user: Parameters<typeof hasTrialAccess>[0]): Promise<boolean> {
  return hasTrialAccess(user, await getTrialRuleEnabled());
}

/** Persiste explícitamente el interruptor; no cambia ningún dato de usuarios. */
export async function setTrialRuleEnabled(enabled: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: TRIAL_RULE_SETTING_KEY },
    create: { key: TRIAL_RULE_SETTING_KEY, encryptedValue: encryptSecret(String(enabled)) },
    update: { encryptedValue: encryptSecret(String(enabled)) },
  });
  cached = { enabled, at: Date.now() };
}
