import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Solo administrador. Lo que la guardia decidiría (modo sombra), solicitud por solicitud.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const rows = await prisma.titleGuardReport.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
    const total = await prisma.titleGuardReport.count();
    return NextResponse.json({
      disponible: true,
      total,
      reportes: rows.map((r) => ({
        id: r.id,
        fecha: r.createdAt,
        categoria: r.categoryName,
        modo: r.mode,
        candidatos: r.candidates,
        entregadosHoy: r.legacyTitles.length,
        limpios: r.nClean,
        parecidos: r.nSimilar,
        completadosConNota: r.completedWithNotes,
        juez: r.judgeUsed ? `${r.judgeModel} (${r.judgePairs} pares, ${r.judgeMs ?? "?"} ms)` : r.judgePairs > 0 ? "no respondió" : "no hizo falta",
        error: r.errorMessage,
        detalle: r.details,
      })),
    });
  } catch {
    return NextResponse.json({ disponible: false, mensaje: "La tabla del registro todavía no existe. Aplica la migración antes de pasar a modo sombra." });
  }
}
