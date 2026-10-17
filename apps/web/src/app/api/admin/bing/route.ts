import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { deleteBingCredentials, getStoredBingCredentials, maskBingValue, saveBingCredentials } from "@/lib/bing-credentials";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

async function status() {
  const stored = await getStoredBingCredentials();
  const fromEnv = Boolean(process.env.BING_WEBMASTER_CLIENT_ID && process.env.BING_WEBMASTER_CLIENT_SECRET);
  return {
    configured: Boolean(stored) || fromEnv,
    source: stored ? "admin" : fromEnv ? "env" : null,
    maskedClientId: stored ? maskBingValue(stored.clientId) : null,
    maskedClientSecret: stored ? maskBingValue(stored.clientSecret) : null,
    redirectUri: process.env.BING_WEBMASTER_REDIRECT_URI?.trim() || null,
  };
}

export async function GET() {
  await requireAdmin();
  return NextResponse.json(await status(), { headers: NO_STORE });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  const body = (await request.json().catch(() => null)) as { clientId?: unknown; clientSecret?: unknown } | null;
  const clientId = typeof body?.clientId === "string" ? body.clientId.trim() : "";
  const clientSecret = typeof body?.clientSecret === "string" ? body.clientSecret.trim() : "";
  if (clientId.length < 8 || /\s/.test(clientId)) {
    return NextResponse.json({ error: "El Client ID de Bing no es válido." }, { status: 400, headers: NO_STORE });
  }
  if (clientSecret.length < 8 || /\s/.test(clientSecret)) {
    return NextResponse.json({ error: "El Client Secret de Bing no es válido." }, { status: 400, headers: NO_STORE });
  }
  await saveBingCredentials(clientId, clientSecret);
  auditLog("bing.credentials_saved", admin.id);
  return NextResponse.json(await status(), { headers: NO_STORE });
}

export async function DELETE() {
  const admin = await requireAdmin();
  await deleteBingCredentials();
  auditLog("bing.credentials_deleted", admin.id);
  return NextResponse.json(await status(), { headers: NO_STORE });
}
