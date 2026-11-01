import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { SELECTABLE_MODES, SHADOW_MAX_DAYS, getTitleGuardModeInfo, setTitleGuardMode, type TitleGuardMode } from "@/lib/title-guard-mode";

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
  const body = (await request.json().catch(() => ({}))) as { modo?: unknown };
  const modo = body.modo as TitleGuardMode;
  if (!SELECTABLE_MODES.includes(modo)) {
    return NextResponse.json({ error: "Modo no permitido todavía. Elige «apagado» o «sombra»." }, { status: 400 });
  }
  await setTitleGuardMode(modo);
  return NextResponse.json({ ok: true, modo });
}
