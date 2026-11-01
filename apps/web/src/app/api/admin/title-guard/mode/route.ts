import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { SELECTABLE_MODES, SHADOW_MAX_DAYS, getTitleGuardModeInfo, getTitleGuardPercent, parsePercent, setTitleGuardMode, setTitleGuardPercent, type TitleGuardMode } from "@/lib/title-guard-mode";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Solo administrador. Cambia el modo de la Guardia de ángulos sin desplegar código.
// Hoy solo se puede elegir «apagado» o «sombra»; «activo» llega en la Fase 3.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const info = await getTitleGuardModeInfo();
  return NextResponse.json({
    modo: info.mode,
    configurado: info.configured,
    porcentaje: await getTitleGuardPercent(),
    seApagaSolaEl: info.expiresAt,
    aviso: info.configured === "sombra" && info.mode === "apagado" ? `La sombra venció (se apaga sola a los ${SHADOW_MAX_DAYS} días). Vuelve a elegir «sombra» para renovarla.` : null,
    seleccionables: SELECTABLE_MODES,
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { modo?: unknown; porcentaje?: unknown };
  const modo = body.modo as TitleGuardMode;
  if (!SELECTABLE_MODES.includes(modo)) {
    return NextResponse.json({ error: "Modo no permitido. Elige «apagado», «sombra» o «activo»." }, { status: 400 });
  }
  // En modo activo el porcentaje decide a cuántas solicitudes se aplica; sin indicarlo empieza en 10 %.
  if (modo === "activo") await setTitleGuardPercent(body.porcentaje === undefined ? 10 : parsePercent(body.porcentaje));
  await setTitleGuardMode(modo);
  return NextResponse.json({ ok: true, modo, porcentaje: await getTitleGuardPercent() });
}
