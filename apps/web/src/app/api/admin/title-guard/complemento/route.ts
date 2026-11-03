import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { getComplementMode, setComplementMode } from "@/lib/opportunity-complement";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// SOLO ADMINISTRADOR. Interruptor del modo complementario del botón 2 (Fase 2: apagado o sombra; «activo» llega en la Fase 3).
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const info = await getComplementMode();
  return NextResponse.json({ modo: info.mode, configurado: info.configured, seApagaSolaEl: info.expiresAt, seleccionables: ["apagado", "sombra"] });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { modo?: unknown };
  if (body.modo !== "apagado" && body.modo !== "sombra") {
    return NextResponse.json({ error: "Modo no permitido: hoy solo apagado o sombra." }, { status: 400 });
  }
  await setComplementMode(body.modo);
  return NextResponse.json({ ok: true, modo: body.modo });
}
