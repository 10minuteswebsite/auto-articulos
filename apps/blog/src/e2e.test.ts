// Prueba de punta a punta: el publisher REAL del worker → cliente firmado REAL → el blog REAL.
// Solo se sustituyen la IA (texto fijo) y el transporte (fetch llama directo a `handle`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "./app";
import { makeEnv, provisionTenant, get, SECRET, API } from "./test-helpers";
import { sendBlogIaEvent, BlogIaError } from "../../../packages/shared/src/blog-ia-client";
import { createBlogIaPublisher, BlogIaPublishError } from "../../worker/src/automation/blogIaPublisher";

function setup() {
  const env = makeEnv();
  const fetchImpl: typeof fetch = async (input, init) => {
    const req = new Request(input as string, init);
    return handle(env, new Request(req.url, { method: req.method, headers: { ...Object.fromEntries(req.headers), host: new URL(req.url).host }, body: await req.text() }));
  };
  const send = (e: Parameters<typeof sendBlogIaEvent>[1]) => sendBlogIaEvent({ apiUrl: `https://${API}`, secret: SECRET, fetchImpl }, e);
  const publisher = (over: Partial<Parameters<typeof createBlogIaPublisher>[0]> = {}) =>
    createBlogIaPublisher({
      tenantId: "t1", blogBaseUrl: "https://blog.uno.test", send, promptText: "p", contentLanguage: "es", authorName: "Ana",
      category: { id: "cat1", name: "Medicaid en Florida", description: "Guías" },
      generate: async (title) => ({ title: `Guía: ${title}`, summary: "Resumen corto", contentHtml: "<p>Intro</p><h2>Uno</h2><p>x</p><h2>Dos</h2><p>y</p><h2>Tres</h2><p>z</p>" }),
      now: () => new Date("2026-10-16T12:00:00Z"), ...over,
    });
  return { env, send, publisher };
}
const step = async () => {};

test("el publisher publica en el blog y la URL devuelta realmente abre", async () => {
  const { env, publisher } = setup();
  await provisionTenant(env, "t1", "blog.uno.test", { name: "Uno" });
  const r = await publisher().publishArticle({ title: "Requisitos 2026", categoryExternalId: "x", disableIndexing: false, onStep: step });
  assert.equal(r.articleUrl, "https://blog.uno.test/guia-requisitos-2026/");
  const page = await get(env, "blog.uno.test", new URL(r.articleUrl!).pathname);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Guía: Requisitos 2026/); assert.match(html, /Medicaid en Florida/); assert.match(html, /Por Ana/);
  assert.equal((await get(env, "blog.uno.test", "/categoria/medicaid-en-florida/")).status, 200);
});

test("reintentar el mismo título no duplica el artículo", async () => {
  const { env, publisher } = setup();
  await provisionTenant(env, "t1", "blog.uno.test");
  const p = publisher();
  const input = { title: "Mismo título", categoryExternalId: "x", disableIndexing: false, onStep: step };
  const a = await p.publishArticle(input);
  const b = await p.publishArticle(input);
  assert.equal(a.articleUrl, b.articleUrl);
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 1);
});

test("dos títulos con el mismo slug: el segundo recibe sufijo y ambos existen", async () => {
  const { env, publisher } = setup();
  await provisionTenant(env, "t1", "blog.uno.test");
  const same = { generate: async () => ({ title: "Título idéntico", summary: "r", contentHtml: "<p>cuerpo</p>" }) };
  const a = await publisher(same).publishArticle({ title: "Tema A", categoryExternalId: "x", disableIndexing: false, onStep: step });
  const b = await publisher(same).publishArticle({ title: "Tema B", categoryExternalId: "x", disableIndexing: false, onStep: step });
  assert.notEqual(a.articleUrl, b.articleUrl);
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 2);
  assert.equal((await get(env, "blog.uno.test", new URL(b.articleUrl!).pathname)).status, 200);
});

