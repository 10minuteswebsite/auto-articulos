import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnv, provisionTenant } from "./test-helpers";
import { MAX_MEDIA_BYTES, memoryMediaStore, storeMedia } from "./media";

test("R2 guarda bytes bajo el prefijo del tenant y D1 solo metadatos", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  const bucket = memoryMediaStore();
  const stored = await storeMedia(env.db, bucket, { tenantId: "t1", articleId: "a1", bytes: new Uint8Array([1, 2, 3]), mime: "image/png", altText: "Portada" }, "https://blog.uno.test", "m1");
  assert.equal(stored.key, "tenant/t1/media/m1.png");
  assert.equal(stored.url, "https://blog.uno.test/media/m1");
  assert.deepEqual([...bucket.objects.get(stored.key)!], [1, 2, 3]);
  const row = await env.db.first<{ r2_key: string; byte_size: number }>("SELECT r2_key, byte_size FROM media WHERE tenant_id = ?", ["t1"]);
  assert.equal(row?.r2_key, stored.key);
  assert.equal(row?.byte_size, 3);
});

test("R2 rechaza tipos y tamaños peligrosos, y limpia si falla D1", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  const bucket = memoryMediaStore();
  await assert.rejects(storeMedia(env.db, bucket, { tenantId: "t1", bytes: new Uint8Array([1]), mime: "text/html" }, "https://x.test"), /Tipo/);
  await assert.rejects(storeMedia(env.db, bucket, { tenantId: "t1", bytes: new Uint8Array(MAX_MEDIA_BYTES + 1), mime: "image/png" }, "https://x.test"), /límite/);
  const brokenDb = { ...env.db, run: async () => { throw new Error("db"); } };
  await assert.rejects(storeMedia(brokenDb, bucket, { tenantId: "t1", bytes: new Uint8Array([1]), mime: "image/png" }, "https://x.test", "broken"), /db/);
  assert.equal(bucket.objects.size, 0);
});
