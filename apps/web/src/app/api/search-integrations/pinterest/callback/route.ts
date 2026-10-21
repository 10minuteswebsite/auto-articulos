import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectionReturnPath } from "@/lib/connection-return";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeCodeForPinterestToken } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredPinterestAppCredentials } from "@/lib/pinterest-app-config";
import { canPublishToNetwork } from "@/lib/social-access";
import { PINTEREST_STATE_COOKIE } from "../connect/constants";
import { clearOAuthFlowCookies, oauthCallbackUri, oauthReturnBase } from "@/lib/oauth-redirect";

export async function GET(request: NextRequest) {
  const errorResponse = () => {
    const response = NextResponse.redirect(
      new URL(connectionReturnPath("pinterest", "error"), oauthReturnBase(request)),
    );
    clearOAuthFlowCookies(response, request, [PINTEREST_STATE_COOKIE]);
    return response;
  };

  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "pinterest"))) {
    const response = NextResponse.redirect(new URL(connectionReturnPath("pinterest", "forbidden"), oauthReturnBase(request)));
    clearOAuthFlowCookies(response, request, [PINTEREST_STATE_COOKIE]);
    return response;
  }
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!state || state !== cookieStore.get(PINTEREST_STATE_COOKIE)?.value || !code) {
    return errorResponse();
  }
  try {
    const credentials = await getStoredPinterestAppCredentials();
    const redirectUri = oauthCallbackUri(request, "/api/search-integrations/pinterest/callback");
    const token = await exchangeCodeForPinterestToken(code, redirectUri, credentials);
    await prisma.pinterestIntegration.upsert({
      where: { userId },
      create: { userId, accessTokenEncrypted: encryptSecret(token.access_token), refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : null, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null },
      update: { accessTokenEncrypted: encryptSecret(token.access_token), refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : undefined, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : undefined },
    });
    const response = NextResponse.redirect(new URL(connectionReturnPath("pinterest", "connected"), oauthReturnBase(request)));
    clearOAuthFlowCookies(response, request, [PINTEREST_STATE_COOKIE]);
    return response;
  } catch (error) {
    console.error("Error en Pinterest OAuth callback:", error);
    return errorResponse();
  }
}
