import { prisma } from "@auto-articulos/db";

// «Región confirmada» de una cuenta (columna User.platformDomainConfirmedAt). Se lee y se escribe SOLO
// con SQL directo y a propósito NO está en schema.prisma: una columna declarada en el esquema entra en
// TODAS las consultas de User, y si la base de producción aún no la tiene, el panel entero da 500
// (incidente del 29/10/2026, P2022). Así, si falta la columna, la app sigue funcionando y simplemente no
// pregunta la ubicación (mismo patrón que User.disableIndexing).

/** ¿La cuenta ya tiene la región confirmada? Si la columna no existe o falla la lectura: true (no se pregunta). */
export async function isPlatformDomainConfirmed(userId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ confirmed: boolean }>>`SELECT "platformDomainConfirmedAt" IS NOT NULL AS confirmed FROM "User" WHERE id = ${userId}`;
    return rows[0]?.confirmed ?? true;
  } catch (error) {
    console.warn("[platform-domain] No se pudo leer platformDomainConfirmedAt; se asume confirmada.", error);
    return true;
  }
}

/** Marca la región como confirmada. Silencioso si la columna no existe todavía. */
export async function markPlatformDomainConfirmed(userId: string): Promise<void> {
  try {
    await prisma.$executeRaw`UPDATE "User" SET "platformDomainConfirmedAt" = NOW() WHERE id = ${userId} AND "platformDomainConfirmedAt" IS NULL`;
  } catch (error) {
    console.warn("[platform-domain] No se pudo marcar platformDomainConfirmedAt.", error);
  }
}
