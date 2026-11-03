import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// SOLO ADMINISTRADOR, SOLO LECTURA, SIN IA Y SIN COSTO. Serie diaria de los últimos 45 días: cuántos artículos creados desde
// «CONTENIDO GENERADO POR IA» (Oportunidades) y cuántos «de otro origen» hubo, y de cuántas cuentas. Sirve para ver CUÁNDO cambió
// la producción del botón 2 y con qué cambio coincide (títulos del sitio 29/10, guardia 01/11).
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const since = new Date(Date.now() - 45 * 86_400_000);
  const rows = await prisma.title.findMany({
    where: { run: { createdAt: { gte: since } } },
    select: { opportunityCreatedAt: true, run: { select: { userId: true, createdAt: true } } },
    take: 60000,
  });
  const days = new Map<string, { modulo2: number; otros: number; cuentasModulo2: Set<string> }>();
  for (const r of rows) {
    const day = r.run.createdAt.toISOString().slice(0, 10);
    const d = days.get(day) ?? { modulo2: 0, otros: 0, cuentasModulo2: new Set<string>() };
    if (r.opportunityCreatedAt) {
      d.modulo2 += 1;
      d.cuentasModulo2.add(r.run.userId);
    } else d.otros += 1;
    days.set(day, d);
  }
  const serie = [...days.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, d]) => ({ dia, modulo2: d.modulo2, cuentasModulo2: d.cuentasModulo2.size, modulo2PorCuenta: d.cuentasModulo2.size ? Math.round((10 * d.modulo2) / d.cuentasModulo2.size) / 10 : 0, otros: d.otros }));
  return NextResponse.json({ ok: true, truncado: rows.length >= 60000, serie });
}