test("con imagen alojada se envía como portada", async () => {
  const { env, publisher } = setup();
  await provisionTenant(env, "t1", "blog.uno.test");
  const r = await publisher().publishArticle({ title: "Con foto", categoryExternalId: "x", disableIndexing: false, onStep: step, imageUrl: "https://img.example.com/a.jpg" });
  assert.match(await (await get(env, "blog.uno.test", new URL(r.articleUrl!).pathname)).text(), /https:\/\/img\.example\.com\/a\.jpg/);
});

test("errores: secreto incorrecto no es reintentable; blog inexistente (tenant) tampoco; red caída sí", async () => {
  const { env, publisher } = setup();
  await provisionTenant(env, "t1", "blog.uno.test");
  const input = { title: "X", categoryExternalId: "x", disableIndexing: false, onStep: step };
  await assert.rejects(publisher({ tenantId: "no-existe" }).publishArticle(input), (e: unknown) => e instanceof BlogIaPublishError && !e.retryable);
  const badSecret = (e: Parameters<typeof sendBlogIaEvent>[1]) =>
    sendBlogIaEvent({ apiUrl: `https://${API}`, secret: "otro", fetchImpl: async (i, init) => handle(env, new Request(i as string, { ...init, headers: { ...(init?.headers as object), host: API } })) }, e);
  await assert.rejects(publisher({ send: badSecret }).publishArticle(input), (e: unknown) => e instanceof BlogIaPublishError && !e.retryable && /Firma/.test(e.message));
  const down = (e: Parameters<typeof sendBlogIaEvent>[1]) => sendBlogIaEvent({ apiUrl: `https://${API}`, secret: SECRET, fetchImpl: async () => { throw new Error("ECONNRESET"); } }, e);
  await assert.rejects(publisher({ send: down }).publishArticle(input), (e: unknown) => e instanceof BlogIaPublishError && e.retryable);
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 0);
});

test("un fallo del blog no deja el artículo a medias", async () => {
  const { env, publisher } = setup();
  await provisionTenant(env, "t1", "blog.uno.test");
  await assert.rejects(
    publisher({ generate: async () => ({ title: "Vacío", summary: "r", contentHtml: "<script>x</script>" }) }).publishArticle({ title: "Vacío", categoryExternalId: "x", disableIndexing: false, onStep: step }),
    BlogIaPublishError,
  );
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 0);
});

test("una suscripción suspendida hace reintentable la publicación y al reactivarse publica", async () => {
  const { env, send, publisher } = setup();
  await provisionTenant(env, "t1", "blog.uno.test");

  await send({ eventId: "suspend:t1", type: "blog.subscription.suspend", tenantId: "t1", data: {} });
  await assert.rejects(
    publisher().publishArticle({ title: "Durante la suspensión", categoryExternalId: "x", disableIndexing: false, onStep: step }),
    (e: unknown) => e instanceof BlogIaPublishError && e.retryable,
  );
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 0);

  await send({ eventId: "resume:t1", type: "blog.subscription.resume", tenantId: "t1", data: {} });
  const published = await publisher().publishArticle({ title: "Después de reactivar", categoryExternalId: "x", disableIndexing: false, onStep: step });
  assert.equal(published.articleUrl, "https://blog.uno.test/guia-despues-de-reactivar/");
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 1);
});

test("BlogIaError distingue errores corregibles de reintentables", async () => {
  const mk = (status: number) => sendBlogIaEvent({ apiUrl: "https://x", secret: "s", fetchImpl: async () => new Response(JSON.stringify({ ok: false, error: "m" }), { status }) }, { eventId: "e", type: "t", tenantId: "t", data: {} });
  await assert.rejects(mk(400), (e: unknown) => e instanceof BlogIaError && !e.retryable);
  await assert.rejects(mk(503), (e: unknown) => e instanceof BlogIaError && e.retryable);
});

// ---- portada generada (IA simulada) → subida al blog → visible en el artículo
import { memoryMediaStore } from "./media";
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 9, 9, 9]);

