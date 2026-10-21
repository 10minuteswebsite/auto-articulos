import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCoverPrompt, generateBlogCover, resolveCoverProvider, resolveCoverQuality } from "./blogCoverImage";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("el proveedor por defecto es openai y solo «fal» activa fal", () => {
  assert.equal(resolveCoverProvider(undefined), "openai");
  assert.equal(resolveCoverProvider(""), "openai");
  assert.equal(resolveCoverProvider("Fal "), "fal");
  assert.equal(resolveCoverProvider("otro"), "openai");
});

test("el prompt prohíbe texto y recorta el tema", () => {
  const p = buildCoverPrompt("Medicaid  en Florida", "x".repeat(2000));
  assert.match(p, /NO text/);
  assert.match(p, /NO logos/);
  assert.ok(p.length < 1200);
});

test("openai: genera con calidad baja y devuelve la imagen", async () => {
  let sent: { url: string; body: Record<string, unknown>; auth: string | null } | null = null;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    sent = { url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get("authorization") };
    return json({ data: [{ b64_json: b64(PNG) }] });
  }) as unknown as typeof fetch;
  const r = await generateBlogCover({ title: "T", summary: "S", provider: "openai", openaiKey: "k", fetchImpl });
  assert.ok(r);
  assert.equal(r!.mime, "image/png");
  assert.equal(r!.provider, "openai");
  assert.equal(sent!.body.model, "gpt-image-1-mini");
  assert.equal(sent!.body.quality, "low");
  assert.equal(sent!.auth, "Bearer k");
});

test("fal: pide la imagen y la descarga", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (url: string) => {
    calls.push(url);
    if (url.includes("fal.run")) return json({ images: [{ url: "https://cdn.fal.test/x.png" }] });
    return new Response(PNG, { status: 200 });
  }) as unknown as typeof fetch;
  const r = await generateBlogCover({ title: "T", summary: "S", provider: "fal", falKey: "k", fetchImpl });
  assert.ok(r);
  assert.equal(r!.provider, "fal");
  assert.equal(calls.length, 2);
});

test("sin clave, con error HTTP, red caída o contenido no imagen → null (nunca lanza)", async () => {
  const bad = (async () => json({ error: "x" }, 500)) as unknown as typeof fetch;
  assert.equal(await generateBlogCover({ title: "T", summary: "S", provider: "openai", fetchImpl: bad }), null);
  assert.equal(await generateBlogCover({ title: "T", summary: "S", provider: "openai", openaiKey: "k", fetchImpl: bad }), null);
  const down = (async () => { throw new Error("red"); }) as unknown as typeof fetch;
  assert.equal(await generateBlogCover({ title: "T", summary: "S", provider: "fal", falKey: "k", fetchImpl: down }), null);
  const html = (async () => json({ data: [{ b64_json: Buffer.from("<html>no soy imagen</html>").toString("base64") }] })) as unknown as typeof fetch;
  assert.equal(await generateBlogCover({ title: "T", summary: "S", provider: "openai", openaiKey: "k", fetchImpl: html }), null);
  const noHttps = (async () => json({ images: [{ url: "http://insegura.test/x.png" }] })) as unknown as typeof fetch;
  assert.equal(await generateBlogCover({ title: "T", summary: "S", provider: "fal", falKey: "k", fetchImpl: noHttps }), null);
});

test("calidad: solo «medium» sube de nivel y se envía a OpenAI", async () => {
  assert.equal(resolveCoverQuality(undefined), "low");
  assert.equal(resolveCoverQuality("high"), "low");
  assert.equal(resolveCoverQuality(" Medium "), "medium");
  let q: unknown;
  const fetchImpl = (async (_u: string, init: RequestInit) => { q = JSON.parse(String(init.body)).quality; return json({ data: [{ b64_json: b64(PNG) }] }); }) as unknown as typeof fetch;
  await generateBlogCover({ title: "T", summary: "S", provider: "openai", openaiKey: "k", quality: "medium", fetchImpl });
  assert.equal(q, "medium");
});
