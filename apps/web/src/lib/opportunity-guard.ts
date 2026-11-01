import { prisma } from "@auto-articulos/db";
import { GUARD, buildNeighborLists, dropSimilarKeepOne, scoreCandidates, titleKey, type ListJudgeFn, type MemoryEntry } from "@/lib/angle-guard-core";
import { JUDGE_MODEL, callListJudge, type ListJudgeItem } from "@/lib/angle-guard-judge";
import { getTitleGuardModeInfo, getTitleGuardPercent, shouldApplyGuard } from "@/lib/title-guard-mode";
import { guardSafeToApply, loadGuardMemory } from "@/lib/title-guard-shadow";

// GUARDIA DE ÁNGULOS en el MÓDULO 2 (CONTENIDO GENERADO POR IA). Se aplica DESPUÉS de que el razonamiento con Search Console,
// Bing y GA4 produce los títulos y ANTES de guardarlos. Solo QUITA títulos repetidos: no cambia la justificación, las
// impresiones, los clics ni ninguna señal; nunca vacía un grupo (si todo se parece, queda el menos parecido); y ante cualquier
// fallo devuelve los grupos tal cual. Mismo interruptor, mismo porcentaje y mismos frenos que el módulo 1.
// PLAN B (decisión de Milton 2026-11-01): el módulo 2 trabaja SOLO con código, sin IA y sin costo. Para volver a usar el juez, poner 1.
const JUDGE_MAX_CALLS = 0;
/// Tope propio del módulo 2 (con el juez apagado no cuesta nada; si se reactiva el juez, bajarlo a 12 ≈ 0,60 dólares al día).
export const OPPORTUNITY_DAILY_CAP = 200; // sin juez no hay gasto: el tope solo evita abusos
const JUDGE_ITEMS_PER_CALL = 40;

interface OpportunityGroupLike {
  categoryId: string;
  titles: Array<{ text: string; rationale: string }>;
}

export async function applyGuardToOpportunities<T extends OpportunityGroupLike>(
  userId: string,
  siteDomain: string,
  groups: T[],
): Promise<{ groups: T[]; removed: number; applied: boolean }> {
  const untouched = { groups, removed: 0, applied: false };
  try {
    const info = await getTitleGuardModeInfo();
    if (info.mode !== "activo") return untouched;
    const percent = await getTitleGuardPercent();
    // Sorteo por ejecución (no por día): con 50 % se protege cerca de la mitad de las veces de CADA usuario.
    if (!shouldApplyGuard(`${userId}:${Date.now()}:${Math.random()}`, percent)) return untouched;
    if (!(await guardSafeToApply(userId))) return untouched;
    const appliedToday = await prisma.titleGuardReport.count({ where: { mode: "activo", categoryName: { startsWith: "Módulo 2" }, createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } });
    if (appliedToday >= OPPORTUNITY_DAILY_CAP) return untouched;

    const memory = await loadGuardMemory(userId, siteDomain, "", undefined, true);
    // Filtro de ahorro: solo se revisan las categorías con historial suficiente.
    const historyOf = (categoryId: string) => memory.filter((m) => m.categoryId === categoryId && (m.source === "publicado" || m.source === "ofrecido")).length;
    const toReview = groups.filter((g) => historyOf(g.categoryId) >= GUARD.MIN_HISTORY);
    if (toReview.length === 0) return untouched;

    // Una lista de vecinos por título (más cercanos + recientes de su categoría) y el juez en lotes, con tope de llamadas.
    const entries: Array<{ item: ListJudgeItem; group: T; neighbors: MemoryEntry[]; candidate: string }> = [];
    let nextId = 1;
    for (const group of toReview) {
      for (const list of buildNeighborLists(group.titles.map((t) => t.text), memory, group.categoryId)) {
        entries.push({
          item: { id: nextId++, candidate: list.candidate, neighbors: list.neighbors.map((n, j) => ({ id: j + 1, title: n.title, mayBeCategoryPage: n.source === "sitio" })) },
          group,
          neighbors: list.neighbors,
          candidate: list.candidate,
        });
      }
    }
    const verdictFor = new Map<string, { same: boolean; neighbor: MemoryEntry | null }>();
    const started = Date.now();
    for (let call = 0; call < JUDGE_MAX_CALLS; call++) {
      const chunk = entries.slice(call * JUDGE_ITEMS_PER_CALL, (call + 1) * JUDGE_ITEMS_PER_CALL);
      if (chunk.length === 0 || Date.now() - started > 120_000) break;
      const verdicts = await callListJudge(chunk.map((e) => e.item), process.env.OPENAI_API_KEY, { timeoutMs: 25_000 });
      if (!verdicts) continue;
      for (const e of chunk) {
        const v = verdicts.get(e.item.id);
        if (!v) continue;
        const first = v.sameAs[0];
        verdictFor.set(`${e.group.categoryId}|${titleKey(e.candidate)}`, { same: v.sameAs.length > 0, neighbor: first ? (e.neighbors[first - 1] ?? null) : null });
      }
    }

    let removed = 0;
    const removedDetail: Array<{ title: string; neighbor: string | null }> = [];
    const result = groups.map((group) => {
      if (!toReview.includes(group)) return group;
      // Sin veredicto del juez para un título (tope de gasto o falla), solo se quita lo casi idéntico (el código decide ≥ 85 %).
      const listJudge: ListJudgeFn = (candidate) => verdictFor.get(`${group.categoryId}|${titleKey(candidate)}`) ?? { same: false, neighbor: null };
      const { scored, hardDropped } = scoreCandidates(group.titles.map((t) => t.text), memory, { listJudge });
      const kept = dropSimilarKeepOne(group.titles, scored, hardDropped);
      for (const dropped of group.titles.filter((t) => !kept.includes(t))) {
        removed += 1;
        removedDetail.push({ title: dropped.text, neighbor: scored.find((s) => titleKey(s.title) === titleKey(dropped.text))?.near?.title ?? null });
      }
      return kept.length === group.titles.length ? group : { ...group, titles: kept };
    });

    // Registro (también cuenta para el tope diario del modo activo). Si falla, se ignora.
    await prisma.titleGuardReport
      .create({
        data: {
          userId,
          requestId: null,
          categoryId: null,
          categoryName: "Módulo 2 · CONTENIDO GENERADO POR IA",
          siteDomain,
          mode: "activo",
          candidates: toReview.reduce((n, g) => n + g.titles.length, 0),
          legacyTitles: [],
          deliveredTitles: [],
          nSimilar: removed,
          judgeUsed: verdictFor.size > 0,
          judgeModel: verdictFor.size > 0 ? JUDGE_MODEL : null,
          judgePairs: Math.min(entries.length, JUDGE_MAX_CALLS * JUDGE_ITEMS_PER_CALL),
          judgeMs: Date.now() - started,
          details: { modulo: 2, quitados: removedDetail.slice(0, 60) },
        },
      })
      .catch(() => {});
    return { groups: result, removed, applied: true };
  } catch (error) {
    console.warn("[guardia-de-angulos] módulo 2: no se aplicó (se guarda todo como siempre):", error instanceof Error ? error.message : error);
    return untouched;
  }
}
