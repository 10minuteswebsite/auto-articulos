import { NextRequest, NextResponse } from "next/server";
import { HUB_SESSION_CONTEXT_COOKIE, IMPERSONATION_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { clearCookie, cookieEnvForHost } from "@/lib/shared-cookies";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const cookieEnv = cookieEnvForHost(request.nextUrl.hostname);
  clearCookie(response, SESSION_COOKIE, { path: "/" }, cookieEnv);
  clearCookie(response, IMPERSONATION_COOKIE, { path: "/" }, cookieEnv);
  clearCookie(response, HUB_SESSION_CONTEXT_COOKIE, { path: "/" }, cookieEnv);
  return response;
}
