import { test } from "node:test";
import assert from "node:assert/strict";
import { DestinationError, switchToBlog, switchToWebsite } from "./publishing-destination";

function fakeDb(method: string | null, activeRuns = 0) {
  const calls: string[] = [];
  const db = {
    user: {
      findUnique: async () => (method === null ? null : { publishMethod: method }),
      updateMany: async (a: { where: { publishMethod: string }; data: { publishMethod: string } }) => { calls.push(`${a.where.publishMethod}->${a.data.publishMethod}`); return { count: 1 }; },
    },
    run: { count: async () => activeRuns },
  };
  return { db, calls };
}

test("de BLOG a su sitio: cambia a BROWSER con credencial y sin lotes en curso", async () => {
  const { db, calls } = fakeDb("BLOG");
  assert.deepEqual(await switchToWebsite(db, "u1", true), { changed: true, method: "BROWSER" });
  assert.deepEqual(calls, ["BLOG->BROWSER"]);
});

test("si ya no está en BLOG no cambia nada (idempotente, respeta MCP y BROWSER)", async () => {
  for (const method of ["BROWSER", "MCP"]) {
    const { db, calls } = fakeDb(method);
    assert.deepEqual(await switchToWebsite(db, "u1", true), { changed: false, method });
    assert.deepEqual(calls, []);
  }
});

test("sin sitio de 10minutesWebsite conectado se rechaza con un mensaje que dice qué hacer", async () => {
  const { db, calls } = fakeDb("BLOG");
  await assert.rejects(() => switchToWebsite(db, "u1", false), (e: unknown) => e instanceof DestinationError && e.code === "website_not_connected" && e.status === 409 && /Conéctalo primero/.test(e.message));
  assert.deepEqual(calls, []);
});

test("con publicaciones en curso se rechaza (no se parte un lote entre dos sitios)", async () => {
  const { db, calls } = fakeDb("BLOG", 2);
  await assert.rejects(() => switchToWebsite(db, "u1", true), (e: unknown) => e instanceof DestinationError && e.code === "runs_in_progress");
  assert.deepEqual(calls, []);
});

test("cuenta inexistente: 404", async () => {
  await assert.rejects(() => switchToWebsite(fakeDb(null).db, "x", true), (e: unknown) => e instanceof DestinationError && e.status === 404);
});

function blogDb(method: string | null, blog: { status: string; dnsVerified: boolean; tlsReady: boolean } | null, activeRuns = 0) {
  const { db, calls } = fakeDb(method, activeRuns);
  return { db: { ...db, blogIaBlog: { findUnique: async () => blog } }, calls };
}
const READY = { status: "active", dnsVerified: true, tlsReady: true };

test("a BLOG IA: cambia solo con un blog ya vinculado, activo y con HTTPS", async () => {
  const { db, calls } = blogDb("BROWSER", READY);
  assert.deepEqual(await switchToBlog(db, "u1"), { changed: true, method: "BLOG" });
  assert.deepEqual(calls, ["BROWSER->BLOG"]);
});

test("a BLOG IA: sin blog, o blog sin terminar, se rechaza y no cambia nada", async () => {
  for (const blog of [null, { ...READY, status: "pending_dns" }, { ...READY, tlsReady: false }, { ...READY, dnsVerified: false }]) {
    const { db, calls } = blogDb("BROWSER", blog);
    await assert.rejects(() => switchToBlog(db, "u1"), (e: unknown) => e instanceof DestinationError && e.code === "blog_not_ready");
    assert.deepEqual(calls, []);
  }
});

test("a BLOG IA: ya en BLOG es idempotente; MCP no se toca; lotes en curso lo bloquean", async () => {
  assert.deepEqual(await switchToBlog(blogDb("BLOG", READY).db, "u1"), { changed: false, method: "BLOG" });
  await assert.rejects(() => switchToBlog(blogDb("MCP", READY).db, "u1"), (e: unknown) => e instanceof DestinationError && e.code === "method_not_supported");
  await assert.rejects(() => switchToBlog(blogDb("BROWSER", READY, 1).db, "u1"), (e: unknown) => e instanceof DestinationError && e.code === "runs_in_progress");
});
