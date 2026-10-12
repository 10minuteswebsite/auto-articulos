import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { isOpenComposioApp } from "@/lib/composio-access";
import { getSocialHostContext, openAllNetworks } from "@/lib/social-access";
import { ConnectionError, canUseComposioModule, type ConnectingUser } from "@/lib/composio-connections";

export const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };


/**
 * Persona con acceso pleno al módulo Composio. Se conserva para acciones que
 * no forman parte de la migración GSC, incluyendo desconexiones y redes Meta.
 */
export async function getComposioUser(): Promise<ConnectingUser | null> {
  const user = await getCurrentUser();
  return canUseComposioModule(user) ? user : null;
}

/**
 * Estado de Conexiones: todas las cuentas activas pueden verlo para completar
 * la migración de Google Search Console.
 */
export async function getComposioStatusUser(): Promise<ConnectingUser | null> {
  return withHostAccess(await getCurrentUser());
}

/** En redes.lasolucionweb.com todas las redes están abiertas, igual que en la pantalla de Redes. */
async function withHostAccess(user: ConnectingUser): Promise<ConnectingUser> {
  return openAllNetworks(user, await getSocialHostContext()) as ConnectingUser;
}

/**
 * Acciones de conexión: GSC/Analytics y las redes sociales por Composio (Facebook, Instagram,
 * Pinterest) están abiertas a toda cuenta; sus permisos por red siguen aplicando.
 */
export async function getComposioUserForApp(app: unknown): Promise<ConnectingUser | null> {
  const user = await getCurrentUser();
  if (isOpenComposioApp(app)) return withHostAccess(user);
  return canUseComposioModule(user) ? user : null;
}

export function forbidden() {
  return NextResponse.json({ error: "No autorizado" }, { status: 403, headers: NO_STORE });
}

export function errorResponse(error: unknown) {
  if (error instanceof ConnectionError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  }
  throw error;
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
