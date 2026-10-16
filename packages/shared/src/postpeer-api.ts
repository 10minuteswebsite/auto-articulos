/** Minimal REST client for PostPeer's managed OAuth and publishing API. */
const POSTPEER_API = "https://api.postpeer.dev/v1";

export type PostPeerPlatform = "googlebusiness" | "threads";

export interface PostPeerIntegration {
  id: string;
  platform: string;
  platformUserId?: string | null;
  displayName?: string | null;
  imageUrl?: string | null;
  profileId?: string | null;
  createdAt?: string;
}

export interface PostPeerPostResult {
  success?: boolean;
  status?: string;
  postId?: string;
  platforms?: Array<{
    platform?: string;
    success?: boolean;
    platformPostUrl?: string;
    error?: string;
    warningMessage?: string;
  }>;
  message?: string;
}

/**
 * Enlace real de la publicación dentro de la respuesta de PostPeer
 * (`platforms[].platformPostUrl`). Acepta el objeto o el JSON guardado como texto.
 */
export function extractPostPeerPostUrl(result: unknown): string | null {
  let value = result;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return null; }
  }
  const platforms = (value as PostPeerPostResult | null)?.platforms;
  if (!Array.isArray(platforms)) return null;
  for (const item of platforms) {
    const url = item?.platformPostUrl?.trim();
    if (url && /^https?:\/\//i.test(url)) return url;
  }
  return null;
}

/**
 * PostPeer puede contestar HTTP 200 con `success:false`, un `error` por plataforma o
 * un estado fallido. Antes el worker solo miraba `status:"failed"` y marcaba como
 * «publicada» una publicación que Google nunca recibió. Devuelve el motivo legible
 * o null si no hay fallo explícito (una advertencia no cuenta como fallo).
 */
export function describePostPeerFailure(result: unknown): string | null {
  const value = result as PostPeerPostResult | null;
  if (!value || typeof value !== "object") return null;
  const platformErrors = (Array.isArray(value.platforms) ? value.platforms : [])
    .filter((item) => item?.success === false || (typeof item?.error === "string" && item.error.trim()))
    .map((item) => item.error?.trim() || "PostPeer no pudo publicar en Google Business.");
  if (platformErrors.length > 0) return platformErrors.join(" | ").slice(0, 500);
  const failedStatus = /^(failed|error|rejected)$/i.test(value.status?.trim() ?? "");
  if (value.success === false || failedStatus) {
    return (value.message?.trim() || "PostPeer informó que la publicación no se completó.").slice(0, 500);
  }
  return null;
}

function requireApiKey(apiKey: string): string {
  const value = apiKey.trim();
  if (!value) throw new Error("Falta la clave de API de PostPeer.");
  return value;
}

async function postPeerFetch<T>(apiKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${POSTPEER_API}${path}`, {
    ...init,
    headers: {
      "x-access-key": requireApiKey(apiKey),
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    // PostPeer puede tardar más de 15 s al subir la imagen real del artículo
    // y crear el post en GBP. El timeout corto dejaba la oportunidad en 1 %
    // y la marcaba como error aunque la petición siguiera siendo válida.
    signal: init.signal ?? AbortSignal.timeout(60000),
  });
  const data = (await response.json().catch(() => ({}))) as T & { message?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message ?? data.message ?? `PostPeer respondió ${response.status}.`);
  }
  return data;
}

export async function getPostPeerOAuthUrl(
  apiKey: string,
  platform: PostPeerPlatform,
  params: { profileId: string; redirectUri: string },
): Promise<string> {
  const query = new URLSearchParams({
    profileId: params.profileId,
    redirectUri: params.redirectUri,
  });
  const data = await postPeerFetch<{ url?: string }>(apiKey, `/connect/${platform}?${query}`);
  if (!data.url) throw new Error("PostPeer no devolvió una URL de conexión.");
  return data.url;
}

/**
 * Pide el enlace de autorización con el perfil guardado. Si PostPeer lo rechaza
 * (p. ej. 500 porque el perfil ya no existe para la clave vigente), crea un
 * perfil nuevo y reintenta una vez. Devuelve la URL y el perfil realmente usado.
 */
export async function getPostPeerOAuthUrlWithProfileRecovery(
  apiKey: string,
  platform: PostPeerPlatform,
  params: { profileId: string; redirectUri: (profileId: string) => string; newProfileName: string },
): Promise<{ url: string; profileId: string; recovered: boolean }> {
  try {
    const url = await getPostPeerOAuthUrl(apiKey, platform, { profileId: params.profileId, redirectUri: params.redirectUri(params.profileId) });
    return { url, profileId: params.profileId, recovered: false };
  } catch {
    const profileId = await createPostPeerProfile(apiKey, params.newProfileName);
    const url = await getPostPeerOAuthUrl(apiKey, platform, { profileId, redirectUri: params.redirectUri(profileId) });
    return { url, profileId, recovered: true };
  }
}

export async function createPostPeerProfile(apiKey: string, name: string): Promise<string> {
  const data = await postPeerFetch<{ profile?: { id?: string } }>(apiKey, "/profiles", {
    method: "POST",
    body: JSON.stringify({ name: name.trim().slice(0, 200) || "Auto Artículos" }),
  });
  if (!data.profile?.id) throw new Error("PostPeer no devolvió el perfil creado.");
  return data.profile.id;
}

export async function listPostPeerIntegrations(
  apiKey: string,
  params: { platform: PostPeerPlatform; profileId: string },
): Promise<PostPeerIntegration[]> {
  const query = new URLSearchParams({ platform: params.platform, profileId: params.profileId, limit: "100" });
  const data = await postPeerFetch<{ integrations?: PostPeerIntegration[] }>(apiKey, `/connect/integrations?${query}`);
  return (data.integrations ?? []).filter((item) => item.platform === params.platform);
}

export async function createPostPeerPost(
  apiKey: string,
  input: {
    accountId: string;
    content: string;
    imageUrl?: string;
    idempotencyKey: string;
    platform?: PostPeerPlatform;
  },
): Promise<PostPeerPostResult> {
  const platform = input.platform ?? "googlebusiness";
  return postPeerFetch<PostPeerPostResult>(apiKey, "/posts", {
    method: "POST",
    body: JSON.stringify({
      content: input.content,
      platforms: [{ platform, accountId: input.accountId }],
      ...(input.imageUrl ? { mediaItems: [{ type: "image", url: input.imageUrl }] } : {}),
      publishNow: true,
      idempotencyKey: input.idempotencyKey,
    }),
  });
}

export async function testPostPeerConnection(apiKey: string): Promise<void> {
  await postPeerFetch(apiKey, "/health/auth");
}

export async function disconnectPostPeerIntegration(apiKey: string, accountId: string): Promise<void> {
  await postPeerFetch(apiKey, `/connect/integrations/${encodeURIComponent(accountId)}`, { method: "DELETE" });
}
