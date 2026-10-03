import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { encryptSecret, getTumblrAuthUrl, requestTumblrRequestToken } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";
import { getStoredTumblrAppCredentials } from "@/lib/tumblr-app-config";

import { TUMBLR_REQUEST_TOKEN_COOKIE, TUMBLR_STATE_COOKIE } from "./constants";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "tumblr"))) return NextResponse.json({ error: "Tumblr no está habilitado para este usuario." }, { status: 403 });
  try {
    const credentials = await getStoredTumblrAppCredentials();
    const reqUrl = new URL(request.url);
    const callbackUrl = `${reqUrl.protocol}//${reqUrl.host}/api/search-integrations/tumblr/callback`;
    const state = randomBytes(24).toString("base64url");
    // OAuth1 permite devolver el estado en el callback dinámico. El secreto del
    // token temporal nunca viaja en claro: se cifra antes de guardarlo en la
    // cookie HttpOnly y solo vive durante los diez minutos del flujo.
    const redirectUri = `${callbackUrl}?state=${encodeURIComponent(state)}`;
    const requestToken = await requestTumblrRequestToken(redirectUri, credentials);
    const response = NextResponse.redirect(getTumblrAuthUrl(requestToken.oauthToken));
    response.cookies.set(TUMBLR_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    response.cookies.set(TUMBLR_REQUEST_TOKEN_COOKIE, encryptSecret(JSON.stringify(requestToken)), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch (error) {
    console.error("Error iniciando Tumblr OAuth1:", {
      host: new URL(request.url).host,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(new URL("/dashboard/configuracion?tumblr=needs_config", request.url));
  }
}
