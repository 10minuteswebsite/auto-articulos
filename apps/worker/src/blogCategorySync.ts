// Categorías de un cliente con destino BLOG IA: el blog no las trae de ningún sitio, nacen en el asistente de BLOG IA.
// Aquí se leen del blog (canal firmado) y se guardan en Category con source="blog" para que salgan en el selector de Publicar.
import { prisma } from "@auto-articulos/db";
import { postBlogIaJson, type BlogIaConfig } from "@auto-articulos/shared";

interface BlogCategory { id: string; slug: string; name: string; description: string }

/** Parte de la base que se usa (inyectable para probar sin base real). */
type Db = Pick<typeof prisma, "blogIaBlog" | "category">;

export async function syncBlogCategories(userId: string, overrides: { config?: Pick<BlogIaConfig, "fetchImpl">; db?: Db } = {}): Promise<number> {
  const db = overrides.db ?? prisma;
  const apiUrl = process.env.BLOG_IA_API_URL;
  const secret = process.env.BLOG_IA_SECRET;
  if (!apiUrl || !secret) throw new Error("BLOG IA no está configurado en el servidor.");
  const blog = await db.blogIaBlog.findUnique({ where: { userId }, select: { tenantId: true } });
  if (!blog?.tenantId) throw new Error("Tu blog todavía no está listo. Termina primero el asistente de BLOG IA.");

  const res = await postBlogIaJson<{ ok: true; categories: BlogCategory[] }>({ apiUrl, secret, ...overrides.config }, "/api/categories/list", { tenant_id: blog.tenantId });

  // Las que el publicador ya creó antes en el blog usan el id de nuestra propia Category: ya están representadas.
  const mine = await db.category.findMany({ where: { userId }, select: { id: true } });
  const known = new Set(mine.map((c) => c.id));
  let added = 0;
  for (const c of res.categories) {
    if (known.has(c.id)) continue;
    await db.category.upsert({
      where: { userId_platform_panel_externalId: { userId, platform: "10minutesWebsite", panel: "", externalId: c.id } },
      create: { userId, platform: "10minutesWebsite", panel: "", externalId: c.id, name: c.name, isSequence: false, source: "blog", siteDomain: "" },
      update: { name: c.name, source: "blog" },
    });
    added++;
  }
  return added;
}
