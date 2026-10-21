import { prisma } from "@auto-articulos/db";
import { findPublishedTitleMatch } from "@auto-articulos/shared";

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
  return findPublishedTitleMatch(params.text, published);
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
