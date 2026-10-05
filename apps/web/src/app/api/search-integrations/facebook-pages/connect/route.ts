import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getMetaPagesAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { getStoredInstagramAppCredentials } from "@/lib/instagram-app-config";
import { canPublishToNetwork } from "@/lib/social-access";
import { FACEBOOK_PAGES_STATE_COOKIE } from "./constants";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "facebook"))) {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(new URL("/dashboard/configuracion/conexiones?conexion=facebook&vista=difusion&resultado=forbidden", origin));
  }

  try {
    const appCredentials = await getStoredInstagramAppCredentials();
    const reqUrl = new URL(request.url);
    const redirectUri = `${reqUrl.protocol}//${reqUrl.host}/api/search-integrations/facebook-pages/callback`;
    const state = randomBytes(24).toString("base64url");
    const response = NextResponse.redirect(getMetaPagesAuthUrl(state, redirectUri, appCredentials));
    response.cookies.set(FACEBOOK_PAGES_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(new URL("/dashboard/configuracion/conexiones?conexion=facebook&vista=difusion&resultado=error", origin));
  }
}
