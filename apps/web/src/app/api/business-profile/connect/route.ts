import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import {
  BUSINESS_PROFILE_SCOPE,
  BUSINESS_PROFILE_STATE_COOKIE,
  businessProfileOAuthConfig,
} from "@/lib/google-oauth";
import { getOAuthRedirectUri, rememberOAuthOrigin } from "@/lib/oauth-redirect";
import { applyCookie } from "@/lib/shared-cookies";

export async function GET(request: NextRequest) {
  await getCurrentUserId();
  try {
    const config = businessProfileOAuthConfig();
    const { clientId } = config;
    const redirectUri = getOAuthRedirectUri(request, "/api/business-profile/callback", config.redirectUri);
    const state = randomBytes(24).toString("base64url");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: BUSINESS_PROFILE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    }).toString();
    const response = NextResponse.redirect(url);
    applyCookie(response, BUSINESS_PROFILE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    rememberOAuthOrigin(response, request);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