test("la portada generada se guarda en el blog y aparece en el artículo", async () => {
  const media = memoryMediaStore();
  const env = makeEnv({ media });
  const fetchImpl: typeof fetch = async (input, init) => {
    const req = new Request(input as string, init);
    return handle(env, new Request(req.url, { method: req.method, headers: { ...Object.fromEntries(req.headers), host: new URL(req.url).host }, body: await req.text() }));
  };
  const send = (e: Parameters<typeof sendBlogIaEvent>[1]) => sendBlogIaEvent({ apiUrl: `https://${API}`, secret: SECRET, fetchImpl }, e);
  await provisionTenant(env, "t1", "blog.uno.test", { name: "Uno" });
  const steps: string[] = [];
  const p = createBlogIaPublisher({
    tenantId: "t1", blogBaseUrl: "https://blog.uno.test", send, promptText: "p", contentLanguage: "es",
    category: { id: "cat1", name: "Medicaid" },
    generate: async (t) => ({ title: `Guía: ${t}`, summary: "Resumen", contentHtml: "<p>Intro</p><h2>Uno</h2><p>x</p><h2>Dos</h2><p>y</p><h2>Tres</h2><p>z</p>" }),
    cover: async () => ({ bytes: PNG, mime: "image/png" }),
    now: () => new Date("2026-10-21T12:00:00Z"),
  });
  const r = await p.publishArticle({ title: "Con portada", categoryExternalId: "x", disableIndexing: false, onStep: async (m) => { steps.push(m); } });
  const page = await (await get(env, "blog.uno.test", new URL(r.articleUrl!).pathname)).text();
  const m = /https:\/\/blog\.uno\.test\/media\/(cover-[a-z0-9]+)/.exec(page);
  assert.ok(m, "la página debe usar la portada del blog");
  const img = await get(env, "blog.uno.test", `/media/${m![1]}`);
  assert.equal(img.status, 200);
  assert.equal(media.objects.size, 1);
  // Reintentar el mismo título no sube otra imagen ni duplica el artículo.
  await p.publishArticle({ title: "Con portada", categoryExternalId: "x", disableIndexing: false, onStep: async () => {} });
  assert.equal(media.objects.size, 1);
  assert.ok(steps.some((s) => /Portada generada/.test(s)));
});

test("si la portada falla, el artículo se publica igual sin imagen", async () => {
  const env = makeEnv({ media: memoryMediaStore() });
  const fetchImpl: typeof fetch = async (input, init) => {
    const req = new Request(input as string, init);
    return handle(env, new Request(req.url, { method: req.method, headers: { ...Object.fromEntries(req.headers), host: new URL(req.url).host }, body: await req.text() }));
  };
  const send = (e: Parameters<typeof sendBlogIaEvent>[1]) => sendBlogIaEvent({ apiUrl: `https://${API}`, secret: SECRET, fetchImpl }, e);
  await provisionTenant(env, "t1", "blog.uno.test", { name: "Uno" });
  const base = {
    tenantId: "t1", blogBaseUrl: "https://blog.uno.test", send, promptText: "p", contentLanguage: "es", category: { id: "cat1", name: "Medicaid" },
    generate: async (t: string) => ({ title: `Guía: ${t}`, summary: "Resumen", contentHtml: "<p>Intro</p><h2>Uno</h2><p>x</p><h2>Dos</h2><p>y</p><h2>Tres</h2><p>z</p>" }),
  };
  for (const cover of [async () => null, async () => { throw new Error("proveedor caído"); }]) {
    const steps: string[] = [];
    const r = await createBlogIaPublisher({ ...base, cover }).publishArticle({ title: `Sin portada ${steps.length}-${Math.random()}`, categoryExternalId: "x", disableIndexing: false, onStep: async (m) => { steps.push(m); } });
    assert.equal((await get(env, "blog.uno.test", new URL(r.articleUrl!).pathname)).status, 200);
    assert.ok(steps.some((s) => /sin imagen/.test(s)));
  }
});
