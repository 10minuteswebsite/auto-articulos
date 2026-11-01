import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";
import { GUARD, buildSimilarity } from "@/lib/angle-guard-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// Solo administrador, solo lectura y SOLO CONTEOS: mide, en todas las cuentas, cuántos títulos
// ofrecidos se parecen a los que la misma cuenta ya había recibido. No muestra textos ni correos;
// las cuentas salen como «…últimos 6 caracteres del id». Es la línea base antes de activar la guardia.
const BUDGET_MS = 22_000;
const MAX_REQUESTS = 4000;
const MAX_ACCOUNTS = 250;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const started = Date.now();
  const since = new Date(Date.now() - 120 * 86_400_000);
  const requests = await prisma.titleGenerationRequest.findMany({
    where: { createdAt: { gte: since }, offeredTitles: { isEmpty: false } },
    select: { userId: true, offeredTitles: true, createdAt: true },
    orderBy: [{ userId: "asc" }, { createdAt: "asc" }],
    take: MAX_REQUESTS,
  });
  // Conteo real de solicitudes de ideas con IA (todas las cuentas, tengan o no 2 solicitudes) por día.
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const perDay = new Map<string, number>();
  for (const r of requests) perDay.set(dayKey(r.createdAt), (perDay.get(dayKey(r.createdAt)) ?? 0) + 1);
  const cuentasConSolicitudes = new Set(requests.map((r) => r.userId)).size;
  const dates = requests.map((r) => r.createdAt.getTime());
  const firstDate = dates.length ? new Date(Math.min(...dates)) : null;
  const daysActive = firstDate ? Math.max(1, Math.ceil((Date.now() - firstDate.getTime()) / 86_400_000)) : 1;
  const byUser = new Map<string, string[][]>();
  for (const r of requests) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r.offeredTitles]);

  let accounts = 0;
  let batches = 0;
  let titles = 0;
  let auto = 0;
  let band = 0;
  let heavyBatches = 0;
  const perAccount: Array<{ cuenta: string; solicitudes: number; muyParecidos: number; zonaJuez: number }> = [];
  let truncated = false;
  for (const [userId, lists] of byUser) {
    if (lists.length < 2) continue;
    if (Date.now() - started > BUDGET_MS || accounts >= MAX_ACCOUNTS) {
      truncated = true;
      break;
    }
    accounts += 1;
    const sim = buildSimilarity(lists.flat());
    let userAuto = 0;
    let userBand = 0;
    const previous: string[] = [...lists[0]];
    for (let i = 1; i < lists.length; i++) {
      let batchHits = 0;
      for (const title of lists[i]) {
        let best = 0;
        for (const p of previous) {
          const s = sim(title, p);
          if (s > best) best = s;
        }
        titles += 1;
        if (best >= GUARD.AUTO) {
          auto += 1;
          userAuto += 1;
          batchHits += 1;
        } else if (best >= GUARD.BAND) {
          band += 1;
          userBand += 1;
          batchHits += 1;
        }
      }
      batches += 1;
      if (batchHits >= 3) heavyBatches += 1;
      previous.push(...lists[i]);
    }
    perAccount.push({ cuenta: `…${userId.slice(-6)}`, solicitudes: lists.length, muyParecidos: userAuto, zonaJuez: userBand });
  }
  perAccount.sort((a, b) => b.muyParecidos + b.zonaJuez - (a.muyParecidos + a.zonaJuez));
  const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 0);
  return NextResponse.json({
    ok: true,
    resumen: `${accounts} cuentas con 2 o más solicitudes, ${batches} solicitudes comparadas con las anteriores de su cuenta, ${titles} títulos. Muy parecidos (≥ ${Math.round(GUARD.AUTO * 100)} %): ${auto} (${pct(auto, titles)} %). En la zona del juez (${Math.round(GUARD.BAND * 100)}–${Math.round(GUARD.AUTO * 100) - 1} %): ${band} (${pct(band, titles)} %). Solicitudes con 3 o más parecidos: ${heavyBatches} (${pct(heavyBatches, batches)} %).`,
    conteoReal: {
      totalSolicitudesConTitulos: requests.length,
      cuentasQueLaUsaron: cuentasConSolicitudes,
      primeraSolicitud: firstDate,
      diasDesdeLaPrimera: daysActive,
      promedioPorDia: Math.round((10 * requests.length) / daysActive) / 10,
      ultimos14Dias: [...perDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14).map(([dia, solicitudes]) => ({ dia, solicitudes })),
      nota: requests.length >= 4000 ? "Se leyeron las 4000 más antiguas; el conteo puede ser incompleto." : "Conteo completo de la ventana.",
    },
    cuentas: accounts,
    solicitudesComparadas: batches,
    titulos: titles,
    muyParecidos: auto,
    zonaDelJuez: band,
    solicitudesConTresOMasParecidos: heavyBatches,
    cortadoPorTiempo: truncated,
    ventana: "últimos 120 días",
    cuentasConMasParecidos: perAccount.slice(0, 10),
  });
}
