import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { auditLog } from "@/lib/audit";
import { getEnforcementMode, parseEnforcementMode, setEnforcementMode } from "@/lib/product-enforcement";

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
    await setEnforcementMode(mode);
    auditLog("product_enforcement_updated", adminId, { mode });
    return NextResponse.json({ mode });
  } catch (error) {
    console.error("[admin/product-enforcement] PUT error:", error);
    return NextResponse.json({ error: "No se pudo actualizar el interruptor" }, { status: 500 });
  }
}
