import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@auto-articulos/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

const HUB_BASE_URL = "https://hub.lasolucionweb.net";
const APP_SLUG = "seo-total";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(code)) {
    return NextResponse.redirect(new URL("/login?error=hub_code", request.url));
  }

  const clientId = process.env.AUTO_ARTICULOS_HUB_CLIENT_ID;
  const clientSecret = process.env.AUTO_ARTICULOS_HUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "La conexión con el Hub no está configurada." }, { status: 503 });
  }

  const exchange = await fetch(`${process.env.HUB_BASE_URL || HUB_BASE_URL}/api/product-launch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-platform-client-id": clientId,
      Authorization: `Bearer ${clientSecret}`,
    },
    body: JSON.stringify({ code, app: APP_SLUG }),
    cache: "no-store",
  });
  const launch = (await exchange.json().catch(() => ({}))) as {
    platform_user_id?: string;
    auth0_sub?: string;
    email?: string;
    platform_role?: string;
    entitlement_status?: string;
    error?: string;
  };

  if (!exchange.ok || !launch.platform_user_id || !launch.email) {
    return NextResponse.redirect(new URL("/login?error=hub_code", request.url));
  }

  const email = launch.email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { hubUserId: launch.platform_user_id } });
  if (!user) user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
    user = await prisma.user.create({
      data: {
        email,
        name: email,
        passwordHash,
        hubUserId: launch.platform_user_id,
        hubAuth0Sub: launch.auth0_sub ?? null,
        hubSyncedAt: new Date(),
        role: launch.platform_role === "admin" ? "admin" : "user",
        trialUnlocked: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        hubUserId: launch.platform_user_id,
        hubAuth0Sub: launch.auth0_sub ?? null,
        hubSyncedAt: new Date(),
        trialUnlocked: true,
        ...(launch.platform_role === "admin" ? { role: "admin" } : {}),
      },
    });
  }

  const token = await createSessionToken(user.id);
  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
