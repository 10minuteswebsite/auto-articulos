import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { validHubBackend } from "@/lib/hub-credential-transport";
import { completeConnection, startConnection, type ConnectingUser } from "@/lib/composio-connections";
import { findComposioApp } from "@/lib/composio";
import { isOpenComposioApp } from "@/lib/composio-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

async function hubUser(hubUserId: unknown) {
  if (typeof hubUserId !== "string" || hubUserId.length < 1 || hubUserId.length > 120) return null;
  return prisma.user.findUnique({ where: { hubUserId }, select: { id: true } });
}

function centralUser(id: string): ConnectingUser {
  return { id, role: "admin", allowFacebookPublishing: true, allowInstagramPublishing: true, allowPinterestPublishing: true };
}

export async function POST(request: NextRequest) {
  try {
    if (!(await validHubBackend(request))) return reply({ error: "unauthorized" }, 401);
    const body = await request.json().catch(() => null) as { operation?: unknown; hub_user_id?: unknown; app?: unknown; origin?: unknown; connected_account_id?: unknown } | null;
    const operation = body?.operation;
    const app = findComposioApp(body?.app)?.id;
    if (!app || !isOpenComposioApp(app)) return reply({ error: "invalid_app" }, 400);
    const user = await hubUser(body?.hub_user_id);
    if (!user) return reply({ error: "hub_user_not_projected" }, 404);
    const actor = centralUser(user.id);

    if (operation === "start") {
      if (typeof body?.origin !== "string" || !/^https:\/\//.test(body.origin)) return reply({ error: "invalid_origin" }, 400);
      const started = await startConnection(actor, app, body.origin);
      return reply({ redirectUrl: started.redirectUrl });
    }

    if (operation === "complete") {
      if (typeof body?.connected_account_id !== "string" || body.connected_account_id.length > 200) return reply({ error: "invalid_account" }, 400);
      const outcome = await completeConnection(actor, app, body.connected_account_id);
      return reply({ outcome });
    }

    return reply({ error: "invalid_operation" }, 400);
  } catch {
    return reply({ error: "connection_unavailable" }, 503);
  }
}
