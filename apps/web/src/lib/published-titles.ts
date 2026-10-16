import { prisma } from "@auto-articulos/db";
import { findPublishedTitleMatch } from "@auto-articulos/shared";

// Artículos ya publicados con enlace real de una cuenta (opcionalmente solo
// de un sitio). Base de la guardia anti-canibalización al proponer y al
// encolar publicaciones; el worker repite la misma comprobación justo antes
// de gastar generación. Coincidencia exacta normalizada, ver
// packages/shared/src/published-title.ts.
export async function loadPublishedTitles(userId: string, siteDomain?: string | null) {
  return prisma.title.findMany({
    where: {
      status: "success",
      articleUrl: { not: null },
      run: {
        userId,
        ...(siteDomain ? { category: { siteDomain } } : {}),
      },
    },
    select: { text: true, finalTitle: true, articleUrl: true },
  });
}

export function splitAlreadyPublished(
  texts: string[],
  published: Awaited<ReturnType<typeof loadPublishedTitles>>,
) {
  const fresh: string[] = [];
  const repeated: { text: string; articleUrl: string }[] = [];
  const seen = new Set<string>();
  for (const text of texts) {
    const match = findPublishedTitleMatch(text, published);
    if (match?.articleUrl) {
      repeated.push({ text, articleUrl: match.articleUrl });
      continue;
    }
    // El mismo tema escrito dos veces en el mismo lote tampoco se publica dos veces.
    const key = text.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(text);
  }
  return { fresh, repeated };
}
