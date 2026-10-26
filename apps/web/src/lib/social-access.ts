import { prisma } from "@auto-articulos/db";
import { hasLegacySocialModuleAccess } from "@auto-articulos/shared";
import { productOfHost } from "./product-routes";
import { canSeeSocialModule, type SocialHostContext } from "./modules";

/** Id del módulo en SYSTEM_MODULES (ver modules.ts); DashboardNav/ModuleGuard lo tratan aparte. */
export const SOCIAL_MODULE_ID = "oportunidades-redes";

/**
 * ¿Puede esta cuenta usar el módulo de redes sociales?
 *
 * Antes la interfaz y la API consultaban reglas distintas, incluida una
 * excepción fija para un correo. Ahora sale de las aprobaciones reales de
 * Administración: al menos una red o blog debe estar marcado para la cuenta.
 * Los administradores siempre lo tienen, para poder dar soporte.
 */
/**
 * ¿La petición actual llega por redes.lasolucionweb.com? Fuera de una petición
 * (sin cabeceras) devuelve false: se conserva el comportamiento anterior.
 */
export async function getSocialHostContext(): Promise<SocialHostContext> {
  try {
    const { headers } = await import("next/headers");
    const host = (await headers()).get("host");
    return { redesHost: productOfHost(host) === "REDES" };
  } catch {
    return {};
  }
}

/**
 * En redes.lasolucionweb.com todas las cuentas tienen todas las redes abiertas
 * (decisión de Milton, 2026-10-10): las marcas por red de Administración solo
 * rigen en seototal.lasolucionweb.com.
 */
export function openAllNetworks<T extends SocialPublishingPermissionUser>(
  user: T,
  context: SocialHostContext = {},
): T {
  if (!context.redesHost) return user;
  const open = Object.fromEntries(SOCIAL_PUBLISHING_PERMISSION_KEYS.map((key) => [key, true]));
  return { ...user, ...open };
}

export async function canUseSocialModule(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      hubUserId: true,
      disabledModules: true,
      productEntitlements: {
        where: { product: "REDES" },
        select: { status: true, graceUntil: true },
      },
      allowInstagramPublishing: true,
      allowFacebookPublishing: true,
      allowLinkedInPublishing: true,
      allowThreadsPublishing: true,
      allowPinterestPublishing: true,
      allowTumblrPublishing: true,
      allowBlueskyPublishing: true,
      allowBloggerPublishing: true,
      allowGoogleBusinessPublishing: true,
    },
  });
  if (!user) return false;

  const context = await getSocialHostContext();
  const entitlement = user.productEntitlements[0];

  // The Hub is authoritative for identities that came through the unified
  // login. An explicit local projection wins over the legacy module rule.
  if (user.role === "admin") return true;
  if (entitlement) {
    if (entitlement.status === "ACTIVE") return true;
    if (
      entitlement.status === "GRACE" &&
      entitlement.graceUntil &&
      entitlement.graceUntil.getTime() > Date.now()
    ) {
      return true;
    }
    return false;
  }

  // Fail closed for a Hub-linked user until the first successful projection;
  // otherwise the old host-wide Redes exception could grant MCP access.
  if (user.hubUserId) return false;

  return hasSocialModuleAccess(user, context);
}

export type SocialModuleAccessUser = {
  role?: string | null;
  disabledModules?: string | null;
} & SocialPublishingPermissionUser;

/**
 * Instancia superior pedida por Milton (1/10/2026): el administrador puede
 * aprobar o quitar el módulo entero de Redes para una cuenta, aparte de
 * decidir luego qué redes concretas ve. Vive como override del módulo
 * "oportunidades-redes" (mismo mecanismo que los demás módulos opt-in), con
 * una sola diferencia: sin «Habilitado» explícito no se entra en seototal;
 * las redes aprobadas solo deciden DÓNDE puede publicar una cuenta que ya
 * tiene el módulo, nunca le dan el módulo.
 */
export function hasSocialModuleAccess(
  user: SocialModuleAccessUser,
  context: SocialHostContext = {},
): boolean {
  if (!canSeeSocialModule(user, context)) return false;
  const open = openAllNetworks(user, context);
  return hasLegacySocialModuleAccess({
    role: user.role,
    disabledModules: user.disabledModules,
    approvals: SOCIAL_PUBLISHING_PERMISSION_KEYS.map((key) => open[key]),
  });
}

