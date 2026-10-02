import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { BING_SCOPE, BING_STATE_COOKIE, bingOAuthConfig } from "@/lib/bing-oauth";
import { getAllowedOAuthOrigin, getOAuthRedirectUri } from "@/lib/oauth-redirect";

export async function GET(request: NextRequest) {
  // Bing solo acepta el callback canónico cuando la petición llega desde un
  // host que no está en nuestra lista blanca; en ese caso llevamos primero la
  // sesión al host registrado para conservar cookie, state y sesión.
  if (!getAllowedOAuthOrigin(request)) {
    try {
      const canonical = new URL(bingOAuthConfig().redirectUri);
      return NextResponse.redirect(new URL("/dashboard/configuracion/conexiones?conexion=bing-webmaster", canonical.origin));
    } catch {
      // Sin configuración válida, el bloque principal devolverá el error habitual.
    }
  }
  await getCurrentUserId();
  try {
    const config = bingOAuthConfig();
    const { clientId } = config;
    const redirectUri = getOAuthRedirectUri(request, "/api/search-integrations/bing/callback", config.redirectUri);
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
    response.cookies.set(BING_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
