import { prisma, type Prisma } from "@auto-articulos/db";
import { MENU_NAMES } from "@/lib/menu-names";
import { normalizeTitleKey } from "@auto-articulos/shared/src/published-title";
import { EXPLANATION_WINDOW_MS, MAX_EXPLANATIONS_PER_DAY, humanizeRequestInputs, limitToThreeParagraphs, nextExplanationAt, similarityPct } from "@/lib/title-explanation-core";

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
    comoSePidieron: requests[0]
      ? {
          fecha: requests[0].createdAt,
          loQueEscribioLaPersona: humanizeRequestInputs(requests[0].inputs, 400).map((l) => `${l.etiqueta}: ${l.texto}`),
          cuantosTitulosOfrecioLaIA: requests[0].offeredTitles.length,
        }
      : "No hay registro de que estos títulos se pidieran con el formulario de ideas con IA (pueden venir de Oportunidades o de una lista escrita a mano).",
    fuentesDeEvidenciaGuardadas: evidence,
    comparacion: {
      titulosDelSitioComparados: siteTitles.length,
      publicadosEnPlataformaComparados: published.length,
      descartadosPorLaPersonaComparados: discarded.length,
    },
  };
}

const SYSTEM_PROMPT = `Le explicas a una persona normal, dueña de un negocio y SIN conocimientos técnicos, por qué se escribieron unos artículos para su sitio. Háblale de tú, con calidez y claridad, en español sencillo.
FORMA: EXACTAMENTE TRES PÁRRAFOS cortos separados por una línea en blanco. Sin viñetas, sin títulos, sin listas, sin comillas de código.
PÁRRAFO 1 — «Cómo se encontraron estos temas y por qué se eligieron»: empieza directo con la respuesta y cuenta el camino en orden, como una historia corta: (1) de dónde nació la idea (si viene de «comoSePidieron», cuenta con tus palabras qué pediste: el tema, a quién le escribes y dónde están tus clientes; si la ejecución viene de Oportunidades y «fuentesDeEvidenciaGuardadas» trae datos correctos, di que se miraron los datos de búsqueda de Google de tu sitio); (2) que la inteligencia artificial propuso títulos pensando en lo que tus clientes buscan; (3) por qué esos temas ayudan a que te encuentren. Menciona los datos de búsqueda de Google SOLO si de verdad aparecen en la evidencia. Si el razonamiento original dice «NO REGISTRADO», dilo con honestidad en una frase corta, sin inventar.
PÁRRAFO 2 — «Cómo se cuidó que no se repitan»: explica que se revisó que ninguno de estos artículos compita con otro tuyo por la misma búsqueda de los clientes. Di contra cuántos artículos tuyos se comparó, si alguno se parecía mucho (por ejemplo «se parece en un 60 % a…» con el título) y reconoce con sinceridad el límite: la revisión detecta títulos iguales o muy parecidos, pero dos artículos pueden tratar un tema cercano con palabras distintas.
PÁRRAFO 3 — «Tranquilidad»: pídele con calidez que confíe en el proceso. Dile que es normal y bueno ver títulos o temas parecidos entre sí, porque tratar un mismo tema desde varios ángulos suele ayudar a que tus clientes te encuentren, siempre que cada artículo responda una pregunta distinta, y que lo que se evita es publicar el mismo artículo dos veces. Cierra diciéndole que, si prefiere artículos mucho más diferentes entre sí, puede usar el módulo ${MENU_NAMES.propios} para crear sus propios títulos nuevos.
PROHIBIDO: siglas o jerga (SEO, GSC, GA4, API, ID, JSON, sitemap, canibalización, modelo), códigos, nombres de campos, llaves o corchetes, y repetir textos en inglés completos: si necesitas citar un título en inglés, cítalo breve entre comillas.
USA ÚNICAMENTE los datos de EVIDENCIA. No inventes cifras, fuentes ni motivos.`;

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
    const summary = limitToThreeParagraphs(content);
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
