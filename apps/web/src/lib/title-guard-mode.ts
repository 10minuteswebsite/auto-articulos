import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";

// Modo de la Guardia de ángulos, guardado en SystemSetting (sin migración).
//   apagado → comportamiento actual, la guardia no corre (defecto)
//   sombra  → calcula y registra lo que decidiría, pero lo que se entrega es EXACTAMENTE lo de hoy
//   activo  → (Fase 3) aplica la decisión. Todavía no se puede activar.
export const TITLE_GUARD_MODE_KEY = "title_guard_mode";
export type TitleGuardMode = "apagado" | "sombra" | "activo";

/** La sombra se apaga SOLA a los 14 días de activarla si nadie la renueva: nunca queda abierta por olvido. */
export const SHADOW_MAX_DAYS = 14;

export function isShadowExpired(updatedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - updatedAt.getTime() > SHADOW_MAX_DAYS * 86_400_000;
}

/** Modos que un administrador puede elegir hoy (activo llega en la Fase 3). */
export const SELECTABLE_MODES: TitleGuardMode[] = ["apagado", "sombra", "activo"];

export const TITLE_GUARD_PERCENT_KEY = "title_guard_percent";

/** Porcentaje (0–100) de solicitudes a las que se aplica la guardia en modo activo. Entero acotado. */
export function parsePercent(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
}

/** Cubeta estable 0–99 de una solicitud: así «el 10 %» son siempre las mismas solicitudes y no depende del azar de cada lectura. */
export function requestBucket(requestId: string): number {
  let h = 2166136261;
  for (let i = 0; i < requestId.length; i++) {
    h ^= requestId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

export function shouldApplyGuard(requestId: string, percent: number): boolean {
  return requestBucket(requestId) < percent;
}

export function parseMode(value: unknown): TitleGuardMode {
  return value === "sombra" || value === "activo" ? value : "apagado";
}

/** Nunca lanza: ante cualquier fallo la guardia queda apagada. Incluye si la sombra venció (se apaga sola a los 14 días). */
export async function getTitleGuardModeInfo(): Promise<{ mode: TitleGuardMode; configured: TitleGuardMode; expiresAt: Date | null }> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: TITLE_GUARD_MODE_KEY } });
    if (!row?.encryptedValue) return { mode: "apagado", configured: "apagado", expiresAt: null };
    let value = row.encryptedValue;
    try {
      value = decryptSecret(value);
    } catch {
      // el modo se guarda en claro: no es un secreto
    }
    const configured = parseMode(value.trim());
    const expiresAt = configured === "sombra" ? new Date(row.updatedAt.getTime() + SHADOW_MAX_DAYS * 86_400_000) : null;
    const expired = configured === "sombra" && isShadowExpired(row.updatedAt);
    return { mode: expired ? "apagado" : configured, configured, expiresAt };
  } catch {
    return { mode: "apagado", configured: "apagado", expiresAt: null };
  }
}

export async function getTitleGuardMode(): Promise<TitleGuardMode> {
  return (await getTitleGuardModeInfo()).mode;
}

export async function setTitleGuardMode(mode: TitleGuardMode): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: TITLE_GUARD_MODE_KEY },
    create: { key: TITLE_GUARD_MODE_KEY, encryptedValue: mode },
    update: { encryptedValue: mode },
  });
}

export async function getTitleGuardPercent(): Promise<number> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: TITLE_GUARD_PERCENT_KEY } });
    return row?.encryptedValue ? parsePercent(row.encryptedValue.trim()) : 0;
  } catch {
    return 0;
  }
}

export async function setTitleGuardPercent(percent: number): Promise<void> {
  const value = String(parsePercent(percent));
  await prisma.systemSetting.upsert({
    where: { key: TITLE_GUARD_PERCENT_KEY },
    create: { key: TITLE_GUARD_PERCENT_KEY, encryptedValue: value },
    update: { encryptedValue: value },
  });
}
