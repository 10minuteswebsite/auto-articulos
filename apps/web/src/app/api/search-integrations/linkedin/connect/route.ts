import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getLinkedInAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredLinkedInAppCredentials } from "@/lib/linkedin-app-config";

import { LINKEDIN_STATE_COOKIE } from "./constants";
import { applyCookie, cookieEnvForHost } from "@/lib/shared-cookies";
import { NET_DEFAULT_ORIGIN, isNetProductHost, netCallbackUri } from "@/lib/oauth-redirect";

export async function GET(request: Request) {
  const reqHost = new URL(request.url).host;
  if (!isNetProductHost(reqHost)) {
    // LinkedIn solo vuelve a articulos/redes .net: se inicia desde allí para conservar sesión y state.
    return NextResponse.redirect(new URL("/api/search-integrations/linkedin/connect", NET_DEFAULT_ORIGIN));
  }
  await getCurrentUserId();

  try {
    const appCreds = await getStoredLinkedInAppCredentials();
    const redirectUri = netCallbackUri(request, "/api/search-integrations/linkedin/callback");
    const state = randomBytes(24).toString("base64url");
    const authUrl = getLinkedInAuthUrl(state, redirectUri, appCreds);

    const response = NextResponse.redirect(authUrl);
    applyCookie(response, LINKEDIN_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    }, cookieEnvForHost(reqHost));

    return response;
  } catch {
    const reqUrl = new URL(request.url);
    return NextResponse.redirect(
      new URL("/dashboard/configuracion?linkedin=needs_config", reqUrl.origin)
    );
  }
}
