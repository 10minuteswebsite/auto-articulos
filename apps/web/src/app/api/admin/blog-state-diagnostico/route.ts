import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@auto-articulos/db";
import { getCurrentUser, requireAdmin } from "@/lib/current-user";
import { hubBlogStateViaBroker } from "@/lib/hub-credential-transport";
import { parseBlogState } from "@/lib/hub-blog-state";

// TEMPORAL. SOLO ADMINISTRADOR, SOLO LECTURA. Una llamada a /blog-state por el puente desde el despliegue real,
// con el hub_user_id de la cuenta efectiva, o el indicado por el admin en ?hub_user_id= (solo UUID). Se borra tras la prueba (SWITCH-DESTINO-20261110).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "cache-control": "no-store" } });

export async function GET(request: Request) {
  let effective: { email: string; stored: string | null };
  let acting = false;
  try {
    const actingAdminId = (await headers()).get("x-acting-admin-id");
    if (actingAdminId) {
      const admin = await prisma.user.findUnique({ where: { id: actingAdminId }, select: { role: true } });
      if (admin?.role !== "admin") throw new Error("no admin");
      acting = true;
    } else await requireAdmin();
    const id = (await getCurrentUser()).id;
    const u = await prisma.user.findUnique({ where: { id }, select: { email: true, hubUserId: true } });
    effective = { email: u?.email ?? "", stored: u?.hubUserId ?? null };
  } catch { return no(403, "No autorizado"); }
  const asked = new URL(request.url).searchParams.get("hub_user_id");
  if (asked && !UUID.test(asked)) return no(400, "hub_user_id inválido.");
  const HUB_USER_ID = asked ?? effective.stored;
  if (!HUB_USER_ID) return no(400, "La cuenta seleccionada no tiene hub_user_id.");
  const requestId = randomUUID(), correlationId = randomUUID();
  const calledAt = new Date().toISOString();
  const out: Record<string, unknown> = { calledAt, hubUserId: HUB_USER_ID, source: asked ? "indicado por el admin" : "cuenta efectiva", effectiveEmail: effective.email, storedHubUserId: effective.stored, impersonating: acting, requestIdSent: requestId, correlationIdSent: correlationId };
  try {
    const r = await hubBlogStateViaBroker({ hub_user_id: HUB_USER_ID }, { "x-request-id": requestId, "x-correlation-id": correlationId });
    const text = await r.text();
    out.status = r.status;
    let json: unknown = null;
    try { json = JSON.parse(text); out.json = json; } catch { out.raw = text.slice(0, 500); }
    if (r.ok && json) { try { out.parsed = parseBlogState(json, HUB_USER_ID, { requestId, correlationId }); } catch (e) { out.parseError = (e as Error).message; } }
  } catch (e) { out.error = (e as Error).message; }
  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
