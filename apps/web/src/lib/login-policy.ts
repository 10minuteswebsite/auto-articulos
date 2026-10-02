/*
 * POLÍTICA DE LOGIN CON CONTRASEÑA (proyecto «SEPARACION DE SEO TOTAL»).
 *
 * Decisión de Milton (2026-10-02): cuando el HUB tome el control, los usuarios
 * normales entran SOLO por el HUB (código por correo o Google); los
 * administradores y el soporte conservan una «puerta directa» con contraseña
 * para poder dar soporte y usar «Acceder como», aunque el HUB esté caído.
 *
 *  - legacy (por defecto): todo funciona exactamente como hoy. Nada cambia.
 *  - hub: el login con contraseña solo deja pasar a administradores, y se
 *    aplica un límite de intentos (los usuarios normales reciben «Entra por el HUB»).
 *
 * El modo es un interruptor reversible (SystemSetting `login_mode`); un error al
 * leerlo se trata como «legacy»: un fallo técnico NUNCA deja a nadie fuera.
 * Este archivo es lógica pura (sin base de datos) para poder probarla.
 */
export type LoginMode = "legacy" | "hub";

export const LOGIN_MODE_KEY = "login_mode";

export function parseLoginMode(raw: unknown): LoginMode {
  return raw === "hub" ? "hub" : "legacy";
}

export type PasswordLoginDecision = { allow: true } | { allow: false; reason: "USE_HUB" };

/** ¿Puede esta cuenta abrir sesión con contraseña en el modo actual? */
export function decidePasswordLogin(input: { mode: LoginMode; role?: string | null }): PasswordLoginDecision {
  if (input.mode === "legacy") return { allow: true };
  return input.role === "admin" ? { allow: true } : { allow: false, reason: "USE_HUB" };
}

/** Para pasar a «hub» hace falta escribir esta palabra; volver a «legacy» es libre. */
export const HUB_LOGIN_CONFIRMATION_WORD = "SOLO HUB";

export function checkLoginModeTransition(input: {
  current: LoginMode;
  next: LoginMode;
  confirmation?: unknown;
}): { ok: true } | { ok: false; error: string } {
  if (input.next === "legacy" || input.next === input.current) return { ok: true };
  if (typeof input.confirmation !== "string" || input.confirmation.trim().toUpperCase() !== HUB_LOGIN_CONFIRMATION_WORD) {
    return { ok: false, error: `Para dejar el login solo por el HUB escribe «${HUB_LOGIN_CONFIRMATION_WORD}».` };
  }
  return { ok: true };
}

/**
 * Límite de intentos fallidos por clave (IP + correo). En memoria de la
 * instancia: en un entorno sin servidor es una barrera parcial (cada instancia
 * cuenta por separado), suficiente contra fuerza bruta casual; el límite real
 * lo da además el costo de bcrypt. El reloj se inyecta para las pruebas.
 */
export function createLoginLimiter(options: { max?: number; windowMs?: number; now?: () => number } = {}) {
  const max = options.max ?? 5;
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const now = options.now ?? Date.now;
  const failures = new Map<string, number[]>();

  const recent = (key: string): number[] => {
    const t = now();
    const list = (failures.get(key) ?? []).filter((at) => t - at < windowMs);
    if (list.length) failures.set(key, list);
    else failures.delete(key);
    return list;
  };

  return {
    /** true si esta clave ya agotó sus intentos. */
    isBlocked(key: string): boolean {
      return recent(key).length >= max;
    },
    recordFailure(key: string): void {
      const list = recent(key);
      list.push(now());
      failures.set(key, list);
    },
    reset(key: string): void {
      failures.delete(key);
    },
  };
}
