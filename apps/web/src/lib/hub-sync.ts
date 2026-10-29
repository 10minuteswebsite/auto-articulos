import { prisma } from "@auto-articulos/db";
import { normalizeLegacyPhone } from "./phone";

const DEFAULT_HUB_URL = "https://hub.lasolucionweb.net";
const ACCESS_CACHE_MS = 60_000;
const ACCESS_FAILURE_CACHE_MS = 30_000;
const HUB_ACCESS_TIMEOUT_MS = 3_000;
const accessCache = new Map<string, { allowed: boolean; expiresAt: number }>();
// Un fallo del Hub se recuerda unos segundos: sin esto, cada petición del
// dashboard (la página y sus APIs a la vez) espera el fallo por su cuenta.
const accessFailureCache = new Map<string, number>();
// Peticiones simultáneas del mismo usuario comparten una sola revalidación.
const inflightAccess = new Map<string, Promise<void>>();

type HubSyncResult = {
  hub_user_id: string;
  auth0_sub: string | null;
  product_access: boolean;
};

export type HubProductSlug = "seo-total" | "auto-redes";

type HubLocalProduct = "ARTICULOS" | "REDES";

function localProductForHubSlug(appSlug: HubProductSlug): HubLocalProduct {
  return appSlug === "auto-redes" ? "REDES" : "ARTICULOS";
}

/**
 * Projects the Hub decision into the local product-entitlement table. The
 * projection is idempotent and writes an audit event only when the decision
 * or its source changes. A successful Hub denial creates an explicit INACTIVE
 * row so legacy Redes access cannot reopen the product accidentally.
 */
export async function syncLocalProductEntitlement(
  userId: string,
  product: HubLocalProduct,
  allowed: boolean,
  reason = "Sincronización de acceso desde Hub",
): Promise<void> {
  const nextStatus = allowed ? "ACTIVE" : "INACTIVE";

  await prisma.$transaction(async (tx) => {
    const current = await tx.productEntitlement.findUnique({
      where: { userId_product: { userId, product } },
      select: { status: true, source: true, graceUntil: true },
    });

    const currentGrace = current?.graceUntil?.getTime() ?? null;
    const changed =
      !current ||
      current.status !== nextStatus ||
      current.source !== "HUB" ||
      currentGrace !== null;

    if (!changed) return;

    await tx.productEntitlement.upsert({
      where: { userId_product: { userId, product } },
      create: {
        userId,
        product,
        status: nextStatus,
        graceUntil: null,
        source: "HUB",
        note: reason,
        updatedBy: "hub-sync",
      },
      update: {
        status: nextStatus,
        graceUntil: null,
        source: "HUB",
        version: { increment: 1 },
        note: reason,
        updatedBy: "hub-sync",
      },
    });

    await tx.productEntitlementEvent.create({
      data: {
        userId,
        product,
        fromStatus: current?.status ?? null,
        toStatus: nextStatus,
        fromGraceUntil: current?.graceUntil ?? null,
        toGraceUntil: null,
        source: "HUB",
        reason,
      },
    });
  });
}

function getHubConfig() {
  const baseUrl = (process.env.HUB_BASE_URL || DEFAULT_HUB_URL).replace(/\/$/, "");
  const clientId = process.env.AUTO_ARTICULOS_HUB_CLIENT_ID;
  const clientSecret = process.env.AUTO_ARTICULOS_HUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { baseUrl, clientId, clientSecret };
}

/**
 * Revalidates local product access against the Hub. During the coexistence
 * window a temporary Hub outage fails open so Auto Artículos is not taken down;
 * a successful negative response is enforced locally on the next request.
 */
export async function refreshHubAccessForUser(userId: string, appSlug: HubProductSlug = "seo-total") {
  const cacheKey = `${userId}:${appSlug}`;
  const cached = accessCache.get(cacheKey);
  // Decisión del Hub ya proyectada en la base hace menos de un minuto: no hay
  // nada que consultar ni escribir (antes cada petición repetía 4+ consultas).
  if (cached && cached.expiresAt > Date.now()) return;
  const failedUntil = accessFailureCache.get(cacheKey);
  if (failedUntil && failedUntil > Date.now()) return;

  const running = inflightAccess.get(cacheKey);
  if (running) return running;

  const task = revalidateHubAccess(userId, appSlug, cacheKey).finally(() => {
    inflightAccess.delete(cacheKey);
  });
  inflightAccess.set(cacheKey, task);
  return task;
}

