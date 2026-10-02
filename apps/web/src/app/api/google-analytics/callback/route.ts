import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId } from "@/lib/current-user";
import { GOOGLE_ANALYTICS_STATE_COOKIE, googleAnalyticsOAuthConfig } from "@/lib/google-analytics-oauth";
import { clearOAuthOrigin, getOAuthRedirectUri, oauthReturnBase } from "@/lib/oauth-redirect";
import { oauthErrorRedirect } from "@/lib/oauth-error";
import { clearCookie } from "@/lib/shared-cookies";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const store = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const target = new URL("/dashboard/configuracion", oauthReturnBase(request));
  if (!state || state !== store.get(GOOGLE_ANALYTICS_STATE_COOKIE)?.value || !code) {
    target.searchParams.set("googleAnalytics", "error");
    return oauthErrorRedirect(request, "/dashboard/configuracion", [GOOGLE_ANALYTICS_STATE_COOKIE]);
  }
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } });
    const config = googleAnalyticsOAuthConfig();
    const { clientId, clientSecret } = config;
    const redirectUri = getOAuthRedirectUri(request, "/api/google-analytics/callback", config.redirectUri);
    const result = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }) });
    const token = (await result.json()) as { refresh_token?: string };
    if (!result.ok || !token.refresh_token) throw new Error("Google no entregó refresh token.");
    const siteDomain = user.selectedSiteDomain ?? "";
    const existing = await prisma.searchIntegration.findFirst({ where: { userId, provider: "google-analytics", siteDomain } });
    if (existing) await prisma.searchIntegration.update({ where: { id: existing.id }, data: { encryptedRefreshToken: encryptSecret(token.refresh_token), siteUrl: null } });
    else await prisma.searchIntegration.create({ data: { userId, provider: "google-analytics", siteDomain, encryptedRefreshToken: encryptSecret(token.refresh_token) } });
    target.searchParams.set("googleAnalytics", "connected");
  } catch {
    target.searchParams.set("googleAnalytics", "error");
  }
  const response = NextResponse.redirect(target);
  clearCookie(response, GOOGLE_ANALYTICS_STATE_COOKIE, { path: "/" });
    clearOAuthOrigin(response);
  return response;
}
