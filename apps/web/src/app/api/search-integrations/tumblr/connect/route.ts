import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { encryptSecret, getTumblrAuthUrl, requestTumblrRequestToken } from "@auto-articulos/shared";
import { getCurrentUser } from "@/lib/current-user";
import { getStoredTumblrAppCredentials } from "@/lib/tumblr-app-config";

import { TUMBLR_REQUEST_TOKEN_COOKIE, TUMBLR_STATE_COOKIE } from "./constants";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user.canConfigureRedes) return NextResponse.json({ error: "Tumblr no está habilitado para este usuario." }, { status: 403 });
  try {
    const credentials = await getStoredTumblrAppCredentials();
    const state = randomBytes(24).toString("base64url");
    // Tumblr OAuth1 usa el callback configurado en la aplicación de Tumblr;
    // su endpoint de token temporal rechaza oauth_callback dinámicos.
    // El secreto del token temporal nunca viaja en claro: se cifra antes de
    // guardarlo en la cookie HttpOnly y solo vive durante los diez minutos del flujo.
    const requestToken = await requestTumblrRequestToken(credentials);
    const response = NextResponse.redirect(getTumblrAuthUrl(requestToken.oauthToken));
    response.cookies.set(TUMBLR_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    response.cookies.set(TUMBLR_REQUEST_TOKEN_COOKIE, encryptSecret(JSON.stringify({ ...requestToken, userId: user.id })), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch (error) {
    console.error("Error iniciando Tumblr OAuth1:", {
      host: new URL(request.url).host,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(new URL("/dashboard/configuracion?tumblr=needs_config", request.url));
  }
}
