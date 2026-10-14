import { prisma } from "@auto-articulos/db";
import { isValidTimeZone, startOfSocialDay, startOfSocialMonth } from "@auto-articulos/shared";

/**
 * Artículos publicados hoy y este mes por un usuario. ÚNICO lugar donde se cuenta para los cupos de
 * artículos (Publicar, Oportunidades y el panel): el día y el mes cortan a medianoche en la zona
 * horaria que la persona declaró en Configuración → Cuenta; sin ella, en hora de Florida.
 * Antes cada ruta lo calculaba por su cuenta con la hora del servidor (UTC) y quien publicaba de noche en América veía el cupo del día siguiente ya gastado.
 */
export async function countPublishedArticles(userId: string, now: Date = new Date()) {
  const account = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
  const declared = account?.timeZone;
  const timeZone = isValidTimeZone(declared) ? declared : undefined;
  const where = { run: { userId }, status: "success" as const };
  const [today, month] = await Promise.all([
    prisma.title.count({ where: { ...where, processedAt: { gte: startOfSocialDay(now, timeZone) } } }),
    prisma.title.count({ where: { ...where, processedAt: { gte: startOfSocialMonth(now, timeZone) } } }),
  ]);
  return { today, month };
}
