import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getActingAdmin, getCurrentUser } from "@/lib/current-user";
import { requireProductAccess } from "@/lib/require-product-access";
import { buildExplanationEvidence, explanationQuota, writeExplanation } from "@/lib/title-explanation";

async function currentUserWithQuotaRule() {
  const user = await getCurrentUser();
  const unlimited = user.role === "admin" || Boolean(await getActingAdmin());
  return { userId: user.id, unlimited };
}

// «¿Por qué estos títulos?» — SOLO bajo demanda, nunca automático.
// GET  ?runs=1  → las ejecuciones recientes que se pueden explicar.
// GET           → las explicaciones ya guardadas (con su fecha de solicitud).
// POST {runId}  → genera y guarda una explicación nueva (máximo 2 párrafos).

export async function GET(request: NextRequest) {
  const { userId, unlimited } = await currentUserWithQuotaRule();
  const denied = await requireProductAccess(userId, "ARTICULOS", "/api/historial/explicacion");
  if (denied) return denied;

  if (request.nextUrl.searchParams.get("runs") === "1") {
    const account = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
    const runs = await prisma.run.findMany({
      where: { userId, category: { name: { not: "FIX_PATRICIA" }, ...(account.selectedSiteDomain ? { siteDomain: account.selectedSiteDomain } : {}) } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, createdAt: true, category: { select: { name: true } }, _count: { select: { titles: true } } },
    });
    return NextResponse.json({
      runs: runs.map((r) => ({ id: r.id, createdAt: r.createdAt, categoria: r.category.name, titulos: r._count.titles })),
      cupo: await explanationQuota(userId, unlimited).catch(() => null),
    });
  }

  const explanations = await prisma.titleExplanation
    .findMany({ where: { userId }, orderBy: { requestedAt: "desc" }, take: 50 })
    .catch(() => []);
  return NextResponse.json({
    explanations: explanations.map((e) => ({
      id: e.id,
      runId: e.runId,
      requestedAt: e.requestedAt,
      summary: e.summary,
      status: e.status,
      errorMessage: e.errorMessage,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { userId, unlimited } = await currentUserWithQuotaRule();
  const denied = await requireProductAccess(userId, "ARTICULOS", "/api/historial/explicacion");
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const runId = typeof body?.runId === "string" ? body.runId : "";
  if (!runId) return NextResponse.json({ error: "Elige una ejecución." }, { status: 400 });

  let quota;
  try {
    quota = await explanationQuota(userId, unlimited);
  } catch {
    return NextResponse.json({ error: "Esta función todavía no está disponible. Inténtalo más tarde." }, { status: 503 });
  }
  if (quota.exhausted) {
    return NextResponse.json(
      { error: `Ya usaste tu explicación de hoy: solo se permite ${quota.max} cada 24 horas para controlar el uso de la IA.`, disponibleDesde: quota.nextAt },
      { status: 429 },
    );
  }

  const evidence = await buildExplanationEvidence(userId, runId);
  if (!evidence) return NextResponse.json({ error: "No encontramos esa ejecución." }, { status: 404 });

  const titleIds = (await prisma.title.findMany({ where: { runId }, select: { id: true } })).map((t) => t.id);
  try {
    const { summary, model } = await writeExplanation(evidence);
    const saved = await prisma.titleExplanation.create({
      data: { userId, runId, titleIds, summary, evidenceUsed: evidence as object, model, status: "ok" },
    });
    return NextResponse.json({ id: saved.id, requestedAt: saved.requestedAt, summary: saved.summary, runId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar la explicación.";
    await prisma.titleExplanation
      .create({ data: { userId, runId, titleIds, summary: "", evidenceUsed: evidence as object, status: "error", errorMessage: message.slice(0, 500) } })
      .catch(() => {});
    return NextResponse.json({ error: "No pudimos generar la explicación ahora. Inténtalo de nuevo en unos minutos." }, { status: 502 });
  }
}
