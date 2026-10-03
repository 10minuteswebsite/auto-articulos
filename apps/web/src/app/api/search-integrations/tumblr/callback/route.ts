import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectionReturnPath } from "@/lib/connection-return";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret, exchangeTumblrAccessToken, getTumblrBlogs } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { canPublishToNetwork } from "@/lib/social-access";
import { getStoredTumblrAppCredentials } from "@/lib/tumblr-app-config";
import { TUMBLR_REQUEST_TOKEN_COOKIE, TUMBLR_STATE_COOKIE } from "../connect/constants";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const cookieStore = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const oauthToken = request.nextUrl.searchParams.get("oauth_token");
  const oauthVerifier = request.nextUrl.searchParams.get("oauth_verifier");
  const denied = request.nextUrl.searchParams.get("denied");
  const requestTokenCookie = cookieStore.get(TUMBLR_REQUEST_TOKEN_COOKIE)?.value;
  if (!(await canPublishToNetwork(userId, "tumblr")) || !state || state !== cookieStore.get(TUMBLR_STATE_COOKIE)?.value || !oauthToken || !oauthVerifier || denied || !requestTokenCookie) {
    return NextResponse.redirect(new URL(connectionReturnPath("tumblr", "error"), request.url));
  }
  try {
    const credentials = await getStoredTumblrAppCredentials();
    const requestToken = JSON.parse(decryptSecret(requestTokenCookie)) as { oauthToken?: string; oauthTokenSecret?: string };
    if (requestToken.oauthToken !== oauthToken || !requestToken.oauthTokenSecret) throw new Error("El token temporal de Tumblr no coincide con la sesión.");
    const tokens = await exchangeTumblrAccessToken({ oauthToken, oauthTokenSecret: requestToken.oauthTokenSecret }, oauthVerifier, credentials);
    const blogs = await getTumblrBlogs(tokens.oauthToken, tokens.oauthTokenSecret, credentials);
    const firstBlog = blogs[0];
    if (!firstBlog) throw new Error("La cuenta de Tumblr no tiene blogs disponibles.");
    await prisma.tumblrIntegration.upsert({
      where: { userId },
      create: { userId, blogIdentifier: firstBlog.identifier, blogTitle: firstBlog.title, accessTokenEncrypted: encryptSecret(tokens.oauthToken), accessTokenSecretEncrypted: encryptSecret(tokens.oauthTokenSecret), refreshTokenEncrypted: null, expiresAt: null, blogSelectionPending: true },
      update: { blogIdentifier: firstBlog.identifier, blogTitle: firstBlog.title, accessTokenEncrypted: encryptSecret(tokens.oauthToken), accessTokenSecretEncrypted: encryptSecret(tokens.oauthTokenSecret), refreshTokenEncrypted: null, expiresAt: null, blogSelectionPending: true },
    });
    const response = NextResponse.redirect(new URL(connectionReturnPath("tumblr", "connected"), request.url));
    response.cookies.delete(TUMBLR_STATE_COOKIE);
    response.cookies.delete(TUMBLR_REQUEST_TOKEN_COOKIE);
    return response;
  } catch (error) {
    console.error("Error en Tumblr OAuth callback:", error);
    return NextResponse.redirect(new URL(connectionReturnPath("tumblr", "error"), request.url));
  }
}
