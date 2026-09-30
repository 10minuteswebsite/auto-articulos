import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { BING_SCOPE, BING_STATE_COOKIE, bingOAuthConfig } from "@/lib/bing-oauth";

export async function GET(request: NextRequest) {
  // Bing devuelve siempre a la dirección registrada. Si la conexión se inició desde otro dominio del
  // proyecto (por ejemplo el de Vercel), la sesión y la cookie de seguridad no viajarían y el retorno
  // fallaría con un 401. Se lleva a la persona al dominio correcto antes de conectar.
  try {
    const canonical = new URL(bingOAuthConfig().redirectUri);
    if (request.nextUrl.host !== canonical.host) {
      return NextResponse.redirect(new URL("/dashboard/configuracion/conexiones?conexion=bing-webmaster", canonical.origin));
    }
  } catch {
    // Sin configuración válida: se sigue y el bloque de abajo responde el error de siempre.
  }
  await getCurrentUserId();
  try {
    const { clientId, redirectUri } = bingOAuthConfig();
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
