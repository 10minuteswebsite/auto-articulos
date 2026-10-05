import { prisma } from "@auto-articulos/db";
import {
  createPostPeerProfile,
  decryptSecret,
  disconnectPostPeerIntegration,
  getPostPeerOAuthUrl,
  listPostPeerIntegrations,
  testPostPeerConnection,
  type PostPeerPlatform,
} from "@auto-articulos/shared";
import { encryptSecret } from "@auto-articulos/shared";

export const POSTPEER_API_KEY_SETTING = "postpeer_api_key";

export async function savePostPeerApiKey(apiKey: string): Promise<void> {
  await prisma.systemSetting.upsert({ where: { key: POSTPEER_API_KEY_SETTING }, create: { key: POSTPEER_API_KEY_SETTING, encryptedValue: encryptSecret(apiKey) }, update: { encryptedValue: encryptSecret(apiKey) } });
}

export async function deletePostPeerApiKey(): Promise<void> {
  await prisma.systemSetting.deleteMany({ where: { key: POSTPEER_API_KEY_SETTING } });
}

export async function getPostPeerApiKey(): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: POSTPEER_API_KEY_SETTING } });
  if (!setting) return null;
  try { return decryptSecret(setting.encryptedValue); } catch { return null; }
}

export function maskPostPeerApiKey(value: string): string { return `••••••••${value.slice(-4)}`; }

async function getPostPeerSocialConnection(userId: string, platform: PostPeerPlatform) {
  return prisma.postPeerSocialConnection.findUnique({
    where: { userId_platform: { userId, platform } },
  });
}

/** Inicia una conexión social de PostPeer sin tocar ninguna conexión propia. */
export async function startPostPeerSocialConnection(
  userId: string,
  platform: PostPeerPlatform,
  redirectUri: string,
): Promise<string> {
  const apiKey = await getPostPeerApiKey();
  if (!apiKey) throw new Error("PostPeer aún no está configurado por el administrador.");

  let connection = await getPostPeerSocialConnection(userId, platform);
  let profileId = connection?.profileId;
  if (!profileId) {
    profileId = await createPostPeerProfile(apiKey, `SEO TOTAL - ${platform} - ${userId}`);
    connection = await prisma.postPeerSocialConnection.upsert({
      where: { userId_platform: { userId, platform } },
      create: { userId, platform, profileId, accountId: `pending-${profileId}`, status: "PENDING" },
      update: { profileId, status: "PENDING", lastError: null },
    });
  } else if (connection) {
    await prisma.postPeerSocialConnection.update({
      where: { id: connection.id },
      data: { status: "PENDING", lastError: null },
    });
  }

  const callback = new URL(redirectUri);
  callback.searchParams.set("profileId", profileId);
  callback.searchParams.set("platform", platform);
  return getPostPeerOAuthUrl(apiKey, platform, { profileId, redirectUri: callback.toString() });
}

export async function completePostPeerSocialConnection(
  platform: PostPeerPlatform,
  profileId: string,
): Promise<"connected" | "missing" | "error"> {
  const apiKey = await getPostPeerApiKey();
  const connection = await prisma.postPeerSocialConnection.findUnique({
    where: { profileId_platform: { profileId, platform } },
  });
  if (!apiKey || !connection) return "missing";

  try {
    const integrations = await listPostPeerIntegrations(apiKey, { platform, profileId });
    const integration = integrations[0];
    if (!integration) {
      await prisma.postPeerSocialConnection.update({
        where: { id: connection.id },
        data: { status: "ERROR", lastError: `No se encontró una cuenta de ${platform} conectada.` },
      });
      return "missing";
    }
    await prisma.postPeerSocialConnection.update({
      where: { id: connection.id },
      data: {
        accountId: integration.id,
        accountName: integration.displayName ?? null,
        status: "ACTIVE",
        connectedAt: new Date(),
        lastError: null,
      },
    });
    return "connected";
  } catch (error) {
    await prisma.postPeerSocialConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", lastError: error instanceof Error ? error.message : String(error) },
    });
    return "error";
  }
}

