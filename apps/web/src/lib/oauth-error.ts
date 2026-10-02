import { NextResponse } from "next/server";
import { clearCookie } from "@/lib/shared-cookies";
import { clearOAuthOrigin, oauthReturnBase } from "@/lib/oauth-redirect";

/** Redirección de error OAuth que no deja la cookie temporal de state. */
export function oauthErrorRedirect(
  request: Request,
  path: string,
  cookies: string[],
): NextResponse {
  const response = NextResponse.redirect(new URL(path, oauthReturnBase(request)));
  for (const name of cookies) clearCookie(response, name, { path: "/" });
  clearOAuthOrigin(response);
  return response;
}
