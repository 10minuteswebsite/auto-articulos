// Almacenamiento de medios: metadatos en D1 y bytes en R2.
// El contrato permite probar localmente con MemoryMediaStore y ejecutar el
// mismo flujo con el binding R2 en Cloudflare. Nunca se acepta una clave R2
// arbitraria del cliente: siempre se genera bajo tenant/<tenant>/...

import type { Db } from "./db";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

export interface R2ObjectLike { arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } }
export interface R2BucketLike {
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
}

export interface MediaInput {
  tenantId: string;
  articleId?: string;
  bytes: ArrayBuffer | Uint8Array;
  mime: string;
  extension?: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface StoredMedia {
  id: string;
  key: string;
  mime: string;
  byteSize: number;
  url: string;
}

const extFor = (mime: string) => ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[mime] ?? "bin");
const bytesOf = (v: ArrayBuffer | Uint8Array) => v instanceof Uint8Array ? v.byteLength : v.byteLength;

export async function storeMedia(db: Db, bucket: R2BucketLike, input: MediaInput, publicOrigin: string, id: string = crypto.randomUUID()): Promise<StoredMedia> {
  if (!ALLOWED.has(input.mime)) throw new Error("Tipo de imagen no permitido");
  const size = bytesOf(input.bytes);
  if (size === 0 || size > MAX_MEDIA_BYTES) throw new Error("La imagen supera el límite permitido");
  if (input.width !== undefined && (!Number.isInteger(input.width) || input.width < 1 || input.width > 20_000)) throw new Error("Ancho de imagen inválido");
  if (input.height !== undefined && (!Number.isInteger(input.height) || input.height < 1 || input.height > 20_000)) throw new Error("Alto de imagen inválido");
  const key = `tenant/${input.tenantId}/media/${id}.${extFor(input.mime)}`;
  await bucket.put(key, input.bytes, { httpMetadata: { contentType: input.mime } });
  try {
    await db.run(
      `INSERT INTO media (id, tenant_id, article_id, r2_key, mime, byte_size, width, height, alt_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.tenantId, input.articleId ?? null, key, input.mime, size, input.width ?? null, input.height ?? null, input.altText ?? "", new Date().toISOString()],
    );
  } catch (e) {
    await bucket.delete(key).catch(() => {});
    throw e;
  }
  return { id, key, mime: input.mime, byteSize: size, url: `${publicOrigin.replace(/\/$/, "")}/media/${id}` };
}

export function memoryMediaStore(): R2BucketLike & { objects: Map<string, Uint8Array> } {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    async put(key, value) { objects.set(key, value instanceof Uint8Array ? value : new Uint8Array(value)); },
    async get(key) { const value = objects.get(key); return value ? { arrayBuffer: async () => new Uint8Array(value).slice().buffer } : null; },
    async delete(key) { objects.delete(key); },
  };
}
