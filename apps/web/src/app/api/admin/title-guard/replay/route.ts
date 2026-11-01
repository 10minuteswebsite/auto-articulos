import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";
import { buildNeighborLists, decide, titleKey, type ListJudgeFn, type MemoryEntry } from "@/lib/angle-guard-core";
import { JUDGE_MODEL, callListJudge, type ListJudgeItem } from "@/lib/angle-guard-judge";
import { loadGuardMemory } from "@/lib/title-guard-shadow";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// Solo administrador y SIN efectos: vuelve a decidir una solicitud ya registrada por la guardia
// usando el juez actual y la memoria de hoy. Sirve para ver, con un caso real, qué marcaría la
// guardia sin gastar otra solicitud de ideas de la persona. No escribe nada.
//   GET /api/admin/title-guard/replay            → lista las últimas solicitudes para elegir
//   GET /api/admin/title-guard/replay?id=<id>    → repite la decisión de esa solicitud
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    const rows = await prisma.titleGuardReport.findMany({ orderBy: { createdAt: "desc" }, take: 15, select: { id: true, createdAt: true, categoryName: true, candidates: true } });
    return NextResponse.json({ solicitudes: rows.map((r) => ({ id: r.id, fecha: r.createdAt, categoria: r.categoryName, candidatos: r.candidates })) });
  }
  const report = await prisma.titleGuardReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "No existe esa solicitud." }, { status: 404 });

  // Lo que la persona recibió en esa solicitud es lo que se vuelve a evaluar.
  const candidates = report.legacyTitles;
  const memory = await loadGuardMemory(report.userId, report.siteDomain, report.requestId ?? "");
  const lists = buildNeighborLists(candidates, memory, report.categoryId);
  const items: ListJudgeItem[] = lists.map((l, index) => ({
    id: index + 1,
    candidate: l.candidate,
    neighbors: l.neighbors.map((n, j) => ({ id: j + 1, title: n.title, mayBeCategoryPage: n.source === "sitio" })),
  }));
  const started = Date.now();
  const verdicts = items.length ? await callListJudge(items, process.env.OPENAI_API_KEY, { timeoutMs: 25_000 }) : null;
  const judgeMs = Date.now() - started;
  let listJudge: ListJudgeFn | null = null;
  if (verdicts) {
    const byCandidate = new Map<string, { same: boolean; neighbor: MemoryEntry | null }>();
    lists.forEach((l, index) => {
      const v = verdicts.get(index + 1);
      if (!v) return;
      byCandidate.set(titleKey(l.candidate), { same: v.sameAs.length > 0, neighbor: v.sameAs[0] ? (l.neighbors[v.sameAs[0] - 1] ?? null) : null });
    });
    listJudge = (candidate) => byCandidate.get(titleKey(candidate)) ?? null;
  }
  const result = decide(candidates, memory, { listJudge });
  const marcados = verdicts
    ? lists
        .map((l, index) => ({ titulo: l.candidate, parecidoA: (verdicts.get(index + 1)?.sameAs ?? []).map((n) => l.neighbors[n - 1]?.title).filter(Boolean), motivo: verdicts.get(index + 1)?.reason ?? "" }))
        .filter((x) => x.parecidoA.length > 0)
    : [];
  return NextResponse.json({
    ok: true,
    solicitud: { id: report.id, fecha: report.createdAt, categoria: report.categoryName },
    modeloDelJuez: JUDGE_MODEL,
    juezRespondio: Boolean(verdicts),
    juezMs: judgeMs,
    titulosEvaluados: candidates.length,
    memoria: memory.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.source]: (acc[m.source] ?? 0) + 1 }), {}),
    resumen: verdicts
      ? `De ${candidates.length} títulos, el juez marcó ${marcados.length} como la misma pregunta que algo que ya existía. La guardia entregaría ${result.delivered.length}.`
      : "El juez no respondió; no se pudo repetir la decisión.",
    marcados,
    entregaria: result.delivered.map((d) => ({ titulo: d.title, veredicto: d.verdict, nota: d.note })),
  });
}
