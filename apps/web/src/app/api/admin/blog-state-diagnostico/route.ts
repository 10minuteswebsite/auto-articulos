import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/current-user";
import { hubBlogStateViaBroker } from "@/lib/hub-credential-transport";
import { parseBlogState } from "@/lib/hub-blog-state";

// TEMPORAL. SOLO ADMINISTRADOR, SOLO LECTURA. Una llamada a /blog-state por el puente desde el despliegue real,
// siempre con la cuenta de Milton (id fijo, sin parámetros). Se borra tras la prueba (SWITCH-DESTINO-20261110).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const HUB_USER_ID = "a5700b1c-91ec-44cb-8cbd-a701181f607c";

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403, headers: { "cache-control": "no-store" } }); }
  const requestId = randomUUID(), correlationId = randomUUID();
  const calledAt = new Date().toISOString();
  const out: Record<string, unknown> = { calledAt, requestIdSent: requestId, correlationIdSent: correlationId };
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
