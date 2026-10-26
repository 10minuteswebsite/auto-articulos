import { test } from "node:test";
import assert from "node:assert/strict";
import { isReusableAiImage } from "./aiImageGenerator";

const NOW = Date.UTC(2026, 9, 16, 12);

test("la imagen IA ya pagada se reutiliza solo si es válida y reciente", () => {
  const ok = { imageUrl: "https://blob.example/a.jpg", prompt: "p", createdAt: NOW - 3600_000 };
  assert.equal(isReusableAiImage(ok, NOW), true);
  assert.equal(isReusableAiImage({ ...ok, createdAt: NOW - 49 * 3600_000 }, NOW), false);
  assert.equal(isReusableAiImage({ ...ok, createdAt: NOW + 1000 }, NOW), false);
  assert.equal(isReusableAiImage({ ...ok, prompt: "" }, NOW), false);
  assert.equal(isReusableAiImage({ ...ok, imageUrl: "http://x" }, NOW), false);
  assert.equal(isReusableAiImage(null, NOW), false);
});

test("la imagen guardada no se reutiliza si cambió algún logo", () => {
  const ok = { imageUrl: "https://x/a.jpg", prompt: "p", createdAt: NOW };
  assert.equal(isReusableAiImage({ ...ok, logoKey: "https://x/viejo.png" }, NOW, "https://x/nuevo.png"), false);
  assert.equal(isReusableAiImage({ ...ok, logoKey: "https://x/nuevo.png" }, NOW, "https://x/nuevo.png"), true);
  assert.equal(isReusableAiImage(ok, NOW, "https://x/nuevo.png"), false);
  assert.equal(isReusableAiImage(ok, NOW, ""), true);
});