async function revalidateHubAccess(userId: string, appSlug: HubProductSlug, cacheKey: string) {
  const config = getHubConfig();
  if (!config) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hubUserId: true, trialUnlocked: true },
  });
  if (!user?.hubUserId) return;

  let allowed: boolean;
  try {
    const response = await fetch(`${config.baseUrl}/api/integrations/auto-articulos/access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-platform-client-id": config.clientId,
        Authorization: `Bearer ${config.clientSecret}`,
      },
      body: JSON.stringify({ hub_user_id: user.hubUserId, app: appSlug }),
      cache: "no-store",
      signal: AbortSignal.timeout(HUB_ACCESS_TIMEOUT_MS),
    });
    const payload = (await response.json().catch(() => ({}))) as { allowed?: unknown; error?: string };
    if (!response.ok || typeof payload.allowed !== "boolean") {
      throw new Error(payload.error || `Hub respondió ${response.status} al verificar acceso.`);
    }
    allowed = payload.allowed;
  } catch (error) {
    accessFailureCache.set(cacheKey, Date.now() + ACCESS_FAILURE_CACHE_MS);
    throw error;
  }
  accessCache.set(cacheKey, { allowed, expiresAt: Date.now() + ACCESS_CACHE_MS });

  await syncLocalProductEntitlement(
    userId,
    localProductForHubSlug(appSlug),
    allowed,
    `Revalidación Hub: ${appSlug}=${allowed ? "allowed" : "denied"}`,
  );

  if (allowed) {
    if (!user.trialUnlocked) {
      await prisma.user.update({ where: { id: userId }, data: { trialUnlocked: true } });
    }
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      trialUnlocked: false,
      isTrialSignup: true,
      trialStartedAt: new Date(0),
    },
  });
}

export async function syncUserToHub(userId: string): Promise<HubSyncResult | null> {
  const config = getHubConfig();
  if (!config) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("No se encontró el usuario para sincronizar con el Hub.");

  await prisma.user.update({
    where: { id: user.id },
    data: { hubSyncAttemptedAt: new Date(), hubSyncError: null },
  });

  const legacyPhone = process.env.HUB_OMIT_LEGACY_PHONES === 'true' ? null : normalizeLegacyPhone(user.phone);
  const response = await fetch(`${config.baseUrl}/api/integrations/auto-articulos/user-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-platform-client-id": config.clientId,
      Authorization: `Bearer ${config.clientSecret}`,
    },
    body: JSON.stringify({
      local_user_id: user.id,
      email: user.email,
      name: user.name,
      first_name: user.firstName,
      last_name: user.lastName,
      // Hub enforces E.164. Do not guess a country code while importing legacy
      // values; an invalid legacy number remains editable in the user's profile.
      ...(legacyPhone ? { phone: legacyPhone } : {}),
      role: user.role,
      product_access: user.trialUnlocked,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<HubSyncResult> & { error?: string };
  if (!response.ok || typeof payload.hub_user_id !== "string") {
    throw new Error(payload.error || `Hub respondió ${response.status} al sincronizar el usuario.`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hubUserId: payload.hub_user_id,
      hubAuth0Sub: typeof payload.auth0_sub === "string" ? payload.auth0_sub : null,
      hubSyncedAt: new Date(),
      hubSyncError: null,
    },
  });

  return {
    hub_user_id: payload.hub_user_id,
    auth0_sub: typeof payload.auth0_sub === "string" ? payload.auth0_sub : null,
    product_access: payload.product_access === true,
  };
}

export async function syncUserToHubBestEffort(userId: string) {
  try {
    await syncUserToHub(userId);
  } catch (error) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        hubSyncAttemptedAt: new Date(),
        hubSyncError: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000),
      },
    }).catch((persistError) => console.error("[HUB SYNC] No se pudo guardar el error", persistError));
    console.error("[HUB SYNC] No se pudo sincronizar el usuario", userId, error);
  }
}
