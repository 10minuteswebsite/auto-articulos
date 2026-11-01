import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";

// Modo de la Guardia de ángulos, guardado en SystemSetting (sin migración).
//   apagado → comportamiento actual, la guardia no corre (defecto)
//   sombra  → calcula y registra lo que decidiría, pero lo que se entrega es EXACTAMENTE lo de hoy
//   activo  → (Fase 3) aplica la decisión. Todavía no se puede activar.
export const TITLE_GUARD_MODE_KEY = "title_guard_mode";
export type TitleGuardMode = "apagado" | "sombra" | "activo";

/** Modos que un administrador puede elegir hoy (activo llega en la Fase 3). */
export const SELECTABLE_MODES: TitleGuardMode[] = ["apagado", "sombra"];

export function parseMode(value: unknown): TitleGuardMode {
  return value === "sombra" || value === "activo" ? value : "apagado";
}

/** Nunca lanza: ante cualquier fallo la guardia queda apagada. */
export async function getTitleGuardMode(): Promise<TitleGuardMode> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: TITLE_GUARD_MODE_KEY } });
    if (!row?.encryptedValue) return "apagado";
    let value = row.encryptedValue;
    try {
      value = decryptSecret(value);
    } catch {
      // el modo se guarda en claro: no es un secreto
    }
    return parseMode(value.trim());
  } catch {
    return "apagado";
  }
}

export async function setTitleGuardMode(mode: TitleGuardMode): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: TITLE_GUARD_MODE_KEY },
    create: { key: TITLE_GUARD_MODE_KEY, encryptedValue: mode },
    update: { encryptedValue: mode },
  });
}
