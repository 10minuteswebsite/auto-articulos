import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { auditLog } from "@/lib/audit";
import { getLoginMode, setLoginMode } from "@/lib/login-mode";
import { checkLoginModeTransition, parseLoginMode } from "@/lib/login-policy";

export const dynamic = "force-dynamic";

/** Modo del login con contraseña: «legacy» (hoy, todos) o «hub» (solo administradores). */
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ mode: await getLoginMode() }, { headers: { "Cache-Control": "no-store" } });
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
    if (body?.mode !== "legacy" && body?.mode !== "hub") {
      return NextResponse.json({ error: "mode debe ser legacy o hub" }, { status: 400 });
    }
    const next = parseLoginMode(body.mode);
    const current = await getLoginMode();
    const check = checkLoginModeTransition({ current, next, confirmation: body.confirm });
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 409 });
    await setLoginMode(next);
    auditLog("login_mode_updated", adminId, { from: current, to: next });
    return NextResponse.json({ mode: next });
  } catch (error) {
    console.error("[admin/login-mode] PUT error:", error);
    return NextResponse.json({ error: "No se pudo actualizar el modo de login" }, { status: 500 });
  }
}
