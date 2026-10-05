import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectionReturnPath } from "@/lib/connection-return";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeCodeForInstagramTokens } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredInstagramAppCredentials } from "@/lib/instagram-app-config";
import { INSTAGRAM_STATE_COOKIE } from "../connect/constants";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");

  if (!state || state !== cookieStore.get(INSTAGRAM_STATE_COOKIE)?.value || !code) {
    return NextResponse.redirect(
      new URL(connectionReturnPath("instagram", "error"), request.url)
    );
  }

  try {
    const appCreds = await getStoredInstagramAppCredentials();
    const redirectUri = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/search-integrations/instagram/callback`;
    const tokens = await exchangeCodeForInstagramTokens(code, redirectUri, appCreds);

    const expiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000);
    const pendingKey = `instagram_oauth_pending:${userId}`;

    // La autorización puede incluir varias páginas. Guardamos el resultado
    // cifrado durante pocos minutos y dejamos que la persona elija una antes
    // de crear la integración definitiva.
    await prisma.systemSetting.upsert({
      where: { key: pendingKey },
      create: {
        key: pendingKey,
        encryptedValue: encryptSecret(JSON.stringify({ expiresAt: expiresAt.toISOString(), accounts: tokens.accounts })),
      },
      update: {
        encryptedValue: encryptSecret(JSON.stringify({ expiresAt: expiresAt.toISOString(), accounts: tokens.accounts })),
      },
    });

    const response = NextResponse.redirect(
      new URL(connectionReturnPath("instagram", "select"), request.url)
    );
    response.cookies.delete(INSTAGRAM_STATE_COOKIE);
    return response;
  } catch (error: any) {
    console.error("Error en Instagram OAuth callback:", error);
    return NextResponse.redirect(
      new URL(connectionReturnPath("instagram", "error"), request.url)
    );
  }
}
