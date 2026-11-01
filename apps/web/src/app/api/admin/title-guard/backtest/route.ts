import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";
import { loadGuardMemory } from "@/lib/title-guard-shadow";
import { buildNeighborLists, decide, titleKey, type ListJudgeFn, type MemoryEntry } from "@/lib/angle-guard-core";
import { callListJudge, type ListJudgeItem } from "@/lib/angle-guard-judge";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

// SOLO ADMINISTRADOR, SIN EFECTOS: repite con el juez de hoy solicitudes PASADAS de todas las cuentas, usando lo que
// existía en cada momento (sin mirar el futuro). Responde con números reales de cuánto marcaría la guardia, cuántos
// títulos entregaría y cuánto costaría, sin tocar a ningún usuario. Gasto máximo ≈ 2 centavos por solicitud evaluada.
//   GET ?limite=20   (máximo 30 por llamada)
const PER_BATCH = 4;
const COST_PER_REQUEST_USD = 0.017;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const limite = Math.min(30, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("limite") ?? "20", 10) || 20));
  const desde = Math.max(0, Number.parseInt(request.nextUrl.searchParams.get("saltar") ?? "0", 10) || 0);
  const rows = await prisma.titleGenerationRequest.findMany({
    where: { offeredTitles: { isEmpty: false } },
    orderBy: { createdAt: "desc" },
    skip: desde,
    take: limite,
    select: { id: true, userId: true, categoryId: true, offeredTitles: true, createdAt: true },
  });
  const categories = await prisma.category.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.categoryId))] } }, select: { id: true, siteDomain: true } });
  const siteOf = new Map(categories.map((c) => [c.id, c.siteDomain ?? ""]));

  const started = Date.now();
  let evaluated = 0;
  let titles = 0;
  let flagged = 0;
  let belowNine = 0;
  let belowFiveClean = 0;
  let judgeFailed = 0;
  const per: Array<{ solicitud: string; titulos: number; marcados: number; entregaria: number }> = [];

  for (let i = 0; i < rows.length; i += PER_BATCH) {
    if (Date.now() - started > 45_000) break;
    const batch = rows.slice(i, i + PER_BATCH);
    const results = await Promise.all(
      batch.map(async (r) => {
        try {
          const memory = await loadGuardMemory(r.userId, siteOf.get(r.categoryId) ?? "", r.id, r.createdAt);
          const lists = buildNeighborLists(r.offeredTitles, memory, r.categoryId);
          const items: ListJudgeItem[] = lists.map((l, index) => ({ id: index + 1, candidate: l.candidate, neighbors: l.neighbors.map((n, j) => ({ id: j + 1, title: n.title, mayBeCategoryPage: n.source === "sitio" })) }));
          const verdicts = items.length ? await callListJudge(items, process.env.OPENAI_API_KEY, { timeoutMs: 20_000 }) : null;
          let listJudge: ListJudgeFn | null = null;
          if (verdicts) {
            const by = new Map<string, { same: boolean; neighbor: MemoryEntry | null }>();
            lists.forEach((l, index) => {
              const v = verdicts.get(index + 1);
              if (v) by.set(titleKey(l.candidate), { same: v.sameAs.length > 0, neighbor: v.sameAs[0] ? (l.neighbors[v.sameAs[0] - 1] ?? null) : null });
            });
            listJudge = (c) => by.get(titleKey(c)) ?? null;
          }
          const result = decide(r.offeredTitles, memory, { listJudge });
          return { r, result, judgeOk: items.length === 0 || Boolean(verdicts) };
        } catch {
          return null;
        }
      }),
    );
    for (const x of results) {
      if (!x) continue;
      evaluated += 1;
      titles += x.r.offeredTitles.length;
      const marked = x.result.nSimilar + x.result.hardDropped.length;
      flagged += marked;
      if (x.result.delivered.length < 9) belowNine += 1;
      if (x.result.nClean < 5) belowFiveClean += 1;
      if (!x.judgeOk) judgeFailed += 1;
      per.push({ solicitud: `…${x.r.id.slice(-6)}`, titulos: x.r.offeredTitles.length, marcados: marked, entregaria: x.result.delivered.length });
    }
  }
  const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 0);
  return NextResponse.json({
    ok: true,
    resumen: `Se repitieron ${evaluated} solicitudes pasadas (${titles} títulos). El juez habría marcado ${flagged} títulos como repetidos (${pct(flagged, titles)} %). En ${belowNine} solicitudes (${pct(belowNine, evaluated)} %) se habrían entregado menos de 9 y en ${belowFiveClean} (${pct(belowFiveClean, evaluated)} %) hubo menos de 5 títulos limpios, donde se completa con notas. Costo de esta prueba ≈ US$ ${(evaluated * COST_PER_REQUEST_USD).toFixed(2)}.`,
    solicitudesEvaluadas: evaluated,
    titulosEvaluados: titles,
    titulosMarcados: flagged,
    porcentajeMarcado: pct(flagged, titles),
    solicitudesConMenosDeNueve: belowNine,
    solicitudesConMenosDeCincoLimpios: belowFiveClean,
    juezSinRespuesta: judgeFailed,
    costoDeEstaPruebaUsd: Number((evaluated * COST_PER_REQUEST_USD).toFixed(2)),
    detalle: per,
  });
}
