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

test("BlogIaError distingue errores corregibles de reintentables", async () => {
  const mk = (status: number) => sendBlogIaEvent({ apiUrl: "https://x", secret: "s", fetchImpl: async () => new Response(JSON.stringify({ ok: false, error: "m" }), { status }) }, { eventId: "e", type: "t", tenantId: "t", data: {} });
  await assert.rejects(mk(400), (e: unknown) => e instanceof BlogIaError && !e.retryable);
  await assert.rejects(mk(503), (e: unknown) => e instanceof BlogIaError && e.retryable);
});
