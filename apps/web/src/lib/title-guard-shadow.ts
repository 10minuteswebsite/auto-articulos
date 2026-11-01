import { prisma } from "@auto-articulos/db";
import { GUARD, decide, needsJudge, titleKey, type JudgeFn, type MemoryEntry } from "@/lib/angle-guard-core";
import { JUDGE_MODEL, callJudge } from "@/lib/angle-guard-judge";
import type { TitleGuardMode } from "@/lib/title-guard-mode";
import { ensureSiteTitlesSeeded } from "@/lib/published-titles";

// GUARDIA DE ÁNGULOS — MODO SOMBRA (Fase 2). Corre DESPUÉS de responder a la
// persona (con `after()` en la ruta) y solo registra lo que la guardia habría
// hecho; lo que se entrega es exactamente lo de siempre. NUNCA lanza ni afecta
// la solicitud: cualquier fallo (tabla ausente, juez caído, tiempo) se registra
// como advertencia y se ignora.

export interface ShadowInfo {
  mode: TitleGuardMode;
  userId: string;
  requestId: string;
  categoryId: string;
  categoryName: string;
  siteDomain: string;
  /** Todos los candidatos que devolvió la IA (antes de filtrar). */
  candidates: string[];
  /** Lo que se entregó a la persona (el filtro actual). */
  legacyTitles: string[];
  startedAtMs: number;
}

const DAY_MS = 86_400_000;
/// El juez solo se llama si la solicitud lleva menos de esto: la ruta admite 60 s.
const JUDGE_ONLY_BEFORE_MS = 30_000;
const MAX_ROWS = 5000;
const ageDays = (from: Date | null | undefined, fallback: number) => (from ? Math.max(0, Math.floor((Date.now() - from.getTime()) / DAY_MS)) : fallback);

/** Memoria de lo ya cubierto en el sitio de la categoría (publicado, del sitio, ofrecido, descartado). */
export async function loadGuardMemory(userId: string, siteDomain: string, excludeRequestId: string): Promise<MemoryEntry[]> {
  const siteFilter = siteDomain ? { siteDomain } : {};
  const [published, site, requests, discarded] = await Promise.all([
    prisma.title.findMany({
      where: { status: "success", run: { userId, ...(siteDomain ? { category: { siteDomain } } : {}) } },
      select: { text: true, finalTitle: true, publishedAt: true, processedAt: true },
      orderBy: { processedAt: "desc" },
      take: MAX_ROWS,
    }),
    prisma.siteArticleTitle.findMany({ where: { userId, ...siteFilter }, select: { title: true, createdAt: true }, take: MAX_ROWS }).catch(() => []),
    prisma.titleGenerationRequest.findMany({
      where: { userId, id: { not: excludeRequestId } },
      select: { offeredTitles: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.articleTitleDiscard.findMany({ where: { userId, ...siteFilter }, select: { titleText: true, discardedAt: true }, take: MAX_ROWS }).catch(() => []),
  ]);
  const memory: MemoryEntry[] = [];
  for (const t of published) {
    const age = ageDays(t.publishedAt ?? t.processedAt, 30);
    memory.push({ title: t.text, source: "publicado", ageDays: age });
    if (t.finalTitle && t.finalTitle !== t.text) memory.push({ title: t.finalTitle, source: "publicado", ageDays: age });
  }
  // Los títulos del sitio salen de la URL y no traen fecha útil: se tratan como antiguos para la regla de años.
  for (const s of site) memory.push({ title: s.title, source: "sitio", ageDays: ageDays(s.createdAt, 400) });
  for (const r of requests) for (const title of r.offeredTitles) memory.push({ title, source: "ofrecido", ageDays: ageDays(r.createdAt, 0) });
  for (const d of discarded) memory.push({ title: d.titleText, source: "descartado", ageDays: ageDays(d.discardedAt, 0) });
  return memory;
}

export async function runGuardShadow(info: ShadowInfo): Promise<void> {
  const base = {
    userId: info.userId,
    requestId: info.requestId,
    categoryId: info.categoryId,
    categoryName: info.categoryName,
    siteDomain: info.siteDomain,
    mode: info.mode === "activo" ? "sombra" : info.mode,
    candidates: info.candidates.length,
    legacyTitles: info.legacyTitles,
  };
  try {
    // La memoria del sitio sale del sitemap, que hasta ahora solo se leía al usar Oportunidades: una cuenta que solo usa
    // CONTENIDO PROPIO podía tener esa memoria vacía. Se llena (una sola vez por cuenta y sitio) y nunca lanza.
    await ensureSiteTitlesSeeded(info.userId, info.siteDomain);
    const memory = await loadGuardMemory(info.userId, info.siteDomain, info.requestId);
    const memoryCounts = memory.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.source]: (acc[m.source] ?? 0) + 1 }), {});
    const pairs = needsJudge(info.candidates, memory);

    let judge: JudgeFn | null = null;
    let judgeUsed = false;
    let judgeMs: number | null = null;
    if (pairs.length > 0 && Date.now() - info.startedAtMs < JUDGE_ONLY_BEFORE_MS) {
      const started = Date.now();
      const verdicts = await callJudge(
        pairs.map((p, index) => ({ id: index + 1, candidate: p.candidate, existing: p.neighbor.title, existingMayBeCategoryPage: p.neighbor.source === "sitio" })),
        process.env.OPENAI_API_KEY,
      );
      judgeMs = Date.now() - started;
      if (verdicts) {
        judgeUsed = true;
        const byCandidate = new Map(pairs.map((p, index) => [titleKey(p.candidate), verdicts.get(index + 1)] as const));
        judge = (candidate) => {
          const verdict = byCandidate.get(titleKey(candidate));
          return verdict ? (verdict.same ? "same" : "different") : null;
        };
      }
    }

    const result = decide(info.candidates, memory, { judge });
    await prisma.titleGuardReport.create({
      data: {
        ...base,
        deliveredTitles: result.delivered.map((d) => d.title),
        hardDropped: result.hardDropped,
        nClean: result.nClean,
        nSimilar: result.nSimilar,
        completedWithNotes: result.completedWithNotes,
        judgeUsed,
        judgeModel: judgeUsed ? JUDGE_MODEL : null,
        judgePairs: pairs.length,
        judgeMs,
        details: {
          memoria: memoryCounts,
          entregados: result.delivered.map((d) => ({ title: d.title, verdict: d.verdict, sim: Math.round(d.sim * 100), note: d.note, neighbor: d.neighbor })),
        },
      },
    });
  } catch (error) {
    console.warn("[guardia-de-angulos] sombra falló (no afecta la solicitud):", error instanceof Error ? error.message : error);
    // Se intenta dejar constancia del fallo; si la tabla no existe, simplemente se ignora.
    await prisma.titleGuardReport
      .create({ data: { ...base, errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 300) } })
      .catch(() => {});
  }
}

/** Para pruebas y para el endpoint de línea base: las mismas constantes de la guardia. */
export const SHADOW_LIMITS = { JUDGE_ONLY_BEFORE_MS, MAX_ROWS, AUTO: GUARD.AUTO, BAND: GUARD.BAND };
