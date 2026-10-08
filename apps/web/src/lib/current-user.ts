import { cookies, headers } from "next/headers";
import { prisma } from "@auto-articulos/db";
import { refreshHubAccessForUser, type HubProductSlug } from "@/lib/hub-sync";
import { HUB_SESSION_CONTEXT_COOKIE, verifyHubSessionContextToken, type HubSessionContext } from "@/lib/session";

function getHubProductSlug(requestHeaders: Headers): HubProductSlug {
  return requestHeaders.get("x-hub-product-slug") === "auto-redes" ? "auto-redes" : "seo-total";
}

/** Solo válido dentro de rutas protegidas por proxy.ts */
export async function getCurrentUserId(): Promise<string> {
  const headerList = await headers();
  const userId = headerList.get("x-user-id");
  if (!userId) {
    throw new Error("getCurrentUserId() llamado fuera de una ruta protegida.");
  }
  await refreshHubAccessForUser(userId, getHubProductSlug(headerList)).catch((error) => {
    // During migration, a transient Hub outage must not interrupt Auto
    // Artículos. Successful Hub revocations are still enforced above.
    console.error("[HUB ACCESS] No se pudo revalidar el acceso", userId, error);
  });
  return userId;
}

export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      maxTitlesPerBatch: true,
      dailyArticleLimit: true,
      monthlyArticleLimit: true,
      platformDomain: true,
      contentLanguage: true,
      articleSignature: true,
      clientLocations: true,
      businessLocations: true,
      excludedTopics: true,
      allowInstagramPublishing: true,
      profilePhotoUrl: true,
      profilePhotoUrl2: true,
      profilePhotoUrl3: true,
      businessLogoUrl: true,
      businessLogoUrl2: true,
      opportunitiesDisclosureAcceptedAt: true,
      phone: true,
      imagePrompt: true,
      infographicPrompt: true,
      createdAt: true,
      isTrialSignup: true,
      trialStartedAt: true,
      trialUnlocked: true,
      disabledModules: true,
      hasImageCredits: true,
      defaultPromptId: true,
      allowLinkedInPublishing: true,
      allowThreadsPublishing: true,
      allowFacebookPublishing: true,
      allowPinterestPublishing: true,
      allowTumblrPublishing: true,
      allowBlueskyPublishing: true,
      allowDevToPublishing: true,
      allowBloggerPublishing: true,
      allowGoogleBusinessPublishing: true,
    },
  });
}

export function displayName(user: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  if (user.name) return user.name;
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ");
  }
  return user.email;
}

/** Lanza si el usuario actual no es admin. Usar en rutas/páginas de administración. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    throw new Error("Se requiere rol de administrador.");
  }
  return user;
}

/**
 * Si un admin está "actuando como" otro usuario (ver proxy.ts), devuelve los
 * datos básicos de ese admin real — independiente del rol del usuario
 * efectivo, para que el botón de "volver a mi cuenta" siga disponible aunque
 * el usuario suplantado no sea admin.
 */
export async function getActingAdmin() {
  const headerList = await headers();
  const currentUserId = headerList.get("x-user-id");
  const hubActorEmail = headerList.get("x-hub-acting-admin-email");
  let hubContext: HubSessionContext | null = headerList.get("x-hub-authenticated") === "1" && hubActorEmail
    ? {
        targetUserId: currentUserId ?? "",
        actorUserId: headerList.get("x-hub-acting-admin-id"),
        actorEmail: hubActorEmail,
        actorName: headerList.get("x-hub-acting-admin-name"),
      }
    : null;

  // Fallback for product requests where the Edge middleware header is not
  // preserved by the hosting adapter. The signed cookie is the source of
  // truth for Hub-originated sessions and remains scoped to this product.
  if (!hubContext && currentUserId) {
    const cookieStore = await cookies();
    const verified = await verifyHubSessionContextToken(
      cookieStore.get(HUB_SESSION_CONTEXT_COOKIE)?.value,
    );
    if (verified?.targetUserId === currentUserId) hubContext = verified;
  }

  if (hubContext?.actorUserId || hubContext?.actorEmail) {
    const actorFromProductDb = hubContext.actorUserId
      ? await prisma.user.findUnique({
          where: { id: hubContext.actorUserId },
          select: { id: true, name: true, firstName: true, lastName: true, email: true },
        })
      : null;
    return {
      id: hubContext.actorUserId ?? actorFromProductDb?.id ?? "hub-admin",
      name: hubContext.actorName ?? actorFromProductDb?.name ?? null,
      firstName: null,
      lastName: null,
      email: hubContext.actorEmail ?? actorFromProductDb?.email ?? "Administrador del Hub",
    };
  }
  const adminId = headerList.get("x-acting-admin-id");
  if (!adminId) return null;
  return prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, name: true, firstName: true, lastName: true, email: true },
  });
}

/** Usuario efectivo (el que ve la app) más, si aplica, el admin real detrás. */
export async function getSessionContext() {
  const [user, actingAdmin] = await Promise.all([
    getCurrentUser(),
    getActingAdmin(),
  ]);
  const requestHeaders = await headers();
  let hubAuthenticated = requestHeaders.get("x-hub-authenticated") === "1";
  if (!hubAuthenticated) {
    const cookieStore = await cookies();
    const hubContext = await verifyHubSessionContextToken(
      cookieStore.get(HUB_SESSION_CONTEXT_COOKIE)?.value,
    );
    hubAuthenticated = hubContext?.targetUserId === user.id;
  }
  return { user, actingAdmin, hubAuthenticated };
}
