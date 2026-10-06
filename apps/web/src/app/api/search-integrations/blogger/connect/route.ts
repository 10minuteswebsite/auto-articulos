import { NextResponse } from "next/server";
import { getBloggerAuthUrl } from "@auto-articulos/shared";
import { getCurrentUser } from "@/lib/current-user";
import { bloggerOAuthConfig, createBloggerOAuthState } from "@/lib/blogger-oauth";
import { BLOGGER_STATE_COOKIE } from "./constants";
import { applyCookie } from "@/lib/shared-cookies";
import { oauthCallbackUri, rememberOAuthOrigin } from "@/lib/oauth-redirect";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user.canConfigureRedes) return NextResponse.json({ error: "Blogger no está habilitado para este usuario." }, { status: 403 });
  try {
    const { clientId } = await bloggerOAuthConfig();
    const redirectUri = oauthCallbackUri(request, "/api/search-integrations/blogger/callback");
    const state = createBloggerOAuthState(user.id);
    const response = NextResponse.redirect(getBloggerAuthUrl(state, redirectUri, clientId));
    applyCookie(response, BLOGGER_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    rememberOAuthOrigin(response, request);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard/configuracion?blogger=needs_config", request.url));
  }
}
