import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";
import type { ProductAccess } from "@auto-articulos/shared";

/*
 * INTERRUPTOR DE APLICACIÓN DE DERECHOS (red de seguridad del proyecto
 * «SEPARACION DE SEO TOTAL», Parte A §2.3).
 *
 *  - off     (por defecto): ninguna comprobación bloquea; todo funciona como hoy.
 *  - shadow: se evalúa todo y se REGISTRA lo que habría bloqueado, sin bloquear.
 *  - enforce: bloquea de verdad.
 *
 * Así el código de derechos puede subir a producción «apagado», se revisan
 * los registros contra la lista real de usuarios, y solo entonces se enciende.
 * Volver atrás es cambiar el valor. Cualquier error leyendo el interruptor se
 * trata como «off»: un fallo técnico NUNCA bloquea a nadie.
 */
export type EnforcementMode = "off" | "shadow" | "enforce";

export const PRODUCT_ENFORCEMENT_KEY = "product_enforcement";

export function parseEnforcementMode(raw: unknown): EnforcementMode {
  return raw === "shadow" || raw === "enforce" ? raw : "off";
}

/** Lee el modo guardado. Mismo patrón que global_disabled_modules (modules.ts). */
export async function getEnforcementMode(): Promise<EnforcementMode> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: PRODUCT_ENFORCEMENT_KEY },
    });
    if (!setting?.encryptedValue) return "off";
    let raw = "";
    try {
      raw = decryptSecret(setting.encryptedValue);
    } catch {
      raw = setting.encryptedValue;
    }
    return parseEnforcementMode(raw.trim());
  } catch (error) {
    console.error("[product-enforcement] No se pudo leer el modo; se usa «off»:", error);
    return "off";
  }
}

export async function setEnforcementMode(mode: EnforcementMode): Promise<void> {
  const encryptedValue = encryptSecret(mode);
  await prisma.systemSetting.upsert({
    where: { key: PRODUCT_ENFORCEMENT_KEY },
    create: { key: PRODUCT_ENFORCEMENT_KEY, encryptedValue },
    update: { encryptedValue },
  });
}

export interface EnforcementDecision {
  /** true solo si hay que bloquear de verdad (modo enforce y sin derecho). */
  block: boolean;
  /** true si habría bloqueado (modo shadow o enforce y sin derecho): para registrar. */
  wouldDeny: boolean;
}

/** Pura: combina el modo con el resultado de la evaluación. */
export function decideEnforcement(mode: EnforcementMode, access: ProductAccess): EnforcementDecision {
  const wouldDeny = !access.allowed;
  return { block: mode === "enforce" && wouldDeny, wouldDeny: mode !== "off" && wouldDeny };
}
