export const TRIAL_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
export const TRIAL_WHATSAPP_LINK = "https://wa.link/qdwyyy";
export const TRIAL_RULE_SETTING_KEY = "trial_rule_enabled";
export const TRIAL_RULE_ENABLED_DEFAULT = true;

/**
 * true si la cuenta puede usar el sistema ahora mismo. `trialUnlocked` es el
 * check manual del admin — en true por defecto para cualquier usuario
 * existente/creado por admin, así que esta función nunca los bloquea. Solo
 * los registros de "Solicitar prueba" (isTrialSignup=true, trialUnlocked
 * arranca en false) dependen del período de 7 días hasta que el admin los
 * desbloquee.
 */
export function hasTrialAccess(user: {
  role?: string;
  isTrialSignup: boolean;
  trialStartedAt: Date | null;
  trialUnlocked: boolean;
}, trialRuleEnabled = TRIAL_RULE_ENABLED_DEFAULT): boolean {
  // El interruptor apagado conserva acceso total para no bloquear cuentas.
  if (!trialRuleEnabled) return true;
  if (user.role === "admin") return true;
  if (user.trialUnlocked) return true;
  if (!user.isTrialSignup || !user.trialStartedAt) return true;
  return Date.now() - user.trialStartedAt.getTime() < TRIAL_MS;
}

export function trialDaysRemaining(trialStartedAt: Date): number {
  const msLeft = TRIAL_MS - (Date.now() - trialStartedAt.getTime());
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}
