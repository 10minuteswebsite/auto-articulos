import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectionReturnPath } from "@/lib/connection-return";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeCodeForMetaPageToken } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredInstagramAppCredentials } from "@/lib/instagram-app-config";
import { canPublishToNetwork } from "@/lib/social-access";
import { FACEBOOK_PAGES_STATE_COOKIE } from "../connect/constants";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");

  if (!(await canPublishToNetwork(userId, "facebook")) || !state || state !== cookieStore.get(FACEBOOK_PAGES_STATE_COOKIE)?.value || !code) {
    return NextResponse.redirect(new URL(connectionReturnPath("facebook", "error"), request.url));
  }

  try {
    const appCredentials = await getStoredInstagramAppCredentials();
    const redirectUri = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/search-integrations/facebook-pages/callback`;
    const token = await exchangeCodeForMetaPageToken(code, redirectUri, appCredentials);
    const expiresAt = new Date(Date.now() + token.expiresInSeconds * 1000);

    await prisma.facebookPageIntegration.upsert({
      where: { userId },
      create: {
        userId,
        facebookPageId: token.facebookPageId,
        facebookPageName: token.facebookPageName,
        accessTokenEncrypted: encryptSecret(token.pageAccessToken),
        expiresAt,
      },
      update: {
        facebookPageId: token.facebookPageId,
        facebookPageName: token.facebookPageName,
        accessTokenEncrypted: encryptSecret(token.pageAccessToken),
        expiresAt,
      },
    });

    const response = NextResponse.redirect(new URL(connectionReturnPath("facebook", "connected"), request.url));
    response.cookies.delete(FACEBOOK_PAGES_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("Error en Facebook Pages OAuth callback:", error);
    return NextResponse.redirect(new URL(connectionReturnPath("facebook", "error"), request.url));
  }
}
