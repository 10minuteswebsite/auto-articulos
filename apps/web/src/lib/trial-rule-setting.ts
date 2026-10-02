import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import { TRIAL_RULE_ENABLED_DEFAULT, TRIAL_RULE_SETTING_KEY } from "./trial";

/** Lee el interruptor sin migración: la ausencia conserva el valor seguro true. */
export async function getTrialRuleEnabled(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: TRIAL_RULE_SETTING_KEY } });
  if (!setting?.encryptedValue) return TRIAL_RULE_ENABLED_DEFAULT;
  try {
    return decryptSecret(setting.encryptedValue) !== "false";
  } catch {
    return setting.encryptedValue !== "false";
  }
}

/** Persiste explícitamente el interruptor; no cambia ningún dato de usuarios. */
export async function setTrialRuleEnabled(enabled: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: TRIAL_RULE_SETTING_KEY },
    create: { key: TRIAL_RULE_SETTING_KEY, encryptedValue: encryptSecret(String(enabled)) },
    update: { encryptedValue: encryptSecret(String(enabled)) },
  });
}
