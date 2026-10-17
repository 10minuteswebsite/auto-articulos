import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredBingCredentials } from "@/lib/bing-credentials";
import { BING_SCOPE, BING_STATE_COOKIE, bingExplicitRedirect, bingOAuthConfig } from "@/lib/bing-oauth";
import { rememberOAuthOrigin } from "@/lib/oauth-redirect";
import { applyCookie, cookieEnvForHost } from "@/lib/shared-cookies";

export async function GET(request: NextRequest) {
  // Bing solo acepta el callback canónico cuando la petición llega desde un
  // host que no está en nuestra lista blanca; en ese caso llevamos primero la
  // sesión al host registrado para conservar cookie, state y sesión.
  const explicit = bingExplicitRedirect();
  if (request.nextUrl.host.toLowerCase() !== explicit.host.toLowerCase()) {
    // Cliente nuevo de Bing: solo se conecta desde el host de su dirección registrada.
    return NextResponse.redirect(new URL("/dashboard/configuracion/conexiones?conexion=bing-webmaster", explicit.origin));
  }
  await getCurrentUserId();
  try {
    const config = bingOAuthConfig(await getStoredBingCredentials());
    const { clientId } = config;
    const redirectUri = explicit.toString();
    const state = randomBytes(24).toString("base64url");
    const url = new URL("https://www.bing.com/webmasters/oauth/authorize");
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: BING_SCOPE,
      state,
    }).toString();
    const response = NextResponse.redirect(url);
    applyCookie(response, BING_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    }, cookieEnvForHost(request.nextUrl.hostname));
    rememberOAuthOrigin(response, request);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
