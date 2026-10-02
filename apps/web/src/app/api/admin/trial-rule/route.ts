import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { auditLog } from "@/lib/audit";
import { getTrialRuleEnabled, setTrialRuleEnabled } from "@/lib/trial-rule-setting";

export const dynamic = "force-dynamic";

/**
 * Regla de la prueba de 7 días. `enabled: true` (por defecto) = comportamiento de
 * hoy; `enabled: false` = la regla se elimina (decisión de Milton para el Día Cero,
 * cuando el HUB pasa a ser la única fuente de acceso). Reversible, no borra datos.
 */
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ enabled: await getTrialRuleEnabled() }, { headers: { "Cache-Control": "no-store" } });
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
    if (typeof body?.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled debe ser true o false" }, { status: 400 });
    }
    const previous = await getTrialRuleEnabled();
    await setTrialRuleEnabled(body.enabled);
    auditLog("trial_rule_updated", adminId, { from: previous, to: body.enabled });
    return NextResponse.json({ enabled: body.enabled });
  } catch (error) {
    console.error("[admin/trial-rule] PUT error:", error);
    return NextResponse.json({ error: "No se pudo actualizar la regla" }, { status: 500 });
  }
}
