import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@auto-articulos/db";
import { syncLocalProductEntitlement } from "@/lib/hub-sync";

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

function isValidHubClient(request: Request) {
  const expectedId = process.env.AUTO_ARTICULOS_HUB_CLIENT_ID;
  const expectedSecret = process.env.AUTO_ARTICULOS_HUB_CLIENT_SECRET;
  const suppliedId = request.headers.get("x-platform-client-id") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const suppliedSecret = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!expectedId || !expectedSecret || suppliedId !== expectedId || !suppliedSecret) return false;

  const expected = Buffer.from(expectedSecret);
  const supplied = Buffer.from(suppliedSecret);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
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
  if (!isValidHubClient(request)) {
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
