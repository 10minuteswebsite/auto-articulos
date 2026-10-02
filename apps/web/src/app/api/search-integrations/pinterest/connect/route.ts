import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getPinterestAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredPinterestAppCredentials } from "@/lib/pinterest-app-config";
import { canPublishToNetwork } from "@/lib/social-access";

import { PINTEREST_STATE_COOKIE } from "./constants";
import { applyCookie } from "@/lib/shared-cookies";
import { oauthCallbackUri, rememberOAuthOrigin } from "@/lib/oauth-redirect";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "pinterest"))) {
    return NextResponse.json({ error: "Pinterest no está habilitado para este usuario." }, { status: 403 });
  }
  try {
    const credentials = await getStoredPinterestAppCredentials();
    const redirectUri = oauthCallbackUri(request, "/api/search-integrations/pinterest/callback");
    const state = randomBytes(24).toString("base64url");
    const response = NextResponse.redirect(getPinterestAuthUrl(state, redirectUri, credentials));
    applyCookie(response, PINTEREST_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    rememberOAuthOrigin(response, request);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard/configuracion?pinterest=needs_config", request.url));
  }
}
