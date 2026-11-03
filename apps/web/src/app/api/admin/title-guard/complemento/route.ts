import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { getComplementMode, setComplementMode } from "@/lib/opportunity-complement";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// SOLO ADMINISTRADOR. Interruptor de EMERGENCIA del modo complementario del botón 2. Por defecto está activo y se regula solo (topes, presupuesto mensual, pausa por resultados vacíos); nadie tiene que tocarlo.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const info = await getComplementMode();
  return NextResponse.json({ modo: info.mode, configurado: info.configured, seApagaSolaEl: info.expiresAt, seleccionables: ["apagado", "sombra", "activo"] });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { modo?: unknown };
  if (body.modo !== "apagado" && body.modo !== "sombra" && body.modo !== "activo") {
    return NextResponse.json({ error: "Modo no permitido: apagado, sombra o activo." }, { status: 400 });
  }
  await setComplementMode(body.modo);
  return NextResponse.json({ ok: true, modo: body.modo });
}
