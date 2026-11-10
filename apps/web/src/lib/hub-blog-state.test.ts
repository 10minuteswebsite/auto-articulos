import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchBlogState, parseBlogState, HubBlogStateError, reasonText, DEFAULT_LANDING_URL } from "./hub-blog-state";

const HUB = "11111111-1111-4111-8111-111111111111";
const IDS = { requestId: "22222222-2222-4222-8222-222222222222", correlationId: "33333333-3333-4333-8333-333333333333" };
export const contract = {
  site_id: "site_" + "a".repeat(36).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5").slice(0, 36), tenant_id: "t_abcdefghij1", publisher_id: "pub1",
  hostname: "blog.cliente.com", canonical_url: "https://blog.cliente.com/", can_publish: true, contract_state: "active", invalid_reason: null,
  revision: "a".repeat(64), contract_version: "1", emitted_at: "2026-11-10T00:00:00Z", release_id: "r1",
};
const ready = { data: { state: "blog_ready", hostname: "blog.cliente.com", destination: contract, launch_url: "https://hub.lasolucionweb.net/api/product-launch?app=blog-ia", landing_url: "https://hub.lasolucionweb.net/productos/blog-ia", reason: null }, meta: { request_id: IDS.requestId, correlation_id: IDS.correlationId } };

test("blog_ready válido", () => {
  const s = parseBlogState(ready, HUB, IDS);
  assert.equal(s.state, "blog_ready"); assert.equal(s.destination?.hostname, "blog.cliente.com");
});
test("blog_ready con dominio provisional, sin can_publish o inactivo se rechaza", () => {
  for (const patch of [{ hostname: "x.lasolucionweb.net", canonical_url: "https://x.lasolucionweb.net/" }, { can_publish: false }, { contract_state: "suspended" }]) {
    assert.throws(() => parseBlogState({ data: { ...ready.data, hostname: (patch as any).hostname ?? "blog.cliente.com", destination: { ...contract, ...patch } } }, HUB, IDS), HubBlogStateError);
  }
});
test("not_purchased, no_blog y blog_pending (reason amable)", () => {
  assert.equal(parseBlogState({ data: { state: "not_purchased", reason: null, landing_url: "https://evil.com/x" } }, HUB, IDS).landingUrl, DEFAULT_LANDING_URL);
  assert.equal(parseBlogState({ data: { state: "no_blog" } }, HUB, IDS).state, "no_blog");
  const p = parseBlogState({ data: { state: "blog_pending", reason: "domain_not_confirmed" } }, HUB, IDS);
  assert.equal(p.reason, "domain_not_confirmed"); assert.match(reasonText(p.reason)!, /dominio/); assert.doesNotMatch(reasonText("otro_codigo")!, /otro_codigo/);
});
test("estado desconocido o con destino fuera de blog_ready se rechaza", () => {
  assert.throws(() => parseBlogState({ data: { state: "raro" } }, HUB, IDS), HubBlogStateError);
  assert.throws(() => parseBlogState({ data: { state: "no_blog", destination: contract } }, HUB, IDS), HubBlogStateError);
  assert.throws(() => parseBlogState({}, HUB, IDS), HubBlogStateError);
});
const env = { AUTO_ARTICULOS_HUB_CLIENT_ID: "cid", AUTO_ARTICULOS_HUB_CLIENT_SECRET: "sec" };
test("fetch: cabeceras de trazabilidad, cuerpo mínimo y sin cookies", async () => {
  let seen: any;
  const fetchImpl = (async (url: string, init: any) => { seen = { url, init }; return new Response(JSON.stringify(ready), { status: 200 }); }) as any;
  const s = await fetchBlogState(HUB, { fetchImpl, env });
  assert.equal(seen.url, "https://hub.lasolucionweb.net/api/integrations/auto-articulos/blog-state");
  assert.deepEqual(JSON.parse(seen.init.body), { hub_user_id: HUB });
  assert.equal(seen.init.headers["x-platform-client-id"], "cid"); assert.equal(seen.init.headers.authorization, "Bearer sec");
  assert.match(seen.init.headers["x-request-id"], /^[0-9a-f-]{36}$/); assert.match(seen.init.headers["x-correlation-id"], /^[0-9a-f-]{36}$/);
  assert.equal(s.requestId, IDS.requestId);
});
test("fetch: 401, 400, 503, red caída y respuesta rota nunca inventan un estado", async () => {
  for (const status of [401, 400, 403, 503]) {
    const fetchImpl = (async () => new Response(JSON.stringify({ error: { code: "blog_state_unavailable", retryable: true } }), { status })) as any;
    await assert.rejects(() => fetchBlogState(HUB, { fetchImpl, env }), HubBlogStateError);
  }
  await assert.rejects(() => fetchBlogState(HUB, { fetchImpl: (async () => { throw new Error("net"); }) as any, env }), HubBlogStateError);
  await assert.rejects(() => fetchBlogState(HUB, { fetchImpl: (async () => new Response("no json", { status: 200 })) as any, env }), HubBlogStateError);
  await assert.rejects(() => fetchBlogState(HUB, { env: {} }), HubBlogStateError);
});
