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

/**
 * Caché en memoria SOLO DEL MODO (no de los derechos). Cada petición a las APIs
 * protegidas necesita saber el modo; sin caché eso es una consulta a la base por
 * petición aunque el modo sea «off» y casi nunca cambie. Con un tiempo de vida
 * corto el costo desaparece y un cambio del interruptor se nota en segundos.
 *
 * Los DERECHOS de cada usuario NO pasan por aquí: siguen leyéndose en cada
 * petición, porque una revocación debe verse en la siguiente (Parte A §3.4).
 *
 * Un error al leer NO se guarda en la caché (se reintenta en la siguiente
 * petición) y se trata como «off»: un fallo técnico nunca bloquea a nadie.
 */
export const MODE_CACHE_TTL_MS = 30_000;

export function createModeCache(
  read: () => Promise<EnforcementMode>,
  ttlMs: number,
  now: () => number = Date.now,
) {
  let value: { mode: EnforcementMode; at: number } | null = null;
  return {
    async get(): Promise<EnforcementMode> {
      const t = now();
      if (value && t - value.at < ttlMs) return value.mode;
      try {
        const mode = await read();
        value = { mode, at: t };
        return mode;
      } catch (error) {
        console.error("[product-enforcement] No se pudo leer el modo; se usa «off»:", error);
        return "off";
      }
    },
    /** Tras guardar un cambio, esta instancia ve el valor nuevo sin esperar. */
    set(mode: EnforcementMode): void {
      value = { mode, at: now() };
    },
    reset(): void {
      value = null;
    },
  };
}

/** Lee el modo guardado en la base. Mismo patrón que global_disabled_modules (modules.ts). */
async function readModeFromDb(): Promise<EnforcementMode> {
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
}

const modeCache = createModeCache(readModeFromDb, MODE_CACHE_TTL_MS);

export async function getEnforcementMode(): Promise<EnforcementMode> {
  return modeCache.get();
}

export async function setEnforcementMode(mode: EnforcementMode): Promise<void> {
  const encryptedValue = encryptSecret(mode);
  await prisma.systemSetting.upsert({
    where: { key: PRODUCT_ENFORCEMENT_KEY },
    create: { key: PRODUCT_ENFORCEMENT_KEY, encryptedValue },
    update: { encryptedValue },
  });
  modeCache.set(mode);
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
