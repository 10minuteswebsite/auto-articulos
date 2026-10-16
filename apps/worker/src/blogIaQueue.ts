// Cola de trabajo para cuentas que publican en BLOG IA (2026-10-16).
//
// Separada de `queue.ts` a propósito (mismo criterio que `mcpQueue.ts`): ese
// archivo corre en producción para TODAS las cuentas y el Protocolo de No
// Destrucción pide cambios mínimos. Solo se llega aquí cuando
// `User.publishMethod === "BLOG"`; ninguna cuenta existente lo tiene.
//
// Decisión de Milton (2026-10-16): con BLOG IA activo el artículo se publica
// SOLO en el blog, no en 10minutesWebsite.
//
// Configuración (variables del worker, no por usuario):
//   BLOG_IA_API_URL  origen de la API de ingestión (https://api.blog.…)
//   BLOG_IA_SECRET   secreto compartido de firma
//
// Pendiente de decidir con Milton: qué prompt usar si la cuenta no tiene
// ninguno (aquí no existe el flujo "estándar" de 10minutesWebsite). Mientras
// tanto se usa DEFAULT_BLOG_PROMPT.
//
// No se envía aviso a Google/Bing con `notifyGoogle`/`notifyBing`: están
// pensados para el sitio de 10minutesWebsite. La indexación del subdominio
// depende de Search Console (blueprint §9.6) y se resuelve aparte.

import { prisma, Prisma } from "@auto-articulos/db";
import { MAX_ATTEMPTS, sendBlogIaEvent } from "@auto-articulos/shared";
import { createBlogIaPublisher, BlogIaPublishError } from "./automation/blogIaPublisher";
import { markTitleError, restoreUnfinishedTitlesToOpportunities } from "./queue";

type RunForBlog = Prisma.RunGetPayload<{
  include: {
    category: true;
    prompt: true;
    user: {
      select: {
        contentLanguage: true;
        name: true;
        firstName: true;
        lastName: true;
        publishMethod: true;
      };
    };
  };
}>;

type TitleForBlog = NonNullable<Awaited<ReturnType<typeof prisma.title.findFirst>>>;

export const DEFAULT_BLOG_PROMPT =
  "Write a complete, useful, well-structured SEO article for a company blog. Answer the reader's search intent directly, " +
  "use clear H2/H3 headings, short paragraphs, and practical, accurate information. Do not invent statistics, laws, " +
  "prices or sources; when a fact depends on location or date, say so.";

async function haltRun(runId: string, titleId: string, message: string): Promise<boolean> {
  await markTitleError(titleId, message);
  await prisma.run.updateMany({
    where: { id: runId, status: { in: ["pending", "running"] } },
    data: { status: "halted", finishedAt: new Date() },
  });
  await restoreUnfinishedTitlesToOpportunities(runId);
  return true;
}

export async function processBlogRunTitle(run: RunForBlog, nextTitle: TitleForBlog): Promise<boolean> {
  const apiUrl = process.env.BLOG_IA_API_URL;
  const secret = process.env.BLOG_IA_SECRET;
  if (!apiUrl || !secret) {
    return haltRun(run.id, nextTitle.id, "BLOG IA no está configurado en el servidor (faltan BLOG_IA_API_URL / BLOG_IA_SECRET).");
  }

  const blog = await prisma.blogIaBlog.findUnique({ where: { userId: run.userId } });
  if (!blog || blog.status !== "active") {
    return haltRun(
      run.id,
      nextTitle.id,
      "Tu BLOG IA todavía no está activo (falta terminar la conexión del dominio o la suscripción está suspendida). Complétalo en BLOG IA y vuelve a intentarlo.",
    );
  }

  const effectiveLanguage =
    (run.contentLanguage && run.contentLanguage.trim()) || (run.user.contentLanguage && run.user.contentLanguage.trim());
  if (!effectiveLanguage) {
    return haltRun(
      run.id,
      nextTitle.id,
      "No se encontró un idioma de redacción configurado para este lote ni en el perfil del usuario. Configúralo en Configuración antes de reintentar.",
    );
  }

  // Misma reserva atómica que el resto de colas: si otro worker ya lo tomó, no se publica dos veces.
  const claimed = await prisma.title.updateMany({
    where: { id: nextTitle.id, status: "pending" },
    data: { status: "processing", attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return false;

  const onStep = async (message: string) => {
    await prisma.titleEvent.create({ data: { titleId: nextTitle.id, message } });
  };

  const publisher = createBlogIaPublisher({
    tenantId: blog.tenantId,
    blogBaseUrl: `https://${blog.hostname}`,
    send: (event) => sendBlogIaEvent({ apiUrl, secret }, event),
    promptText: run.prompt?.prompt || DEFAULT_BLOG_PROMPT,
    contentLanguage: effectiveLanguage,
    authorName: [run.user.firstName, run.user.lastName].filter(Boolean).join(" ") || run.user.name || null,
    category: { id: run.category.id, name: run.category.name },
  });

  try {
    const result = await publisher.publishArticle({
      title: nextTitle.text,
      categoryExternalId: run.category.externalId,
      disableIndexing: run.disableIndexing,
      onStep,
    });
    await prisma.title.update({
      where: { id: nextTitle.id },
      data: {
        status: "success",
        articleUrl: result.articleUrl,
        finalTitle: result.finalTitle,
        summary: result.summary,
        publishedAt: new Date(),
        processedAt: new Date(),
        errorMessage: null,
      },
    });
    await onStep("Artículo publicado con éxito en BLOG IA.");
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Un fallo temporal (red, 5xx) vuelve a «pendiente» para reintentarse con el mismo id de evento
    // (nunca duplica) hasta MAX_ATTEMPTS; uno que exige corrección queda como error visible en el historial.
    if (err instanceof BlogIaPublishError && err.retryable) {
      const fresh = await prisma.title.findUniqueOrThrow({ where: { id: nextTitle.id } });
      if (fresh.attempts < MAX_ATTEMPTS) {
        await onStep(`BLOG IA no respondió (${message}); se reintentará.`);
        await prisma.title.update({ where: { id: nextTitle.id }, data: { status: "pending" } });
        return true;
      }
    }
    await markTitleError(nextTitle.id, message);
    return true;
  }
}
