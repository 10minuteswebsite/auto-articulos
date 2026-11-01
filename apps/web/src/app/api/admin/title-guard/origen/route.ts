import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";
import { GUARD, buildSimilarity } from "@/lib/angle-guard-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// SOLO ADMINISTRADOR, SOLO LECTURA, SIN IA Y SIN COSTO. Responde dos preguntas con datos reales:
//  1) ¿De qué módulo salen los artículos publicados? (con oportunidades = CONTENIDO GENERADO POR IA; sin = CONTENIDO PROPIO,
//     ya sean títulos escritos a mano o ideas con IA).
//  2) ¿Cuánta repetición hay entre los artículos publicados de cada módulo? Cada título publicado se compara con los
//     anteriores de su misma cuenta con el detector de código (sin juez): casi idénticos (≥ 85 %) y zona del juez (38–84 %).
const BUDGET_MS = 22_000;
const MAX_TITLES = 9000;
const MAX_ACCOUNTS = 200;
const MAX_PREVIOUS = 400;

type Origin = "modulo2" | "modulo1";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const started = Date.now();
  const since = new Date(Date.now() - 120 * 86_400_000);
  const rows = await prisma.title.findMany({
    where: { status: "success", processedAt: { gte: since } },
    orderBy: [{ run: { userId: "asc" } }, { processedAt: "asc" }],
    take: MAX_TITLES,
    select: { text: true, finalTitle: true, opportunityCreatedAt: true, processedAt: true, run: { select: { userId: true } } },
  });

  const day30 = Date.now() - 30 * 86_400_000;
  const count = { modulo2: { total: 0, ultimos30: 0 }, modulo1: { total: 0, ultimos30: 0 } };
  const byUser = new Map<string, Array<{ text: string; origin: Origin }>>();
  for (const r of rows) {
    const origin: Origin = r.opportunityCreatedAt ? "modulo2" : "modulo1";
    count[origin].total += 1;
    if (r.processedAt && r.processedAt.getTime() >= day30) count[origin].ultimos30 += 1;
    const list = byUser.get(r.run.userId) ?? [];
    list.push({ text: r.finalTitle || r.text, origin });
    byUser.set(r.run.userId, list);
  }

  const stats: Record<Origin, { comparados: number; casiIdenticos: number; zonaJuez: number }> = {
    modulo2: { comparados: 0, casiIdenticos: 0, zonaJuez: 0 },
    modulo1: { comparados: 0, casiIdenticos: 0, zonaJuez: 0 },
  };
  // Para afinar el umbral del módulo 2 (sin IA): cuántos caen en cada franja de parecido y ejemplos reales de la franja 65–84 %.
  const bandas = { "85+": 0, "75-84": 0, "65-74": 0, "55-64": 0, "menos55": 0 };
  const ejemplos: Array<{ parecido: number; titulo: string; contra: string }> = [];
  let accounts = 0;
  let truncated = false;
  for (const list of byUser.values()) {
    if (list.length < 2) continue;
    if (Date.now() - started > BUDGET_MS || accounts >= MAX_ACCOUNTS) {
      truncated = true;
      break;
    }
    accounts += 1;
    const sim = buildSimilarity(list.map((x) => x.text));
    for (let i = 1; i < list.length; i++) {
      let best = 0;
      let bestJ = -1;
      for (let j = Math.max(0, i - MAX_PREVIOUS); j < i; j++) {
        const s = sim(list[i].text, list[j].text);
        if (s > best) {
          best = s;
          bestJ = j;
        }
      }
      if (list[i].origin === "modulo2") {
        const key = best >= 0.85 ? "85+" : best >= 0.75 ? "75-84" : best >= 0.65 ? "65-74" : best >= 0.55 ? "55-64" : "menos55";
        bandas[key] += 1;
        if (best >= 0.65 && best < 0.85 && ejemplos.length < 14 && accounts % 3 === 0) ejemplos.push({ parecido: Math.round(best * 100), titulo: list[i].text, contra: list[bestJ].text });
      }
      const bucket = stats[list[i].origin];
      bucket.comparados += 1;
      if (best >= GUARD.AUTO) bucket.casiIdenticos += 1;
      else if (best >= GUARD.BAND) bucket.zonaJuez += 1;
    }
  }
  const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 0);
  const total = count.modulo1.total + count.modulo2.total;
  return NextResponse.json({
    ok: true,
    resumen: `Artículos publicados en 120 días: ${total}. Del módulo 2 (CONTENIDO GENERADO POR IA): ${count.modulo2.total} (${pct(count.modulo2.total, total)} %). Del módulo 1 (CONTENIDO PROPIO): ${count.modulo1.total} (${pct(count.modulo1.total, total)} %). Repetición medida solo con el código (sin IA): módulo 2 → ${stats.modulo2.casiIdenticos} casi idénticos (${pct(stats.modulo2.casiIdenticos, stats.modulo2.comparados)} %) y ${stats.modulo2.zonaJuez} en la zona del juez (${pct(stats.modulo2.zonaJuez, stats.modulo2.comparados)} %); módulo 1 → ${stats.modulo1.casiIdenticos} casi idénticos (${pct(stats.modulo1.casiIdenticos, stats.modulo1.comparados)} %) y ${stats.modulo1.zonaJuez} en la zona del juez (${pct(stats.modulo1.zonaJuez, stats.modulo1.comparados)} %).`,
    articulosPublicados: { total, modulo2: count.modulo2, modulo1: count.modulo1 },
    repeticionPorCodigo: stats,
    modulo2PorFranja: bandas,
    modulo2EjemplosZona65a84: ejemplos,
    cuentasMedidas: accounts,
    cortadoPorTiempo: truncated,
    nota: "La zona del juez es parecido de palabras de 38 a 84 %: ahí hay repetidos reales y también títulos distintos del mismo tema; solo el juez de IA los separa. 'Casi idéntico' (≥ 85 %) es repetición casi segura.",
  });
}
