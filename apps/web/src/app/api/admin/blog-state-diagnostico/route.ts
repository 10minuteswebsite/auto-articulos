import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@auto-articulos/db";
import { getCurrentUser, requireAdmin } from "@/lib/current-user";
import { hubBlogStateViaBroker } from "@/lib/hub-credential-transport";
import { parseBlogState } from "@/lib/hub-blog-state";

// TEMPORAL. SOLO ADMINISTRADOR, SOLO LECTURA. Una llamada a /blog-state por el puente desde el despliegue real,
// con el hub_user_id de la cuenta seleccionada ("Acceder como") por el admin; sin parámetros. Se borra tras la prueba (SWITCH-DESTINO-20261110).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  let hubUserId: string | null = null;
  try {
    const actingAdminId = (await headers()).get("x-acting-admin-id");
    if (actingAdminId) {
      const admin = await prisma.user.findUnique({ where: { id: actingAdminId }, select: { role: true } });
      if (admin?.role !== "admin") throw new Error("no admin");
      hubUserId = (await prisma.user.findUnique({ where: { id: (await getCurrentUser()).id }, select: { hubUserId: true } }))?.hubUserId ?? null;
    } else hubUserId = (await prisma.user.findUnique({ where: { id: (await requireAdmin()).id }, select: { hubUserId: true } }))?.hubUserId ?? null;
  } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403, headers: { "cache-control": "no-store" } }); }
  if (!hubUserId) return NextResponse.json({ error: "La cuenta seleccionada no tiene hub_user_id." }, { status: 400, headers: { "cache-control": "no-store" } });
  const HUB_USER_ID = hubUserId;
  const requestId = randomUUID(), correlationId = randomUUID();
  const calledAt = new Date().toISOString();
  const out: Record<string, unknown> = { calledAt, hubUserId: HUB_USER_ID, requestIdSent: requestId, correlationIdSent: correlationId };
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
