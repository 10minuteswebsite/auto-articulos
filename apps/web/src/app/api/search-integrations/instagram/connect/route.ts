import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getInstagramAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredInstagramAppCredentials } from "@/lib/instagram-app-config";

import { INSTAGRAM_STATE_COOKIE } from "./constants";
import { applyCookie } from "@/lib/shared-cookies";
import { oauthCallbackUri, rememberOAuthOrigin } from "@/lib/oauth-redirect";

export async function GET(request: Request) {
  await getCurrentUserId();

  try {
    const appCreds = await getStoredInstagramAppCredentials();
    const redirectUri = oauthCallbackUri(request, "/api/search-integrations/instagram/callback");
    const state = randomBytes(24).toString("base64url");
    const authUrl = getInstagramAuthUrl(state, redirectUri, appCreds);

    const response = NextResponse.redirect(authUrl);
    applyCookie(response, INSTAGRAM_STATE_COOKIE, state, {
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
      new URL("/dashboard/configuracion?instagram=needs_config", reqUrl.origin)
    );
  }
}
