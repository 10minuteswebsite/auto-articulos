import { NextResponse } from "next/server";
import { IMPERSONATION_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { clearCookie } from "@/lib/shared-cookies";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearCookie(response, SESSION_COOKIE, { path: "/" });
  clearCookie(response, IMPERSONATION_COOKIE, { path: "/" });
  return response;
}
