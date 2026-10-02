import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeCodeForTwitterTokens } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredTwitterAppCredentials } from "@/lib/twitter-app-config";
import { TWITTER_STATE_COOKIE, TWITTER_VERIFIER_COOKIE } from "../connect/constants";
import { clearCookie } from "@/lib/shared-cookies";
import { clearOAuthOrigin, oauthCallbackUri, oauthReturnBase } from "@/lib/oauth-redirect";
import { oauthErrorRedirect } from "@/lib/oauth-error";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");

  if (!state || state !== cookieStore.get(TWITTER_STATE_COOKIE)?.value || !code) {
    return oauthErrorRedirect(request, "/dashboard/configuracion?twitter=error", [TWITTER_STATE_COOKIE, TWITTER_VERIFIER_COOKIE]);
  }

  const codeVerifier = cookieStore.get(TWITTER_VERIFIER_COOKIE)?.value;
  if (!codeVerifier) {
    return oauthErrorRedirect(request, "/dashboard/configuracion?twitter=error", [TWITTER_STATE_COOKIE, TWITTER_VERIFIER_COOKIE]);
  }

  try {
    const appCreds = await getStoredTwitterAppCredentials();
    const redirectUri = oauthCallbackUri(request, "/api/search-integrations/twitter/callback");
    const tokens = await exchangeCodeForTwitterTokens(code, codeVerifier, redirectUri, appCreds);

    const expiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000);

    await prisma.twitterIntegration.upsert({
      where: { userId },
      create: {
        userId,
        twitterUserId: tokens.twitterUserId,
        twitterUsername: tokens.twitterUsername,
        accessTokenEncrypted: encryptSecret(tokens.accessToken),
        refreshTokenEncrypted: encryptSecret(tokens.refreshToken),
        expiresAt,
      },
      update: {
        twitterUserId: tokens.twitterUserId,
        twitterUsername: tokens.twitterUsername,
        accessTokenEncrypted: encryptSecret(tokens.accessToken),
        refreshTokenEncrypted: encryptSecret(tokens.refreshToken),
        expiresAt,
      },
    });

    const response = NextResponse.redirect(
      new URL("/dashboard/configuracion?twitter=connected", oauthReturnBase(request))
    );
    clearCookie(response, TWITTER_STATE_COOKIE, { path: "/" });
    clearCookie(response, TWITTER_VERIFIER_COOKIE, { path: "/" });
    clearOAuthOrigin(response);
    return response;
  } catch (error) {
    console.error("Error en Twitter OAuth callback:", error);
    return oauthErrorRedirect(request, "/dashboard/configuracion?twitter=error", [TWITTER_STATE_COOKIE, TWITTER_VERIFIER_COOKIE]);
  }
}
