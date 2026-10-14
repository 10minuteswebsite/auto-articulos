import { NextResponse } from "next/server";
import { IMPERSONATION_COOKIE, SESSION_COOKIE } from "@/lib/session";

const ALLOWED_LOGOUT_HOSTS = new Map([
  ["hub.lasolucionweb.net", new Set(["/auth/logout"])],
  ["articulos.lasolucionweb.net", new Set(["/api/auth/logout"])],
  ["redes.lasolucionweb.net", new Set(["/api/auth/logout"])],
]);

function isSafeLogoutReturnTo(value: string | null, depth = 0): value is string {
  if (!value || depth > 2) return false;

  try {
    const url = new URL(value);
    const paths = ALLOWED_LOGOUT_HOSTS.get(url.hostname);
    if (url.protocol !== "https:" || !paths?.has(url.pathname)) return false;

    const keys = [...url.searchParams.keys()];
    if (keys.some((key) => key !== "returnTo")) return false;

    const nested = url.searchParams.get("returnTo");
    return !nested || isSafeLogoutReturnTo(nested, depth + 1);
  } catch {
    return false;
  }
}

function clearProductCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(IMPERSONATION_COOKIE, "", { path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  const returnTo = new URL(request.url).searchParams.get("returnTo");
  if (returnTo && isSafeLogoutReturnTo(returnTo)) {
    return clearProductCookies(NextResponse.redirect(returnTo, 303));
  }

  return clearProductCookies(NextResponse.json({ ok: true }));
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return clearProductCookies(response);
}
