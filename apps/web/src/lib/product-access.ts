import { prisma } from "@auto-articulos/db";
import { hasSocialModuleAccess } from "./social-access";
import {
  evaluateProductAccess,
  type ProductAccess,
  type ProductKey,
} from "@auto-articulos/shared";

// La regla pura vive en packages/shared (la comparten la web y el worker).
export { evaluateProductAccess, PRODUCTS } from "@auto-articulos/shared";
export type {
  AccessReason,
  EntitlementRecord,
  EntitlementStatusKey,
  ProductAccess,
  ProductKey,
} from "@auto-articulos/shared";

/*
 * DERECHOS POR PRODUCTO — lectura desde la base de datos.
 *
 * Una sola consulta por llamada. NO hay caché entre peticiones, a propósito:
 * una revocación o una gracia vencida tiene que verse en la siguiente petición
 * (Parte A §3.4). La memoización, si hace falta, es solo dentro de UNA petición.
 *
 * Esta función LANZA si la base falla: la capa que la llama decide qué hacer
 * (la web muestra un error, el worker reintenta). Un fallo técnico nunca debe
 * convertirse en «sin derechos».
 */
export async function hasProductAccess(
  userId: string,
  product: ProductKey,
  now: Date = new Date(),
): Promise<ProductAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      disabledModules: true,
      allowInstagramPublishing: true,
      allowFacebookPublishing: true,
      allowLinkedInPublishing: true,
      allowThreadsPublishing: true,
      allowPinterestPublishing: true,
      allowTumblrPublishing: true,
      allowBlueskyPublishing: true,
      allowBloggerPublishing: true,
      allowGoogleBusinessPublishing: true,
      productEntitlements: {
        where: { product },
        select: { status: true, graceUntil: true },
      },
    },
  });
  // Usuario inexistente: no se inventan derechos.
  if (!user) {
    return { allowed: false, reason: "INACTIVE", status: null, graceUntil: null, graceDaysLeft: null };
  }
  return evaluateProductAccess({
    role: user.role,
    product,
    entitlement: user.productEntitlements[0] ?? null,
    legacyAllowsRedes: hasSocialModuleAccess(user),
    now,
  });
}

/**
 * Resumen de los dos productos para /api/me. A prueba de fallos: si la tabla
 * todavía no existe (migración pendiente) o la consulta falla, devuelve null
 * en vez de tumbar la respuesta. Nueva funcionalidad = nunca rompe lo anterior.
 */
export async function getProductsSummary(
  userId: string,
): Promise<Record<"articulos" | "redes", ProductAccess> | null> {
  try {
    const now = new Date();
    const [articulos, redes] = await Promise.all([
      hasProductAccess(userId, "ARTICULOS", now),
      hasProductAccess(userId, "REDES", now),
    ]);
    return { articulos, redes };
  } catch (error) {
    console.error("[product-access] No se pudo calcular el resumen de productos:", error);
    return null;
  }
}

/**
 * Filas de derechos para una cuenta nueva: Artículos activo, como hoy. Es un
 * intento «de mejor esfuerzo»: si falla, la cuenta queda sin fila y la regla
 * «sin fila = comportamiento actual» le conserva el acceso. Crear una cuenta
 * jamás debe fallar por esto.
 */
export async function ensureDefaultEntitlements(userId: string): Promise<void> {
  try {
    await prisma.productEntitlement.upsert({
      where: { userId_product: { userId, product: "ARTICULOS" } },
      create: {
        userId,
        product: "ARTICULOS",
        status: "ACTIVE",
        source: "LEGACY",
        note: "alta de cuenta",
        updatedBy: "system",
      },
      update: {},
    });
  } catch (error) {
    console.error("[product-access] No se pudieron crear los derechos por defecto:", userId, error);
  }
}
