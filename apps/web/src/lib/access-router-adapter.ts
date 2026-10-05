import { routeAfterLogin, type AccessRoute } from "./access-router";
import { hasProductAccess } from "./product-access";
import { getAccessRouterEnabled } from "./access-router-setting";

/*
 * ADAPTADOR del router de acceso (Día Cero). La lógica pura la escribió Codex en
 * access-router.ts; aquí se le da lo que necesita:
 *  - los DERECHOS reales, calculados con hasProductAccess (la misma regla que
 *    usan las APIs y el worker, incluida la regla de «tener alguna red aprobada»),
 *  - las tres direcciones y la plataforma de facturación (configurables).
 * Devuelve una URL COMPLETA (https://…) o null si no hay que redirigir.
 * Cualquier error = null: un fallo técnico nunca redirige ni bloquea a nadie.
 */
export const ROUTER_HOSTS = {
  canonicalHost: "seototal.lasolucionweb.com",
  articulosHost: "articulos.lasolucionweb.com",
  redesHost: "redes.lasolucionweb.com",
} as const;

/** Plataforma de facturación (HUB). Configurable por variable de entorno; por defecto la que indicó Mario. */
export const DEFAULT_HUB_URL = "https://hub.lasolucionweb.net";

/** Normaliza «host» o «https://host» a una URL con origen https, sin ruta. */
export function toOriginUrl(value: string): string {
  const withProtocol = value.includes("://") ? value : `https://${value}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return withProtocol;
  }
}

/** Pura: convierte la decisión del router en una URL final, o null si no hay que moverse. */
export function finalRedirectUrl(route: AccessRoute, currentHost: string): string | null {
  if (route.kind !== "redirect") return null;
  const target = toOriginUrl(route.url);
  // Salvaguarda anti-bucle: nunca redirigir al mismo host en el que ya estamos.
  try {
    if (new URL(target).host.toLowerCase() === currentHost.trim().toLowerCase()) return null;
  } catch {
    return null;
  }
  return `${target}/dashboard`;
}

export async function resolveAccessRedirect(
  user: { id: string; role?: string | null },
  host: string | null,
  env: Record<string, string | undefined> = process.env,
): Promise<string | null> {
  try {
    if (!host || !(await getAccessRouterEnabled())) return null;
    const now = new Date();
    const [articulos, redes] = await Promise.all([
      hasProductAccess(user.id, "ARTICULOS", now),
      hasProductAccess(user.id, "REDES", now),
    ]);
    const route = routeAfterLogin({
      entitlements: [
        { product: "ARTICULOS", status: articulos.allowed ? "ACTIVE" : "INACTIVE" },
        { product: "REDES", status: redes.allowed ? "ACTIVE" : "INACTIVE" },
      ],
      role: user.role,
      host,
      now,
      config: { ...ROUTER_HOSTS, hubUrl: env.HUB_URL?.trim() || DEFAULT_HUB_URL },
    });
    return finalRedirectUrl(route, host);
  } catch (error) {
    console.error("[access-router] Error calculando la redirección; no se redirige:", error);
    return null;
  }
}
