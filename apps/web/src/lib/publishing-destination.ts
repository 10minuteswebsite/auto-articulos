/**
 * Volver a publicar en el sitio de 10minutesWebsite cuando el destino actual es el BLOG IA.
 * El destino BLOG solo lo elige el cliente en BLOG IA (con consentimiento); este es el camino de vuelta, desde Artículos.
 */
export class DestinationError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message);
  }
}

interface Db {
  user: {
    findUnique(args: { where: { id: string }; select: { publishMethod: true } }): Promise<{ publishMethod: string } | null>;
    updateMany(args: { where: { id: string; publishMethod: string }; data: { publishMethod: string } }): Promise<{ count: number }>;
  };
  blogIaBlog?: { findUnique(args: { where: { userId: string }; select: { status: true; dnsVerified: true; tlsReady: true } }): Promise<{ status: string; dnsVerified: boolean; tlsReady: boolean } | null> };
  run: { count(args: { where: { userId: string; status: { in: string[] } } }): Promise<number> };
}

export async function switchToWebsite(db: Db, userId: string, hasWebsiteCredential: boolean): Promise<{ changed: boolean; method: string }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { publishMethod: true } });
  if (!user) throw new DestinationError("no_user", 404, "No encontramos tu cuenta.");
  if (user.publishMethod !== "BLOG") return { changed: false, method: user.publishMethod }; // ya no está en BLOG: nada que hacer
  if (!hasWebsiteCredential) {
    throw new DestinationError("website_not_connected", 409, "Todavía no conectaste tu sitio de 10minutesWebsite. Conéctalo primero en Configuración y luego vuelve a intentarlo.");
  }
  // Las propuestas y artículos pendientes pueden cambiar de destino: el
  // destino se resuelve al publicar. Solo se protege una publicación que ya
  // está ejecutándose para no partirla entre dos destinos.
  if ((await db.run.count({ where: { userId, status: { in: ["running"] } } })) > 0) {
    throw new DestinationError("runs_in_progress", 409, "Tienes publicaciones en curso. Espera a que terminen y vuelve a intentarlo.");
  }
  const result = await db.user.updateMany({ where: { id: userId, publishMethod: "BLOG" }, data: { publishMethod: "BROWSER" } });
  return { changed: result.count === 1, method: "BROWSER" };
}

/**
 * Camino contrario: el cliente ya tiene su blog vinculado por el Hub («Usar este blog» en BLOG IA) y lo confirma desde Artículos.
 * No crea ni inventa un blog: solo cambia `publishMethod` si el blog existente está activo y con HTTPS.
 */
export async function switchToBlog(db: Db, userId: string): Promise<{ changed: boolean; method: string }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { publishMethod: true } });
  if (!user) throw new DestinationError("no_user", 404, "No encontramos tu cuenta.");
  if (user.publishMethod === "BLOG") return { changed: false, method: "BLOG" };
  if (user.publishMethod !== "BROWSER") throw new DestinationError("method_not_supported", 409, "Tu cuenta publica por otra vía. Escríbenos para cambiarla.");
  const blog = await db.blogIaBlog?.findUnique({ where: { userId }, select: { status: true, dnsVerified: true, tlsReady: true } });
  if (!blog || blog.status !== "active" || !blog.dnsVerified || !blog.tlsReady) {
    throw new DestinationError("blog_not_ready", 409, "Tu blog todavía no está listo. Termina de crearlo en BLOG IA y pulsa «Usar este blog para mis artículos».");
  }
  if ((await db.run.count({ where: { userId, status: { in: ["running"] } } })) > 0) {
    throw new DestinationError("runs_in_progress", 409, "Tienes publicaciones en curso. Espera a que terminen y vuelve a intentarlo.");
  }
  const result = await db.user.updateMany({ where: { id: userId, publishMethod: "BROWSER" }, data: { publishMethod: "BLOG" } });
  return { changed: result.count === 1, method: "BLOG" };
}
