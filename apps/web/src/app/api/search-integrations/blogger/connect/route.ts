import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getBloggerAuthUrl } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { bloggerOAuthConfig } from "@/lib/blogger-oauth";
import { canPublishToNetwork } from "@/lib/social-access";
import { BLOGGER_STATE_COOKIE } from "./constants";
import { applyCookie } from "@/lib/shared-cookies";
import { oauthCallbackUri, rememberOAuthOrigin } from "@/lib/oauth-redirect";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!(await canPublishToNetwork(userId, "blogger"))) return NextResponse.json({ error: "Blogger no está habilitado para este usuario." }, { status: 403 });
  try {
    const { clientId } = await bloggerOAuthConfig();
    const redirectUri = oauthCallbackUri(request, "/api/search-integrations/blogger/callback");
    const state = randomBytes(24).toString("base64url");
    const response = NextResponse.redirect(getBloggerAuthUrl(state, redirectUri, clientId));
    applyCookie(response, BLOGGER_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    rememberOAuthOrigin(response, request);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard/configuracion?blogger=needs_config", request.url));
  }
}
