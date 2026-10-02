import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { auditLog } from "@/lib/audit";
import { getEnforcementMode, parseEnforcementMode, setEnforcementMode } from "@/lib/product-enforcement";
import { checkModeTransition } from "@/lib/product-enforcement-transition";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ mode: await getEnforcementMode() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
}

export async function PUT(request: NextRequest) {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const body = await request.json();
    if (body?.mode !== "off" && body?.mode !== "shadow" && body?.mode !== "enforce") {
      return NextResponse.json({ error: "mode debe ser off, shadow o enforce" }, { status: 400 });
    }
    const mode = parseEnforcementMode(body.mode);
    // Reglas de seguridad del cambio: a «Activo» solo desde «Sombra» y con
    // confirmación escrita. Volver atrás siempre es libre.
    const previous = await getEnforcementMode();
    const check = checkModeTransition({ current: previous, next: mode, confirmation: body.confirm });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 409 });
    }
    await setEnforcementMode(mode);
    auditLog("product_enforcement_updated", adminId, { from: previous, to: mode });
    return NextResponse.json({ mode });
  } catch (error) {
    console.error("[admin/product-enforcement] PUT error:", error);
    return NextResponse.json({ error: "No se pudo actualizar el interruptor" }, { status: 500 });
  }
}
