import { prisma } from "@auto-articulos/db";
import { findPublishedTitleMatch, normalizeTitleKey } from "@auto-articulos/shared";

/**
 * Anti-canibalización al publicar: antes de abrir el sitio, generar texto con
 * OpenAI o gastar una imagen, revisa si este MISMO tema ya figura como
 * publicado en el sitio de la cuenta. Coincidencia exacta normalizada (ver
 * packages/shared/src/published-title.ts); nunca por similitud difusa.
 */
export async function findAlreadyPublishedForTitle(params: {
  userId: string;
  siteDomain: string | null;
  titleId: string;
  text: string;
}) {
  const published = await prisma.title.findMany({
    where: {
      id: { not: params.titleId },
      status: "success",
      articleUrl: { not: null },
      run: {
        userId: params.userId,
        ...(params.siteDomain ? { category: { siteDomain: params.siteDomain } } : {}),
      },
    },
    orderBy: { publishedAt: "desc" },
    select: {
      text: true,
      finalTitle: true,
      articleUrl: true,
      publishedAt: true,
    },
  });
  const siteTitles = await prisma.siteArticleTitle.findMany({
    where: { userId: params.userId, ...(params.siteDomain ? { siteDomain: params.siteDomain } : {}) },
    select: { title: true, url: true },
  });
  return findPublishedTitleMatch(params.text, [
    ...published,
    ...siteTitles.map((row) => ({ text: row.title, finalTitle: null as string | null, articleUrl: row.url as string | null, publishedAt: null })),
  ]);
}

/**
 * Aditivo: cada artículo que la plataforma publica deja su título en
 * SiteArticleTitle (solo el título y el enlace). Nunca rompe la publicación.
 */
export async function recordPublishedSiteTitle(params: {
  userId: string;
  siteDomain: string | null;
  title: string;
  url: string;
}): Promise<void> {
  const titleKey = normalizeTitleKey(params.title);
  if (!titleKey) return;
  try {
    await prisma.siteArticleTitle.createMany({
      data: [{ userId: params.userId, siteDomain: params.siteDomain ?? "", title: params.title, titleKey, url: params.url, source: "published" }],
      skipDuplicates: true,
    });
  } catch (err) {
    console.error("recordPublishedSiteTitle falló (se ignora):", err);
  }
}

/**
 * Quita de Oportunidades el tema que ya quedó publicado (o que se descubrió
 * ya publicado), igual que las rutas web de ejecución: si el grupo se queda
 * sin títulos, también se elimina el grupo.
 */
export async function removePublishedOpportunity(params: {
  userId: string;
  categoryId: string;
  text: string;
}) {
  await prisma.$transaction(async (tx) => {
    const group = await tx.opportunityGroup.findUnique({
      where: {
        userId_categoryId: { userId: params.userId, categoryId: params.categoryId },
      },
      select: { id: true },
    });
    if (!group) return;
    await tx.opportunityTitle.deleteMany({
      where: { groupId: group.id, text: params.text },
    });
    const remaining = await tx.opportunityTitle.count({ where: { groupId: group.id } });
    if (remaining === 0) {
      await tx.opportunityGroup.delete({ where: { id: group.id } });
    }
  });
}
