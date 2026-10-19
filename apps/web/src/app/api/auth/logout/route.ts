import { NextRequest, NextResponse } from "next/server";
import { HUB_SESSION_CONTEXT_COOKIE, IMPERSONATION_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { clearCookie, cookieEnvForHost } from "@/lib/shared-cookies";
import { getHubLogoutContinuation } from "@/lib/logout-bridge";

function clearSessionCookies(request: NextRequest, response: NextResponse) {
  const cookieEnv = cookieEnvForHost(request.nextUrl.hostname);
  clearCookie(response, SESSION_COOKIE, { path: "/" }, cookieEnv);
  clearCookie(response, IMPERSONATION_COOKIE, { path: "/" }, cookieEnv);
  clearCookie(response, HUB_SESSION_CONTEXT_COOKIE, { path: "/" }, cookieEnv);
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    getHubLogoutContinuation(request.nextUrl.searchParams.get("returnTo")),
    303,
  );
  clearSessionCookies(request, response);
  return response;
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(request, response);
  return response;
}
