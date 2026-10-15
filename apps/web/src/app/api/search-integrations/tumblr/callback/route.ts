import { NextRequest, NextResponse } from "next/server";
import { connectionReturnPath } from "@/lib/connection-return";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, exchangeTumblrAccessToken, getTumblrBlogs } from "@auto-articulos/shared";
import { canPublishToNetwork } from "@/lib/social-access";
import { getStoredTumblrAppCredentials } from "@/lib/tumblr-app-config";
import { takeTumblrPending } from "@/lib/tumblr-pending";

export async function GET(request: NextRequest) {
  // Tumblr OAuth1 redirects to the callback configured in the Tumblr app.
  // That legacy callback currently points to the Vercel alias, while the
  // user's Hub session lives on redes.lasolucionweb.net. Relay the OAuth
  // response to the canonical host before reading the session cookies.
  const canonicalOrigin = "https://redes.lasolucionweb.net";
  if (request.nextUrl.origin !== canonicalOrigin) {
    const canonicalCallback = new URL("/api/search-integrations/tumblr/callback", canonicalOrigin);
    request.nextUrl.searchParams.forEach((value, key) => canonicalCallback.searchParams.set(key, value));
    return NextResponse.redirect(canonicalCallback);
  }

  // La sesión puede no existir en este dominio (Tumblr vuelve siempre al .net):
  // la persona se identifica por el token temporal guardado al iniciar la conexión.
  const oauthToken = request.nextUrl.searchParams.get("oauth_token");
  const oauthVerifier = request.nextUrl.searchParams.get("oauth_verifier");
  const denied = request.nextUrl.searchParams.get("denied");
  const pending = oauthToken ? await takeTumblrPending(oauthToken) : null;
  const base = pending?.returnHost ? `https://${pending.returnHost}` : request.url;
  const fail = () => NextResponse.redirect(new URL(connectionReturnPath("tumblr", "error"), base));
  if (!pending || !oauthToken || !oauthVerifier || denied) return fail();
  const userId = pending.userId;
  if (!(await canPublishToNetwork(userId, "tumblr"))) return fail();
  try {
    const credentials = await getStoredTumblrAppCredentials();
    const tokens = await exchangeTumblrAccessToken({ oauthToken, oauthTokenSecret: pending.oauthTokenSecret }, oauthVerifier, credentials);
    const blogs = await getTumblrBlogs(tokens.oauthToken, tokens.oauthTokenSecret, credentials);
    const firstBlog = blogs[0];
    if (!firstBlog) throw new Error("La cuenta de Tumblr no tiene blogs disponibles.");
    await prisma.tumblrIntegration.upsert({
      where: { userId },
      create: { userId, blogIdentifier: firstBlog.identifier, blogTitle: firstBlog.title, accessTokenEncrypted: encryptSecret(tokens.oauthToken), accessTokenSecretEncrypted: encryptSecret(tokens.oauthTokenSecret), refreshTokenEncrypted: null, expiresAt: null, blogSelectionPending: true },
      update: { blogIdentifier: firstBlog.identifier, blogTitle: firstBlog.title, accessTokenEncrypted: encryptSecret(tokens.oauthToken), accessTokenSecretEncrypted: encryptSecret(tokens.oauthTokenSecret), refreshTokenEncrypted: null, expiresAt: null, blogSelectionPending: true },
    });
    return NextResponse.redirect(new URL(connectionReturnPath("tumblr", "connected"), base));
  } catch (error) {
    console.error("Error en Tumblr OAuth callback:", error);
    return fail();
  }
}
