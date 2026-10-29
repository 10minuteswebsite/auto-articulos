import { prisma } from "@auto-articulos/db";
import { findPublishedTitleMatch, readSitemapTitles } from "@auto-articulos/shared";

// Artículos ya publicados con enlace real de una cuenta (opcionalmente solo
// de un sitio). Base de la guardia anti-canibalización al proponer y al
// encolar publicaciones; el worker repite la misma comprobación justo antes
// de gastar generación. Coincidencia exacta normalizada, ver
// packages/shared/src/published-title.ts.
export async function loadPublishedTitles(userId: string, siteDomain?: string | null) {
  const [published, siteTitles] = await Promise.all([
    prisma.title.findMany({
      where: {
        status: "success",
        articleUrl: { not: null },
        run: {
          userId,
          ...(siteDomain ? { category: { siteDomain } } : {}),
        },
      },
      select: { text: true, finalTitle: true, articleUrl: true },
    }),
    // Títulos guardados en Supabase (sitemap + publicados): la guardia ya no
    // necesita salir a 10minutesWebsite para saber qué existe.
    prisma.siteArticleTitle.findMany({
      where: { userId, ...(siteDomain ? { siteDomain } : {}) },
      select: { title: true, url: true },
    }),
  ]);
  return [
    ...published,
    ...siteTitles.map((row) => ({ text: row.title, finalTitle: null as string | null, articleUrl: row.url as string | null })),
  ];
}

const SEED_RETRY_AFTER_MS = 6 * 60 * 60 * 1000;

/**
 * Llenado INICIAL de SiteArticleTitle desde el sitemap del sitio: una sola vez
 * por usuario y sitio (queda marcado en SiteTitleSeed). Sin sitemap no hace
 * nada y no marca, para que se llene cuando el usuario lo conecte. Nunca lanza:
 * un fallo aquí no debe romper el análisis que lo invoca.
 */
export async function ensureSiteTitlesSeeded(userId: string, siteDomain: string | null | undefined): Promise<void> {
  const domain = siteDomain ?? "";
  try {
    const seed = await prisma.siteTitleSeed.findUnique({ where: { userId_siteDomain: { userId, siteDomain: domain } } });
    if (seed?.status === "done") return;
    if (seed?.status === "error" && Date.now() - seed.updatedAt.getTime() < SEED_RETRY_AFTER_MS) return;

    const [own, composio] = await Promise.all([
      prisma.searchIntegration.findFirst({
        where: { userId, provider: "google", ...(domain ? { siteDomain: domain } : {}), sitemapUrl: { not: null } },
        select: { sitemapUrl: true },
      }),
      prisma.composioConnection.findFirst({
        where: { userId, ...(domain ? { siteDomain: domain } : {}), sitemapUrl: { not: null } },
        select: { sitemapUrl: true },
      }),
    ]);
    const sitemapUrl = own?.sitemapUrl || composio?.sitemapUrl || null;
    if (!sitemapUrl) return;

    try {
      const titles = await readSitemapTitles(sitemapUrl);
      if (titles.length > 0) {
        await prisma.siteArticleTitle.createMany({
          data: titles.map((t) => ({ userId, siteDomain: domain, title: t.title, titleKey: t.titleKey, url: t.url, source: "sitemap" })),
          skipDuplicates: true,
        });
      }
      await prisma.siteTitleSeed.upsert({
        where: { userId_siteDomain: { userId, siteDomain: domain } },
        create: { userId, siteDomain: domain, status: "done", titlesFound: titles.length, sitemapUrl },
        update: { status: "done", titlesFound: titles.length, sitemapUrl, errorMessage: null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.siteTitleSeed.upsert({
        where: { userId_siteDomain: { userId, siteDomain: domain } },
        create: { userId, siteDomain: domain, status: "error", sitemapUrl, errorMessage: message.slice(0, 500) },
        update: { status: "error", sitemapUrl, errorMessage: message.slice(0, 500) },
      });
    }
  } catch (err) {
    console.error("ensureSiteTitlesSeeded falló (se ignora):", err);
  }
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
