import { runAllowedTool } from "./composio";

export interface ComposioSocialAccount { apiKey: string; userId: string; connectedAccountId: string; }

async function run(account: ComposioSocialAccount, app: "facebook" | "instagram" | "pinterest", toolSlug: string, args: Record<string, unknown>) {
  const result = await runAllowedTool(account.apiKey, { app, userId: account.userId, connectedAccountId: account.connectedAccountId, toolSlug, args });
  return result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
}

export async function composioFacebookPost(account: ComposioSocialAccount, pageId: string, message: string, imageUrl?: string) {
  return run(account, "facebook", imageUrl ? "FACEBOOK_CREATE_PHOTO_POST" : "FACEBOOK_CREATE_POST", imageUrl ? { page_id: pageId, message, url: imageUrl } : { page_id: pageId, message });
}

export async function composioInstagramPost(account: ComposioSocialAccount, instagramUserId: string, imageUrl: string, caption: string) {
  const created = await run(account, "instagram", "INSTAGRAM_POST_IG_USER_MEDIA", { ig_user_id: instagramUserId, image_url: imageUrl, caption });
  const creationId = String(created.id ?? created.creation_id ?? "");
  if (!creationId) return created;
  return run(account, "instagram", "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH", { ig_user_id: instagramUserId, creation_id: creationId });
}

function findPinId(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 4) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id === "string" && /^\d+$/.test(record.id)) return record.id;
  for (const inner of Object.values(record)) {
    const found = findPinId(inner, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Crea un Pin con imagen (por URL) en el tablero elegido. Devuelve el id y el enlace público del Pin. */
export async function composioPinterestPin(
  account: ComposioSocialAccount,
  input: { boardId: string; title: string; description: string; link: string; imageUrl: string },
): Promise<{ id: string | null; link: string | null }> {
  const created = await run(account, "pinterest", "PINTEREST_CREATE_PIN", {
    board_id: input.boardId,
    media_source: { source_type: "image_url", url: input.imageUrl },
    title: input.title.slice(0, 100),
    description: input.description.slice(0, 800),
    link: input.link,
  });
  const id = findPinId(created);
  return { id, link: id ? `https://www.pinterest.com/pin/${id}/` : null };
}

function findPermalink(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 4) return null;
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    if (key === "permalink" && typeof inner === "string" && /^https?:\/\//i.test(inner)) return inner;
    const found = findPermalink(inner, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Enlace público de una publicación de Instagram ya publicada; null si no se pudo obtener (nunca lanza). */
export async function composioInstagramPermalink(account: ComposioSocialAccount, mediaId: string): Promise<string | null> {
  if (!/^\d+$/.test(mediaId)) return null;
  try {
    return findPermalink(await run(account, "instagram", "INSTAGRAM_GET_IG_MEDIA", { ig_media_id: mediaId, fields: "permalink" }));
  } catch {
    return null;
  }
}

export { findPermalink as _findInstagramPermalink };
