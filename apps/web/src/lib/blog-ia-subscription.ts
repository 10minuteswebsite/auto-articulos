import { prisma } from "@auto-articulos/db";
import { sendBlogIaEvent } from "@auto-articulos/shared";

/**
 * Sincroniza el acceso de Artículos con el estado público del BLOG IA.
 *
 * Es deliberadamente best-effort: el derecho de SEO Total ya quedó guardado
 * en la transacción principal y una caída temporal del blog no debe bloquear
 * Administración. El mismo event_id se reconstruye para que los reintentos
 * sean idempotentes en D1.
 */
export async function syncBlogIaSubscription(
  userId: string,
  allowed: boolean,
  entitlementVersion: number,
  status: string,
): Promise<void> {
  if (status !== "BLOG") return;

  const apiUrl = process.env.BLOG_IA_API_URL;
  const secret = process.env.BLOG_IA_SECRET;
  if (!apiUrl || !secret) {
    console.warn("[blog-ia] No se sincronizó la suscripción: faltan BLOG_IA_API_URL/BLOG_IA_SECRET");
    return;
  }

  const blog = await prisma.blogIaBlog.findUnique({ where: { userId } });
  if (!blog) return;

  // Un blog que la persona desactivó a propósito NO se reabre al renovar el acceso:
  // solo ella lo reactiva desde BLOG IA.
  if (blog.status === "deactivated") return;

  const type = allowed ? "blog.subscription.resume" : "blog.subscription.suspend";
  const eventId = `subscription:${userId}:${entitlementVersion}:${allowed ? "resume" : "suspend"}`;
  try {
    await sendBlogIaEvent({ apiUrl, secret }, {
      eventId,
      type,
      tenantId: blog.tenantId,
      data: { source: "product_entitlement", user_id: userId, version: entitlementVersion },
    });
    // Refleja el estado en el wizard. Solo un blog ya activado puede pasar a
    // «suspended», y solo uno suspendido tras activarse vuelve a «active».
    if (allowed) {
      await prisma.blogIaBlog.updateMany({ where: { userId, status: "suspended", activatedAt: { not: null } }, data: { status: "active" } });
    } else {
      await prisma.blogIaBlog.updateMany({ where: { userId, status: "active" }, data: { status: "suspended" } });
    }
  } catch (error) {
    console.error("[blog-ia] No se pudo sincronizar la suscripción:", error);
  }
}
