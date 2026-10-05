import { randomBytes, createHash } from "crypto";
import { NextResponse } from "next/server";
import { getTwitterAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredTwitterAppCredentials } from "@/lib/twitter-app-config";

import { TWITTER_STATE_COOKIE, TWITTER_VERIFIER_COOKIE } from "./constants";
import { applyCookie } from "@/lib/shared-cookies";
import { oauthCallbackUri, rememberOAuthOrigin } from "@/lib/oauth-redirect";

export async function GET(request: Request) {
  await getCurrentUserId();

  try {
    const appCreds = await getStoredTwitterAppCredentials();
    const redirectUri = oauthCallbackUri(request, "/api/search-integrations/twitter/callback");

    // Generar state y code_verifier para PKCE
    const state = randomBytes(24).toString("base64url");
    const codeVerifier = randomBytes(32)
      .toString("base64url")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    // Crear code_challenge (S256)
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const authUrl = getTwitterAuthUrl(state, codeChallenge, redirectUri, appCreds);

    const response = NextResponse.redirect(authUrl);

    applyCookie(response, TWITTER_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    applyCookie(response, TWITTER_VERIFIER_COOKIE, codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    rememberOAuthOrigin(response, request);

    return response;
  } catch {
    const reqUrl = new URL(request.url);
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?twitter=needs_config", reqUrl.origin)
    );
  }
}
