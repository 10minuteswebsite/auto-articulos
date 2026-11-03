import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";
import { getBingSignals } from "@/lib/bing-signals";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// SOLO ADMINISTRADOR, SOLO LECTURA, SIN IA Y SIN COSTO. ¿Por qué el análisis de Oportunidades de una cuenta no usa Bing?
// GET ?correo=...  Muestra la conexión de Bing de la cuenta, la última evidencia guardada y el resultado de consultar Bing ahora.
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const correo = request.nextUrl.searchParams.get("correo")?.trim().toLowerCase();
  if (!correo) return NextResponse.json({ error: "Falta ?correo=" }, { status: 400 });
  const user = await prisma.user.findFirst({ where: { email: { equals: correo, mode: "insensitive" } }, select: { id: true, selectedSiteDomain: true } });
  if (!user) return NextResponse.json({ error: "No hay una cuenta con ese correo." }, { status: 404 });

  const integrations = await prisma.searchIntegration.findMany({
    where: { userId: user.id, provider: { in: ["bing", "google"] } },
    select: { provider: true, siteDomain: true, siteUrl: true },
  });
  const cache = await prisma.opportunityEvidenceCache.findMany({
    where: { userId: user.id },
    orderBy: { fetchedAt: "desc" },
    take: 8,
    select: { source: true, siteDomain: true, panel: true, status: true, errorMessage: true, fetchedAt: true, expiresAt: true, payload: true },
  });
  let ahora: unknown;
  try {
    const s = await getBingSignals(user.id);
    ahora = { conectado: s.connected, sitio: s.siteUrl ?? null, filas: s.rows.length, error: s.error ?? null, muestra: s.rows.slice(0, 5) };
  } catch (error) {
    ahora = { fallo: error instanceof Error ? error.message : String(error) };
  }
  return NextResponse.json({
    ok: true,
    sitioSeleccionado: user.selectedSiteDomain,
    conexiones: integrations,
    consultaDeBingAhora: ahora,
    evidenciaGuardada: cache.map((c) => ({
      fuente: c.source,
      sitio: c.siteDomain,
      estado: c.status,
      error: c.errorMessage,
      guardada: c.fetchedAt,
      vence: c.expiresAt,
      filas: Array.isArray((c.payload as { rows?: unknown[] } | null)?.rows) ? ((c.payload as { rows: unknown[] }).rows.length) : null,
    })),
  });
}
