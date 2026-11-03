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
  run: { count(args: { where: { userId: string; status: { in: string[] } } }): Promise<number> };
}

export async function switchToWebsite(db: Db, userId: string, hasWebsiteCredential: boolean): Promise<{ changed: boolean; method: string }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { publishMethod: true } });
  if (!user) throw new DestinationError("no_user", 404, "No encontramos tu cuenta.");
  if (user.publishMethod !== "BLOG") return { changed: false, method: user.publishMethod }; // ya no está en BLOG: nada que hacer
  if (!hasWebsiteCredential) {
    throw new DestinationError("website_not_connected", 409, "Todavía no conectaste tu sitio de 10minutesWebsite. Conéctalo primero en Configuración y luego vuelve a intentarlo.");
  }
  // Cambiar el destino a mitad de un lote mandaría el resto de los títulos a otro sitio.
  if ((await db.run.count({ where: { userId, status: { in: ["pending", "running"] } } })) > 0) {
    throw new DestinationError("runs_in_progress", 409, "Tienes publicaciones en curso. Espera a que terminen y vuelve a intentarlo.");
  }
  const result = await db.user.updateMany({ where: { id: userId, publishMethod: "BLOG" }, data: { publishMethod: "BROWSER" } });
  return { changed: result.count === 1, method: "BROWSER" };
}
