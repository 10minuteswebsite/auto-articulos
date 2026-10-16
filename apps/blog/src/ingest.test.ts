import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "./app";
import { signBody } from "./ingest";
import { makeEnv, send, provisionTenant, articleData, API, SECRET } from "./test-helpers";

async function raw(env: ReturnType<typeof makeEnv>, body: string, headers: Record<string, string>) {
  return handle(env, new Request(`https://${API}/api/ingest`, { method: "POST", headers: { host: API, ...headers }, body }));
}

test("rechaza peticiones sin firma, con firma falsa o con marca de tiempo vieja", async () => {
  const env = makeEnv();
  const body = JSON.stringify({ event_id: "e1", type: "blog.provision", tenant_id: "t1", data: {} });
  const ts = String(Math.floor(Date.now() / 1000));
  assert.equal((await raw(env, body, {})).status, 401);
  assert.equal((await raw(env, body, { "x-blogia-timestamp": ts, "x-blogia-signature": "00".repeat(32) })).status, 401);
  const old = String(Math.floor(Date.now() / 1000) - 3600);
  assert.equal((await raw(env, body, { "x-blogia-timestamp": old, "x-blogia-signature": await signBody(SECRET, old, body) })).status, 401);
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM tenants"))?.n, 0);
});

test("la API de ingestión solo existe en el hostname de la API", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  const res = await handle(env, new Request("https://blog.uno.test/api/ingest", { method: "POST", headers: { host: "blog.uno.test" }, body: "{}" }));
  assert.notEqual(res.status, 200);
  assert.equal(res.status, 405); // en un blog, POST no está permitido
});

test("repetir el mismo evento no crea duplicados (idempotencia)", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  const a = await send(env, "t1", "article.publish", articleData(1), "same-event");
  const b = await send(env, "t1", "article.publish", articleData(1), "same-event");
  assert.equal(a.json.result, "applied");
  assert.equal(b.json.result, "duplicate");
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 1);
});

test("publicar de nuevo con otra revisión actualiza; una revisión vieja se ignora", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  await send(env, "t1", "article.publish", articleData(1, { revision: 2, title: "Nuevo" }));
  const stale = await send(env, "t1", "article.update", articleData(1, { revision: 1, title: "Viejo" }));
  assert.equal(stale.json.result, "stale");
  assert.equal((await env.db.first<{ title: string }>("SELECT title FROM articles"))?.title, "Nuevo");
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 1);
});

test("un fallo no publica contenido a medias (categoría desconocida)", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  const r = await send(env, "t1", "article.publish", articleData(1, { category_ids: ["no-existe"] }));
  assert.equal(r.status, 400);
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 0);
  // y el fallo queda registrado como error recuperable
  assert.equal((await env.db.first<{ status: string }>("SELECT status FROM publish_events WHERE type = 'article.publish'"))?.status, "error");
});

test("valida slugs reservados, https en portada y contenido vacío", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  assert.equal((await send(env, "t1", "article.publish", articleData(1, { slug: "categoria" }))).status, 400);
  assert.equal((await send(env, "t1", "article.publish", articleData(1, { slug: "Con Espacios" }))).status, 400);
  assert.equal((await send(env, "t1", "article.publish", articleData(1, { cover_image_url: "http://inseguro/x.jpg" }))).status, 400);
  assert.equal((await send(env, "t1", "article.publish", articleData(1, { body_html: "<script>x</script>" }))).status, 400);
});

test("el HTML se sanitiza al ingresar", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  await send(env, "t1", "article.publish", articleData(1, { body_html: `<p>ok</p><script>alert(1)</script><a href="javascript:x()">m</a>` }));
  const row = await env.db.first<{ body_html: string }>("SELECT body_html FROM articles");
  assert.equal(/script|javascript/i.test(row!.body_html), false);
});

test("dos clientes pueden usar el mismo slug sin mezclarse", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  await provisionTenant(env, "t2", "blog.dos.test");
  assert.equal((await send(env, "t1", "article.publish", articleData(1, { slug: "igual", title: "De uno" }))).status, 200);
  assert.equal((await send(env, "t2", "article.publish", articleData(1, { slug: "igual", title: "De dos" }))).status, 200);
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 2);
});

test("un cliente no puede usar la categoría de otro", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  await provisionTenant(env, "t2", "blog.dos.test");
  await send(env, "t1", "category.upsert", { id: "c1", slug: "medicaid", name: "Medicaid" });
  const r = await send(env, "t2", "article.publish", articleData(1, { category_ids: ["c1"] }));
  assert.equal(r.status, 400);
});

test("una cuenta solo puede tener un blog y un hostname no se reparte", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  const dupHost = await send(env, "t9", "blog.provision", { seo_total_account_id: "otra", hostname: "blog.uno.test" });
  assert.equal(dupHost.status, 409);
  const dupAccount = await send(env, "t1b", "blog.provision", { seo_total_account_id: "acc-t1", hostname: "blog.otro.test" });
  assert.equal(dupAccount.status, 409);
  await provisionTenant(env, "t2", "blog.dos.test");
  const steal = await send(env, "t2", "blog.domain.change", { hostname: "blog.uno.test", verification_status: "verified", tls_status: "ready" });
  assert.equal(steal.status, 409);
});

test("tipos de evento desconocidos y tenants desconocidos se rechazan", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  assert.equal((await send(env, "t1", "algo.raro", {})).status, 400);
  assert.equal((await send(env, "fantasma", "category.upsert", { id: "c", slug: "x", name: "X" })).status, 404);
});
