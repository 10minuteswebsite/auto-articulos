import { prisma } from "@auto-articulos/db";

const DEFAULT_HUB_URL = "https://hub.lasolucionweb.net";
const ACCESS_CACHE_MS = 60_000;
const accessCache = new Map<string, { allowed: boolean; expiresAt: number }>();

type HubSyncResult = {
  hub_user_id: string;
  auth0_sub: string | null;
  product_access: boolean;
};

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
export async function refreshHubAccessForUser(userId: string) {
  const config = getHubConfig();
  if (!config) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hubUserId: true },
  });
  if (!user?.hubUserId) return;

  const cached = accessCache.get(userId);
  let allowed: boolean;
  if (cached && cached.expiresAt > Date.now()) {
    allowed = cached.allowed;
  } else {
    const response = await fetch(`${config.baseUrl}/api/integrations/auto-articulos/access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-platform-client-id": config.clientId,
        Authorization: `Bearer ${config.clientSecret}`,
      },
      body: JSON.stringify({ hub_user_id: user.hubUserId }),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as { allowed?: unknown; error?: string };
    if (!response.ok || typeof payload.allowed !== "boolean") {
      throw new Error(payload.error || `Hub respondió ${response.status} al verificar acceso.`);
    }
    allowed = payload.allowed;
    accessCache.set(userId, { allowed, expiresAt: Date.now() + ACCESS_CACHE_MS });
  }

  if (allowed) {
    await prisma.user.update({ where: { id: userId }, data: { trialUnlocked: true } });
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
      phone: user.phone,
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
