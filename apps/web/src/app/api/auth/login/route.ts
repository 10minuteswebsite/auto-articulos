import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { getLoginMode } from "@/lib/login-mode";
import { createLoginLimiter, decidePasswordLogin } from "@/lib/login-policy";

// Límite de intentos solo cuando el login está en modo «hub» (puerta directa de
// administradores). En «legacy» (hoy) nada de esto se aplica.
const loginLimiter = createLoginLimiter();

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const { email, password } = payload as { email?: unknown; password?: unknown };
  const nativeForm = !contentType.includes("application/json");

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const mode = await getLoginMode();
    const limiterKey = `${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "ip"}|${email.trim().toLowerCase()}`;
    if (mode === "hub" && loginLimiter.isBlocked(limiterKey)) {
      return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
    }
    const user = await verifyCredentials(email, password);
    if (mode === "hub" && !user) loginLimiter.recordFailure(limiterKey);
    if (user && !decidePasswordLogin({ mode, role: user.role }).allow) {
      // Usuario normal con el login en modo «hub»: debe entrar por el HUB.
      if (nativeForm) return NextResponse.redirect(new URL("/login?error=hub", request.url), 303);
      return NextResponse.json({ error: "Entra por el HUB de La Solución IA." }, { status: 403 });
    }
    if (mode === "hub" && user) loginLimiter.reset(limiterKey);
    if (!user) {
      if (nativeForm) return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
      const response = NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      response.headers.set("Pragma", "no-cache");
      return response;
    }

    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ ok: true });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    if (nativeForm) {
      const redirect = NextResponse.redirect(new URL("/dashboard", request.url), 303);
      redirect.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return redirect;
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[LOGIN ERROR] ${email}: ${message}`);
    const response = NextResponse.json({ error: "Error interno", detail: message }, { status: 500 });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    return response;
  }
}
