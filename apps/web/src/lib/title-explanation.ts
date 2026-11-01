import { prisma, type Prisma } from "@auto-articulos/db";
import { normalizeTitleKey } from "@auto-articulos/shared/src/published-title";
import { EXPLANATION_WINDOW_MS, MAX_EXPLANATIONS_PER_DAY, limitToTwoParagraphs, nextExplanationAt, similarityPct } from "@/lib/title-explanation-core";

export { MAX_EXPLANATIONS_PER_DAY };

// EXPLICACIÓN BAJO DEMANDA de por qué se crearon los títulos de una ejecución.
// Solo corre cuando la persona la pide. El código reúne los datos reales y la
// IA únicamente los redacta en un resumen de máximo dos párrafos; el resumen se
// guarda con su fecha de solicitud (tabla TitleExplanation) y no se reescribe.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// Mismo modelo que el resto del sistema; no se cambia sin aprobación de Milton.
const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = 40_000;
const MAX_COMPARED = 5000;
const CLOSEST_PER_TITLE = 3;

type Known = { title: string; source: "sitio" | "publicado" | "descartado" };

export async function buildExplanationEvidence(userId: string, runId: string) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId },
    include: {
      category: { select: { name: true, siteDomain: true } },
      titles: { orderBy: { order: "asc" }, select: { id: true, text: true, status: true, opportunityCreatedAt: true } },
    },
  });
  if (!run) return null;
  const siteDomain = run.category.siteDomain ?? "";
  // Los títulos de ESTA ejecución ya publicados también viven en la lista del
  // sitio (SiteArticleTitle crece con cada publicación): no deben compararse
  // consigo mismos.
  const ownPublishedKeys = new Set(run.titles.filter((t) => t.status === "success").map((t) => normalizeTitleKey(t.text)));

  const [origins, siteTitles, published, discarded, evidence, requests] = await Promise.all([
    prisma.titleOrigin.findMany({ where: { titleId: { in: run.titles.map((t) => t.id) } } }).catch(() => []),
    prisma.siteArticleTitle.findMany({ where: { userId, ...(siteDomain ? { siteDomain } : {}) }, select: { title: true }, take: MAX_COMPARED }).catch(() => []),
    prisma.title.findMany({
      where: { status: "success", id: { notIn: run.titles.map((t) => t.id) }, run: { userId, ...(siteDomain ? { category: { siteDomain } } : {}) } },
      select: { text: true },
      take: MAX_COMPARED,
    }),
    prisma.articleTitleDiscard.findMany({ where: { userId, ...(siteDomain ? { siteDomain } : {}) }, select: { titleText: true }, take: MAX_COMPARED }).catch(() => []),
    prisma.opportunityEvidenceCache.findMany({
      where: { userId, ...(siteDomain ? { siteDomain } : {}) },
      select: { source: true, status: true, fetchedAt: true, periodStart: true, periodEnd: true },
    }).catch(() => []),
    prisma.titleGenerationRequest.findMany({
      where: { userId, categoryId: run.categoryId, createdAt: { gte: new Date(run.createdAt.getTime() - 36 * 3600_000), lte: run.createdAt } },
      select: { createdAt: true, inputs: true, offeredTitles: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
  ]);

  const known: Known[] = [
    ...siteTitles.map((t) => ({ title: t.title, source: "sitio" as const })),
    ...published.map((t) => ({ title: t.text, source: "publicado" as const })),
    ...discarded.map((t) => ({ title: t.titleText, source: "descartado" as const })),
  ].filter((k) => !(k.source === "sitio" && ownPublishedKeys.has(normalizeTitleKey(k.title))));
  const originByTitle = new Map(origins.map((o) => [o.titleId, o]));

  const titles = run.titles.map((t) => {
    const origin = originByTitle.get(t.id);
    const key = normalizeTitleKey(t.text);
    const exact = known.filter((k) => normalizeTitleKey(k.title) === key).length;
    const closest = known
      .map((k) => ({ titulo: k.title, parecidoPct: similarityPct(t.text, k.title), fuente: k.source }))
      .sort((a, b) => b.parecidoPct - a.parecidoPct)
      .slice(0, CLOSEST_PER_TITLE);
    return {
      titulo: t.text,
      estado: t.status,
      coincidenciasExactasConLoExistente: exact,
      masParecidosYaExistentes: closest,
      razonamientoGuardado: origin
        ? { razonDelTitulo: origin.titleRationale, razonDeLaOportunidad: origin.groupRationale, impresiones: origin.impressions, clics: origin.clicks }
        : "NO REGISTRADO (la oportunidad original ya se había borrado cuando se empezó a guardar este dato)",
      oportunidadCreada: t.opportunityCreatedAt,
    };
  });

  return {
    ejecucion: { id: run.id, creada: run.createdAt, categoria: run.category.name, sitio: siteDomain || null, idioma: run.contentLanguage, titulos: run.titles.length },
    titulos: titles,
    origenPublicar: requests[0]
      ? { solicitadoEl: requests[0].createdAt, loQueEscribioLaPersona: requests[0].inputs, titulosOfrecidos: requests[0].offeredTitles }
      : null,
    fuentesDeEvidenciaGuardadas: evidence,
    comparacion: {
      titulosDelSitioComparados: siteTitles.length,
      publicadosEnPlataformaComparados: published.length,
      descartadosPorLaPersonaComparados: discarded.length,
    },
  };
}

const SYSTEM_PROMPT = `Eres un analista SEO que redacta un RESUMEN EJECUTIVO para el dueño de un sitio web. Responde SOLO en español, con MÁXIMO DOS PÁRRAFOS separados por una línea en blanco, sin viñetas ni títulos.
Párrafo 1: de dónde salió la información que dio origen a estos títulos y por qué se tomó la decisión de crearlos (usa el razonamiento guardado, las fuentes de evidencia y, si vienen de Publicar, lo que la persona escribió).
Párrafo 2: cómo se cuidó la no canibalización y la repetición de temas: contra cuántos títulos existentes se comparó, si hubo coincidencias exactas, cuáles son los títulos ya existentes más parecidos y con qué porcentaje, y qué límites tiene esa comprobación.
REGLAS: usa ÚNICAMENTE los datos del bloque EVIDENCIA. Si un dato dice "NO REGISTRADO" o falta, dilo con claridad en vez de suponer. No inventes cifras, fuentes ni motivos. Sé concreto y honesto, incluso si los títulos se parecen entre sí o a otros ya existentes.`;

export async function writeExplanation(evidence: unknown): Promise<{ summary: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("La IA no está configurada en este momento.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `EVIDENCIA:\n${JSON.stringify(evidence)}` },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`La IA respondió con error ${response.status}.`);
    const data = await response.json();
    const content = String(data?.choices?.[0]?.message?.content ?? "").trim();
    const summary = limitToTwoParagraphs(content);
    if (!summary) throw new Error("La IA no devolvió texto.");
    return { summary, model: OPENAI_MODEL };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cupo de explicaciones: 1 por cada 24 horas (decisión de Milton, 2026-11-01,
 * para no multiplicar el costo de IA). El administrador, también cuando actúa
 * como otro usuario, no tiene tope para poder investigar. Los intentos con
 * error no consumen cupo.
 */
export async function explanationQuota(userId: string, unlimited: boolean) {
  const recent = await prisma.titleExplanation.findMany({
    where: { userId, status: "ok", requestedAt: { gte: new Date(Date.now() - EXPLANATION_WINDOW_MS) } },
    select: { requestedAt: true },
  });
  const nextAt = unlimited ? null : nextExplanationAt(recent.map((r) => r.requestedAt), MAX_EXPLANATIONS_PER_DAY);
  return { used: recent.length, max: MAX_EXPLANATIONS_PER_DAY, unlimited, nextAt, exhausted: nextAt !== null };
}

export type SavedExplanationInput = Prisma.TitleExplanationUncheckedCreateInput;
