import { NextResponse } from "next/server";
import { HUB_SESSION_CONTEXT_COOKIE, IMPERSONATION_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { clearCookie } from "@/lib/shared-cookies";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearCookie(response, SESSION_COOKIE, { path: "/" });
  clearCookie(response, IMPERSONATION_COOKIE, { path: "/" });
  clearCookie(response, HUB_SESSION_CONTEXT_COOKIE, { path: "/" });
  return response;
}