export type SocialPublishNetwork = "instagram" | "linkedin" | "threads" | "facebook" | "pinterest" | "tumblr" | "bluesky" | "blogger";

/** Campos que Administración controla para autorizar difusión social/blog. */
export const SOCIAL_PUBLISHING_PERMISSION_KEYS = [
  "allowInstagramPublishing",
  "allowFacebookPublishing",
  "allowLinkedInPublishing",
  "allowThreadsPublishing",
  "allowPinterestPublishing",
  "allowTumblrPublishing",
  "allowBlueskyPublishing",
  "allowBloggerPublishing",
  "allowGoogleBusinessPublishing",
] as const;

/** Contrato de alta: toda red nace disponible y la conexión OAuth sigue siendo necesaria. */
export const DEFAULT_SOCIAL_PUBLISHING_PERMISSIONS = {
  allowInstagramPublishing: true,
  allowFacebookPublishing: true,
  allowLinkedInPublishing: true,
  allowThreadsPublishing: true,
  allowPinterestPublishing: true,
  allowTumblrPublishing: true,
  allowBlueskyPublishing: true,
  allowBloggerPublishing: true,
  allowGoogleBusinessPublishing: true,
  allowMastodonPublishing: true,
} as const;

export type SocialPublishingPermissionUser = {
  role?: string | null;
} & Partial<Record<(typeof SOCIAL_PUBLISHING_PERMISSION_KEYS)[number], boolean | null>>;

/**
 * Regla única para mostrar y usar el módulo de difusión.
 * Un usuario regular necesita al menos una aprobación explícita del panel de
 * Administración. La conexión OAuth por sí sola nunca concede acceso.
 */
export function hasSocialPublishingApproval(user: SocialPublishingPermissionUser): boolean {
  if (user.role === "admin") return true;
  return SOCIAL_PUBLISHING_PERMISSION_KEYS.some((key) => user[key] === true);
}

/**
 * ¿Puede esta cuenta publicar en Pinterest, Tumblr o Bluesky? En redes.lasolucionweb.com todas
 * las redes están abiertas; en otros dominios manda la aprobación de Administración (los
 * administradores siempre pueden). Función pura para que la regla se pueda probar.
 */
export function isNetworkApprovedForPublishing(
  user: {
    role?: string | null;
    allowInstagramPublishing?: boolean | null;
    allowLinkedInPublishing?: boolean | null;
    allowPinterestPublishing?: boolean | null;
    allowTumblrPublishing?: boolean | null;
    allowBlueskyPublishing?: boolean | null;
  } | null | undefined,
  network: "instagram" | "linkedin" | "pinterest" | "tumblr" | "bluesky",
  context: SocialHostContext = {},
): boolean {
  if (context.redesHost) return true;
  if (user?.role === "admin") return true;
  const approval =
    network === "instagram" ? user?.allowInstagramPublishing
    : network === "linkedin" ? user?.allowLinkedInPublishing
    : network === "pinterest" ? user?.allowPinterestPublishing
    : network === "tumblr" ? user?.allowTumblrPublishing
    : user?.allowBlueskyPublishing;
  return approval === true;
}

/** Permiso individual de la red; los administradores siempre tienen acceso. */
export async function canPublishToNetwork(
  userId: string,
  network: SocialPublishNetwork,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      allowInstagramPublishing: true,
      allowLinkedInPublishing: true,
      allowThreadsPublishing: true,
      allowFacebookPublishing: true,
      allowPinterestPublishing: true,
      allowTumblrPublishing: true,
      allowBlueskyPublishing: true,
      allowBloggerPublishing: true,
    },
  });
  if (!user) return false;
  if (user.role === "admin") return true;
  if ((await getSocialHostContext()).redesHost) return true;
  const permissions: Record<SocialPublishNetwork, boolean> = {
    instagram: user.allowInstagramPublishing,
    linkedin: user.allowLinkedInPublishing,
    threads: user.allowThreadsPublishing,
    facebook: user.allowFacebookPublishing,
    pinterest: user.allowPinterestPublishing,
    tumblr: user.allowTumblrPublishing,
    bluesky: user.allowBlueskyPublishing,
    blogger: user.allowBloggerPublishing,
  };
  return permissions[network];
}
