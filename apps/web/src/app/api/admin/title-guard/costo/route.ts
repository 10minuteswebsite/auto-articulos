import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";
import { GUARD } from "@/lib/angle-guard-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// SOLO ADMINISTRADOR, SOLO LECTURA, SIN IA. Reconstruye los últimos 30 días con datos reales y calcula cuánto HABRÍA
// costado la Guardia de ángulos si hubiera estado al 100 %, con el filtro de historial y los topes diarios actuales.
// Costos unitarios (estimados con precios de lista de gpt-4.1, a verificar): módulo 1 ≈ 1,74 centavos por clic revisado
// (9 títulos × 25 vecinos); módulo 2 ≈ 5 centavos por análisis (una llamada de hasta 40 títulos).
const COST_M1 = 0.0174;
const COST_M2 = 0.05;
const CAP_M1 = 40;
const CAP_M2 = 12;
const DAY = 86_400_000;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const since = new Date(Date.now() - 30 * DAY);
  const requests30 = await prisma.titleGenerationRequest.findMany({
    where: { createdAt: { gte: since }, offeredTitles: { isEmpty: false } },
    select: { userId: true, categoryId: true, createdAt: true },
  });
  const users = [...new Set(requests30.map((r) => r.userId))];
  // Historial por (cuenta, categoría) ANTES de cada clic: publicados + ofrecidos anteriores.
  const [titles, offered] = await Promise.all([
    prisma.title.findMany({ where: { status: "success", run: { userId: { in: users } } }, select: { processedAt: true, run: { select: { userId: true, categoryId: true } } }, take: 60000 }),
    prisma.titleGenerationRequest.findMany({ where: { userId: { in: users } }, select: { userId: true, categoryId: true, createdAt: true, offeredTitles: true }, take: 20000 }),
  ]);
  const events = new Map<string, Array<{ at: number; n: number }>>();
  const push = (key: string, at: number, n: number) => events.set(key, [...(events.get(key) ?? []), { at, n }]);
  for (const t of titles) if (t.processedAt) push(`${t.run.userId}|${t.run.categoryId}`, t.processedAt.getTime(), 1);
  for (const r of offered) push(`${r.userId}|${r.categoryId}`, r.createdAt.getTime(), r.offeredTitles.length);

  const perDayM1 = new Map<string, { clicks: number; applicable: number }>();
  for (const r of requests30) {
    const day = r.createdAt.toISOString().slice(0, 10);
    const entry = perDayM1.get(day) ?? { clicks: 0, applicable: 0 };
    entry.clicks += 1;
    const history = (events.get(`${r.userId}|${r.categoryId}`) ?? []).filter((e) => e.at < r.createdAt.getTime()).reduce((n, e) => n + e.n, 0);
    if (history >= GUARD.MIN_HISTORY) entry.applicable += 1;
    perDayM1.set(day, entry);
  }
  let clicks = 0;
  let applicable = 0;
  let costM1Uncapped = 0;
  let costM1Capped = 0;
  for (const e of perDayM1.values()) {
    clicks += e.clicks;
    applicable += e.applicable;
    costM1Uncapped += e.applicable * COST_M1;
    costM1Capped += Math.min(e.applicable, CAP_M1) * COST_M1;
  }

  // Módulo 2: cada cuenta-día con artículos publicados desde oportunidades implica AL MENOS un análisis (cota inferior).
  const m2 = await prisma.title.findMany({
    where: { status: "success", opportunityCreatedAt: { not: null }, processedAt: { gte: since } },
    select: { processedAt: true, run: { select: { userId: true } } },
    take: 20000,
  });
  const m2Days = new Map<string, Set<string>>();
  for (const t of m2) {
    if (!t.processedAt) continue;
    const day = t.processedAt.toISOString().slice(0, 10);
    m2Days.set(day, (m2Days.get(day) ?? new Set()).add(t.run.userId));
  }
  let analyses = 0;
  let costM2Uncapped = 0;
  let costM2Capped = 0;
  for (const set of m2Days.values()) {
    analyses += set.size;
    costM2Uncapped += set.size * COST_M2;
    costM2Capped += Math.min(set.size, CAP_M2) * COST_M2;
  }
  const accounts = new Set([...requests30.map((r) => r.userId), ...m2.map((t) => t.run.userId)]).size;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const totalCapped = costM1Capped + costM2Capped;
  return NextResponse.json({
    ok: true,
    resumen: `Últimos 30 días, si la guardia hubiera estado al 100 %: módulo 1 → ${clicks} clics, ${applicable} revisables (cuentas con ≥ ${GUARD.MIN_HISTORY} títulos en la categoría), costo ≈ US$ ${r2(costM1Capped)}. Módulo 2 → ${analyses} cuentas-día con análisis (mínimo real), costo ≈ US$ ${r2(costM2Capped)}. TOTAL ≈ US$ ${r2(totalCapped)} en el mes (≈ US$ ${r2(totalCapped / 30)} al día) para toda la plataforma, unos US$ ${r2(totalCapped / Math.max(1, accounts))} por cuenta activa (${accounts} cuentas).`,
    modulo1: { clics: clicks, revisables: applicable, costoConTopesUsd: r2(costM1Capped), costoSinTopesUsd: r2(costM1Uncapped), costoPorClicUsd: COST_M1 },
    modulo2: { cuentasDiaConAnalisis: analyses, costoConTopesUsd: r2(costM2Capped), costoSinTopesUsd: r2(costM2Uncapped), costoPorAnalisisUsd: COST_M2, nota: "El número real de análisis puede ser mayor (no se guarda cuántos se hicieron); esta es la cota mínima. El tope de 12 análisis al día limita el gasto." },
    totalMesUsd: r2(totalCapped),
    totalMesSinTopesUsd: r2(costM1Uncapped + costM2Uncapped),
    cuentasActivas: accounts,
    supuestos: "Precios de lista de gpt-4.1 (verificar); 1,74 centavos por clic revisado y 5 por análisis. Sin IA en esta medición.",
  });
}
