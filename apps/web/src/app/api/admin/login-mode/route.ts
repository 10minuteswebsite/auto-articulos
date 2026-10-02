import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { auditLog } from "@/lib/audit";
import { getLoginMode, setLoginMode } from "@/lib/login-mode";
import { checkLoginModeTransition, parseLoginMode } from "@/lib/login-policy";

export const dynamic = "force-dynamic";

/**
 * ¿Está conectado SEO Total con el HUB? Sin las credenciales del HUB no existe
 * forma de entrar por él, así que pasar el login a «hub» dejaría fuera a todos
 * los usuarios normales. Por eso el modo «hub» solo se puede activar cuando
 * las variables del HUB están configuradas.
 */
function hubIsConfigured(): boolean {
  return Boolean(process.env.AUTO_ARTICULOS_HUB_CLIENT_ID && process.env.AUTO_ARTICULOS_HUB_CLIENT_SECRET);
}

/** Modo del login con contraseña: «legacy» (hoy, todos) o «hub» (solo administradores). */
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(
      { mode: await getLoginMode(), hubConfigured: hubIsConfigured() },
      { headers: { "Cache-Control": "no-store" } },
    );
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
    if (next === "hub" && current !== "hub" && !hubIsConfigured()) {
      return NextResponse.json(
        { error: "El HUB todavía no está conectado a SEO Total: pasar a «solo HUB» dejaría sin entrada a los usuarios. Primero hay que configurar la conexión con el HUB." },
        { status: 409 },
      );
    }
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
