import type { ProductScope } from "./product-routes";

/*
 * PUERTA VISUAL DE ACCESO POR PRODUCTO (proyecto «SEPARACION DE SEO TOTAL»,
 * flujos F5 y F6 de la Parte A). Lógica PURA, sin servidor, para probarla entera.
 *
 * IMPORTANTE: esto es solo EXPERIENCIA DE USUARIO. La barrera de verdad está en
 * el servidor (las APIs y el worker). Esta puerta solo evita que alguien sin
 * derecho vea una pantalla vacía o rota, y le explica por qué.
 *
 * Reglas de seguridad (cada una con su prueba):
 *  - Solo bloquea con el interruptor en «enforce». En «off» y «shadow» NO hace
 *    nada: el comportamiento de hoy se conserva.
 *  - Solo bloquea pantallas propias de un producto. Las compartidas
 *    (inicio, configuración, historial…) y las de administración nunca.
 *  - Ante la duda (datos ausentes o con error) NO bloquea.
 */

export type EnforcementModeKey = "off" | "shadow" | "enforce";

/** Lo que /api/me entrega por producto (fechas como texto ISO). */
export interface ProductAccessInfo {
  allowed: boolean;
  reason: string;
  graceUntil?: string | null;
  graceDaysLeft?: number | null;
}

export interface ProductsInfo {
  articulos?: ProductAccessInfo | null;
  redes?: ProductAccessInfo | null;
}

/**
 * Motivos por los que la puerta tapa la pantalla: el acceso al producto ya no
 * existe (nunca activado o gracia vencida). «NO_NETWORK_APPROVED» NO está
 * aquí a propósito: la ausencia de redes aprobadas no revoca el acceso al
 * producto; solo limita las funciones de publicación.
 */
export const GATE_BLOCK_REASONS: readonly string[] = ["INACTIVE", "GRACE_EXPIRED"];

export type GateResult =
  | { block: false }
  | { block: true; product: "ARTICULOS" | "REDES"; reason: string };

/** ¿Debe tapar esta pantalla con el aviso de «acceso no disponible»? */
export function evaluatePageGate(input: {
  mode: EnforcementModeKey | string | null | undefined;
  scope: ProductScope;
  products: ProductsInfo | null | undefined;
}): GateResult {
  if (input.mode !== "enforce") return { block: false };
  if (input.scope !== "ARTICULOS" && input.scope !== "REDES") return { block: false };
  const info = input.scope === "ARTICULOS" ? input.products?.articulos : input.products?.redes;
  if (!info) return { block: false };
  if (info.allowed !== false) return { block: false };
  if (!GATE_BLOCK_REASONS.includes(info.reason)) return { block: false };
  return { block: true, product: input.scope, reason: info.reason };
}

export interface GraceNotice {
  product: "ARTICULOS" | "REDES";
  daysLeft: number;
  until: string | null;
}

/** Cuántos días antes del fin de la gracia empieza a avisarse. */
export const GRACE_NOTICE_DAYS = 5;

/**
 * Avisos de «tu acceso gratuito termina el [fecha]». Solo con el interruptor en
 * «shadow» o «enforce» (con «off» todavía no se aplica nada, así que avisar
 * sería confundir) y solo mientras la gracia siga vigente.
 */
export function graceNotices(input: {
  mode: EnforcementModeKey | string | null | undefined;
  products: ProductsInfo | null | undefined;
}): GraceNotice[] {
  if (input.mode !== "shadow" && input.mode !== "enforce") return [];
  const out: GraceNotice[] = [];
  const entries: Array<["ARTICULOS" | "REDES", ProductAccessInfo | null | undefined]> = [
    ["ARTICULOS", input.products?.articulos],
    ["REDES", input.products?.redes],
  ];
  for (const [product, info] of entries) {
    if (!info || info.allowed !== true || info.reason !== "GRACE") continue;
    const days = info.graceDaysLeft;
    if (typeof days !== "number" || days < 1 || days > GRACE_NOTICE_DAYS) continue;
    out.push({ product, daysLeft: days, until: info.graceUntil ?? null });
  }
  return out;
}
