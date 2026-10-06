import { NextRequest, NextResponse } from "next/server";
import { connectionReturnPath } from "@/lib/connection-return";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, evaluateProductAccess, exchangeCodeForBloggerTokens, getBloggerBlogs } from "@auto-articulos/shared";
import { hasSocialModuleAccess } from "@/lib/social-access";
import { bloggerOAuthConfig, verifyBloggerOAuthState } from "@/lib/blogger-oauth";
import { BLOGGER_STATE_COOKIE } from "../connect/constants";
import { clearCookie } from "@/lib/shared-cookies";
import { clearOAuthOrigin, oauthCallbackUri, oauthReturnBase } from "@/lib/oauth-redirect";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const redirectError = () => {
    const response = NextResponse.redirect(new URL(connectionReturnPath("blogger", "error"), oauthReturnBase(request)));
    clearCookie(response, BLOGGER_STATE_COOKIE, { path: "/" });
    clearOAuthOrigin(response);
    return response;
  };
  if (oauthError || !code) return redirectError();
  const userId = verifyBloggerOAuthState(state);
  if (!userId) return redirectError();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      disabledModules: true,
      allowInstagramPublishing: true,
      allowFacebookPublishing: true,
      allowLinkedInPublishing: true,
      allowThreadsPublishing: true,
      allowPinterestPublishing: true,
      allowTumblrPublishing: true,
      allowBlueskyPublishing: true,
      allowDevToPublishing: true,
      allowBloggerPublishing: true,
      allowGoogleBusinessPublishing: true,
      productEntitlements: { where: { product: "REDES" }, select: { status: true, graceUntil: true } },
    },
  });
  const entitlement = user?.productEntitlements[0] ?? null;
  const access = user ? evaluateProductAccess({ role: user.role, product: "REDES", entitlement, legacyAllowsRedes: hasSocialModuleAccess(user), now: new Date() }) : null;
  if (!user || !access?.allowed) return redirectError();
  try {
    const { clientId, clientSecret } = await bloggerOAuthConfig();
    const redirectUri = oauthCallbackUri(request, "/api/search-integrations/blogger/callback");
    const tokens = await exchangeCodeForBloggerTokens(code, redirectUri, clientId, clientSecret);
    const blogs = await getBloggerBlogs(tokens.access_token);
    const blog = blogs[0];
    if (!blog) throw new Error("La cuenta de Google no tiene blogs de Blogger disponibles.");
    await prisma.bloggerIntegration.upsert({ where: { userId }, create: { userId, blogId: blog.id, blogName: blog.name, accessTokenEncrypted: encryptSecret(tokens.access_token), refreshTokenEncrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null }, update: { blogId: blog.id, blogName: blog.name, accessTokenEncrypted: encryptSecret(tokens.access_token), refreshTokenEncrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : undefined, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null } });
    const response = NextResponse.redirect(new URL(connectionReturnPath("blogger", "connected"), oauthReturnBase(request)));
    clearCookie(response, BLOGGER_STATE_COOKIE, { path: "/" });
    clearOAuthOrigin(response);
    return response;
  } catch (error) {
    console.error("Error en Blogger OAuth callback:", error);
    return NextResponse.redirect(new URL(connectionReturnPath("blogger", "error"), oauthReturnBase(request)));
  }
}
