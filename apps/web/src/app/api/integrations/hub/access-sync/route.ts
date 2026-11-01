import {validHubBackend} from '@/lib/hub-credential-transport';
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@auto-articulos/db";
import { syncLocalProductEntitlement } from "@/lib/hub-sync";
import { DEFAULT_SOCIAL_PUBLISHING_PERMISSIONS } from "@/lib/social-access";
import { newUserDefaultPromptData } from "@/lib/default-prompt";

export const runtime = "nodejs";

type AccessSyncPayload = {
  hub_user_id?: unknown;
  auth0_sub?: unknown;
  app?: unknown;
  allowed?: unknown;
  email?: unknown;
  name?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  phone?: unknown;
  role?: unknown;
};

function text(value: unknown, max = 240) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, max) : null;
}

/**
 * Hub -> Redes projection.
 *
 * Stripe/admin access is canonical in the Hub, while this app keeps a local
 * User row for its native tenant list and MCP session. Repeated deliveries are
 * safe: the tenant is resolved by hubUserId/email and the product entitlement
 * projection is idempotent.
 */
export async function POST(request: NextRequest) {
  let authenticated=false;
  try{authenticated=await validHubBackend(request)}catch{return NextResponse.json({error:'hub_unavailable'},{status:503})}
  if (!authenticated) {
    return NextResponse.json({ error: "Invalid product client" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const body = (await request.json().catch(() => null)) as AccessSyncPayload | null;
  const hubUserId = text(body?.hub_user_id, 120);
  const email = text(body?.email, 320)?.toLowerCase() ?? null;
  const appSlug = body?.app === "auto-redes" || body?.app === "seo-total" ? body.app : null;
  const allowed = typeof body?.allowed === "boolean" ? body.allowed : null;

  if (!hubUserId || !email || !appSlug || allowed === null) {
    return NextResponse.json({ error: "hub_user_id, email, app and allowed are required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const auth0Sub = text(body?.auth0_sub, 240);
  const name = text(body?.name, 240);
  const firstName = text(body?.first_name, 120);
  const lastName = text(body?.last_name, 120);
  const phone = text(body?.phone, 40);
  const role = body?.role === "admin" ? "admin" : "user";

  let user = await prisma.user.findUnique({ where: { hubUserId } });
  if (!user) user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
    user = await prisma.user.create({
      data: {
        email,
        name: name ?? email,
        firstName,
        lastName,
        phone,
        passwordHash,
        hubUserId,
        ...(auth0Sub ? { hubAuth0Sub: auth0Sub } : {}),
        hubSyncedAt: new Date(),
        role,
        trialUnlocked: allowed,
        ...(await newUserDefaultPromptData()),
        ...DEFAULT_SOCIAL_PUBLISHING_PERMISSIONS,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        ...(name ? { name } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(phone ? { phone } : {}),
        hubUserId,
        hubAuth0Sub: auth0Sub,
        hubSyncedAt: new Date(),
        ...(role === "admin" ? { role } : {}),
        trialUnlocked: allowed,
      },
    });
  }

  await syncLocalProductEntitlement(
    user.id,
    appSlug === "auto-redes" ? "REDES" : "ARTICULOS",
    allowed,
    `Proyección de acceso recibida desde Hub: ${appSlug}=${allowed ? "allowed" : "denied"}`,
  );

  return NextResponse.json(
    { ok: true, local_user_id: user.id, app: appSlug, allowed },
    { headers: { "Cache-Control": "no-store" } },
  );
}