export async function verifyPostPeerSocialConnection(userId: string, platform: PostPeerPlatform): Promise<boolean> {
  const [apiKey, connection] = await Promise.all([
    getPostPeerApiKey(),
    getPostPeerSocialConnection(userId, platform),
  ]);
  if (!apiKey || !connection || connection.status !== "ACTIVE") return false;
  const integrations = await listPostPeerIntegrations(apiKey, { platform, profileId: connection.profileId });
  return integrations.some((item) => item.id === connection.accountId);
}

export async function disconnectPostPeerSocialConnection(userId: string, platform: PostPeerPlatform): Promise<void> {
  const [apiKey, connection] = await Promise.all([
    getPostPeerApiKey(),
    getPostPeerSocialConnection(userId, platform),
  ]);
  if (apiKey && connection?.status === "ACTIVE" && !connection.accountId.startsWith("pending-")) {
    await disconnectPostPeerIntegration(apiKey, connection.accountId);
  }
  await prisma.postPeerSocialConnection.updateMany({
    where: { userId, platform },
    data: { status: "DISCONNECTED" },
  });
}

export async function startPostPeerBusinessConnection(userId: string, redirectUri: string): Promise<string> {
  const apiKey = await getPostPeerApiKey();
  if (!apiKey) throw new Error("PostPeer aún no está configurado por el administrador.");
  let connection = await prisma.postPeerConnection.findUnique({ where: { userId } });
  let profileId = connection?.profileId;
  if (!profileId) {
    profileId = await createPostPeerProfile(apiKey, `Auto Artículos - ${userId}`);
    connection = await prisma.postPeerConnection.upsert({
      where: { userId },
      create: { userId, profileId, accountId: `pending-${profileId}`, status: "PENDING" },
      update: { profileId, status: "PENDING", lastError: null },
    });
  } else {
    await prisma.postPeerConnection.update({ where: { userId }, data: { status: "PENDING", lastError: null } });
  }
  const callback = new URL(redirectUri);
  callback.searchParams.set("profileId", profileId);
  return getPostPeerOAuthUrl(apiKey, "googlebusiness", { profileId, redirectUri: callback.toString() });
}

export async function completePostPeerBusinessConnection(profileId: string): Promise<"connected" | "missing" | "error"> {
  const apiKey = await getPostPeerApiKey();
  const connection = await prisma.postPeerConnection.findUnique({ where: { profileId } });
  if (!apiKey || !connection) return "missing";
  try {
    const integrations = await listPostPeerIntegrations(apiKey, { platform: "googlebusiness", profileId });
    const integration = integrations[0];
    if (!integration) {
      await prisma.postPeerConnection.update({ where: { id: connection.id }, data: { status: "ERROR", lastError: "No se encontró una cuenta Google Business Profile conectada." } });
      return "missing";
    }
    await prisma.postPeerConnection.update({
      where: { id: connection.id },
      data: { accountId: integration.id, accountName: integration.displayName ?? null, status: "ACTIVE", connectedAt: new Date(), lastError: null },
    });
    return "connected";
  } catch (error) {
    await prisma.postPeerConnection.update({ where: { id: connection.id }, data: { status: "ERROR", lastError: error instanceof Error ? error.message : String(error) } });
    return "error";
  }
}

export async function verifyPostPeerBusinessConnection(userId: string): Promise<boolean> {
  const apiKey = await getPostPeerApiKey();
  const connection = await prisma.postPeerConnection.findUnique({ where: { userId } });
  if (!apiKey || !connection || connection.status !== "ACTIVE") return false;
  const integrations = await listPostPeerIntegrations(apiKey, { platform: "googlebusiness", profileId: connection.profileId });
  return integrations.some((item) => item.id === connection.accountId);
}

export async function disconnectPostPeerBusinessConnection(userId: string): Promise<void> {
  const [apiKey, connection] = await Promise.all([
    getPostPeerApiKey(),
    prisma.postPeerConnection.findUnique({ where: { userId } }),
  ]);
  if (apiKey && connection?.status === "ACTIVE" && !connection.accountId.startsWith("pending-")) {
    await disconnectPostPeerIntegration(apiKey, connection.accountId);
  }
  await prisma.postPeerConnection.updateMany({ where: { userId }, data: { status: "DISCONNECTED" } });
}

export { testPostPeerConnection };
