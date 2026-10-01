/*
 * DERECHOS POR PRODUCTO — núcleo puro (sin base de datos).
 *
 * Vive en packages/shared a propósito: lo usan LA WEB (layout y APIs) y EL
 * WORKER (comprobar el derecho antes de cada publicación) con la MISMA regla.
 * No importa Prisma ni nada de la web.
 *
 * Proyecto «SEPARACION DE SEO TOTAL» (Lote 1). SEO Total se separa de cara al
 * cliente en dos productos: SEO Total Artículos y SEO Total Redes. Este
 * archivo decide, a partir de datos ya leídos, si una cuenta tiene derecho a
 * un producto. No importa Prisma a propósito: así se prueba entero con una
 * matriz de casos y no puede romperse por la base de datos.
 *
 * Especificación: FASE_0_SEPARACION_SEO_TOTAL_PARTE_A_CLAUDE.md §2.2.
 *
 * Reglas que NO se pueden perder (cada una tiene su prueba):
 *  1. Los administradores siempre pasan.
 *  2. SIN FILA = comportamiento de hoy. Nadie queda bloqueado por no tener
 *     fila (usuarios creados después de la migración, filas que falten).
 *  3. La gracia vencida se evalúa AL LEER; no depende de ninguna tarea.
 *  4. Redes, además del derecho, exige la regla de acceso que ya existía
 *     (interruptor maestro + al menos una red aprobada): el derecho se SUMA a
 *     lo que había, no lo reemplaza.
 */

export const PRODUCTS = ["ARTICULOS", "REDES"] as const;
export type ProductKey = (typeof PRODUCTS)[number];

export type EntitlementStatusKey = "ACTIVE" | "GRACE" | "INACTIVE";

export type AccessReason =
  | "ADMIN"
  | "ACTIVE"
  | "GRACE"
  | "NO_RECORD_LEGACY"
  | "GRACE_EXPIRED"
  | "INACTIVE"
  | "NO_NETWORK_APPROVED";

/** Lo mínimo de una fila de ProductEntitlement que necesita la decisión. */
export interface EntitlementRecord {
  status: EntitlementStatusKey;
  graceUntil: Date | null;
}

export interface ProductAccess {
  allowed: boolean;
  reason: AccessReason;
  status: EntitlementStatusKey | null;
  graceUntil: Date | null;
  /** Días que quedan de gracia (para el aviso); null si no está en gracia vigente. */
  graceDaysLeft: number | null;
}

export interface EvaluateInput {
  role?: string | null;
  product: ProductKey;
  /** Fila del usuario para ese producto, o null si no existe. */
  entitlement: EntitlementRecord | null;
  /**
   * Regla de acceso a Redes que ya existía antes de este proyecto
   * (hasSocialModuleAccess: interruptor maestro + redes aprobadas). Solo se
   * usa para el producto REDES.
   */
  legacyAllowsRedes: boolean;
  now: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function result(
  allowed: boolean,
  reason: AccessReason,
  entitlement: EntitlementRecord | null,
  graceDaysLeft: number | null = null,
): ProductAccess {
  return {
    allowed,
    reason,
    status: entitlement?.status ?? null,
    graceUntil: entitlement?.graceUntil ?? null,
    graceDaysLeft,
  };
}

export function evaluateProductAccess(input: EvaluateInput): ProductAccess {
  const { role, product, entitlement, legacyAllowsRedes, now } = input;

  // 1) Soporte: un administrador nunca queda fuera de ningún producto.
  if (role === "admin") return result(true, "ADMIN", entitlement);

  // 2) Sin fila = comportamiento de hoy.
  if (!entitlement) {
    if (product === "ARTICULOS") return result(true, "NO_RECORD_LEGACY", null);
    return legacyAllowsRedes
      ? result(true, "NO_RECORD_LEGACY", null)
      : result(false, "NO_NETWORK_APPROVED", null);
  }

  // 3) Estado del derecho.
  let base: ProductAccess;
  if (entitlement.status === "ACTIVE") {
    base = result(true, "ACTIVE", entitlement);
  } else if (entitlement.status === "GRACE") {
    // Una gracia sin fecha es un dato incoherente (la base lo impide con un
    // CHECK): se trata como vencida, nunca como concedida para siempre.
    const until = entitlement.graceUntil;
    if (until && until.getTime() > now.getTime()) {
      const left = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / DAY_MS));
      base = result(true, "GRACE", entitlement, left);
    } else {
      base = result(false, "GRACE_EXPIRED", entitlement);
    }
  } else {
    base = result(false, "INACTIVE", entitlement);
  }
  if (!base.allowed) return base;

  // 4) Redes: el derecho se suma a la regla que ya existía.
  if (product === "REDES" && !legacyAllowsRedes) {
    return result(false, "NO_NETWORK_APPROVED", entitlement);
  }
  return base;
}
