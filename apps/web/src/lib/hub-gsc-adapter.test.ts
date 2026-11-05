import assert from "node:assert/strict";
import test from "node:test";
import { HubGscError, hubGscProviderUser, parseHubGscRequest, runHubGscAdapter, type HubGscDependencies } from "./hub-gsc-adapter";
import { handleHubGscRequest } from "./hub-gsc-api";

const tenant = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const attempt = "33333333-3333-4333-8333-333333333333";
const site = "sc-domain:example.test";

function fixture() {
  const calls: string[] = [];
  const deps: HubGscDependencies = {
    async config() { return { apiKey: "fixture-key", authConfigId: "fixture-config" }; },
    async start(_key, input) {
      calls.push(JSON.stringify(input));
      return { redirectUrl: "https://connect.composio.dev/link/fixture", connectedAccountId: "ca_new" };
    },
    async completeAuth(_key, input) { calls.push(`verify:${input.userId}`); return { connectedAccountId: "ca_new", toolkitSlug: "google_search_console" }; },
    async account(_key, id) { return { id, status: "ACTIVE", userId: hubGscProviderUser(tenant, attempt), toolkitSlug: "google_search_console", authConfigId: "fixture-config" }; },
    async sites() { calls.push("sites"); return [{ siteUrl: site, permissionLevel: "siteOwner" }]; },
    async query(_account, selected) { calls.push(`query:${selected}`); return [{ clicks: 3 }]; },
    async inspect(_account, selected, target) { calls.push(`inspect:${selected}:${target}`); return { verdict: "PASS" }; },
    async sitemaps(_account, selected) { calls.push(`sitemaps:${selected}`); return ["https://example.test/sitemap.xml"]; },
    async submitSitemap(_account, selected, target) { calls.push(`submit:${selected}:${target}`); },
  };
  return { deps, calls };
}

test("una autorización nueva usa una identidad y callback propios del Hub", async () => {
  const { deps, calls } = fixture();
  const input = parseHubGscRequest({ operation: "start", tenantId: tenant, attemptId: attempt });
  assert.deepEqual(await runHubGscAdapter(input, deps), { redirectUrl: "https://connect.composio.dev/link/fixture", accountId: "ca_new" });
  const body = JSON.parse(calls[0]);
  assert.equal(body.userId, `hub-connections-${tenant}-${attempt}`);
  assert.equal(body.callbackUrl, `https://hub.lasolucionweb.net/api/connections/google-search-console/callback?attempt=${attempt}`);
});

test("rechaza credenciales legacy, otro tenant, cuentas no activas y auth config ajena", async () => {
  for (const overrides of [
    { userId: "native-legacy-user" },
    { userId: hubGscProviderUser(other, attempt) },
    { userId: hubGscProviderUser(tenant, other) },
    { status: "INITIATED" },
    { toolkitSlug: "google_calendar" },
    { authConfigId: "other-config" },
  ]) {
    const { deps, calls } = fixture();
    const original = deps.account;
    deps.account = async (key, id) => ({ ...(await original(key, id)), ...overrides });
    await assert.rejects(runHubGscAdapter(parseHubGscRequest({ operation: "sites", tenantId: tenant, attemptId: attempt, accountId: "ca_1" }), deps), (error: unknown) => error instanceof HubGscError && error.code === "connection_not_validated");
    assert.deepEqual(calls, []);
  }
});

test("solo consulta la propiedad devuelta por el proveedor para la cuenta verificada", async () => {
  const { deps, calls } = fixture();
  const request = { operation: "query", tenantId: tenant, attemptId: attempt, accountId: "ca_1", siteUrl: site, startDate: "2026-10-01", endDate: "2026-10-31", dimensions: ["query", "page"] };
  assert.deepEqual(await runHubGscAdapter(parseHubGscRequest(request), deps), { rows: [{ clicks: 3 }] });
  await assert.rejects(runHubGscAdapter(parseHubGscRequest({ ...request, siteUrl: "sc-domain:other.test" }), deps), (error: unknown) => error instanceof HubGscError && error.code === "site_not_authorized");
  assert.deepEqual(calls, ["sites", `query:${site}`, "sites"]);
});

test("rechaza campos extra, fechas inválidas, herramientas fuera de alcance y redirecciones ajenas", async () => {
  assert.throws(() => parseHubGscRequest({ operation: "delete", tenantId: tenant, attemptId: attempt, accountId: "ca_1" }));
  assert.throws(() => parseHubGscRequest({ operation: "start", tenantId: tenant, attemptId: attempt, callback: "https://example.test" }));
  assert.throws(() => parseHubGscRequest({ operation: "query", tenantId: tenant, attemptId: attempt, accountId: "ca_1", siteUrl: site, startDate: "2026-02-30", endDate: "2026-03-01", dimensions: [] }));
  const { deps } = fixture();
  deps.start = async () => ({ redirectUrl: "https://attacker.test/", connectedAccountId: "ca_1" });
  await assert.rejects(runHubGscAdapter(parseHubGscRequest({ operation: "start", tenantId: tenant, attemptId: attempt }), deps));
});

test("el endpoint rechaza tráfico anónimo y no inicia autorizaciones antes de que Hub esté listo", async () => {
  const { deps, calls } = fixture();
  const makeRequest = () => new Request("https://app.example.test/api/integrations/hub/gsc-adapter", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "start", tenantId: tenant, attemptId: attempt }),
  });
  assert.equal((await handleHubGscRequest(makeRequest(), { authenticate: async () => false, adapter: deps, startEnabled: true, sitemapEnabled: false })).status, 401);
  const closed = await handleHubGscRequest(makeRequest(), { authenticate: async () => true, adapter: deps, startEnabled: false, sitemapEnabled: false });
  assert.equal(closed.status, 503);
  assert.equal((await closed.json()).error, "connection_setup_unavailable");
  const write = new Request("https://app.example.test/api/integrations/hub/gsc-adapter", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "submit_sitemap", tenantId: tenant, attemptId: attempt, accountId: "ca_1", siteUrl: site, targetUrl: "https://example.test/sitemap.xml" }),
  });
  assert.equal((await handleHubGscRequest(write, { authenticate: async () => true, adapter: deps, startEnabled: true, sitemapEnabled: false })).status, 503);
  const verify = new Request("https://app.example.test/api/integrations/hub/gsc-adapter", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "verify_callback", tenantId: tenant, attemptId: attempt, accountId: "ca_new", sessionUri: "fixture-session" }),
  });
  assert.equal((await handleHubGscRequest(verify, { authenticate: async () => true, adapter: deps, startEnabled: false, sitemapEnabled: false })).status, 503);
  assert.deepEqual(calls, []);
});

test("el callback de un solo uso solo valida el tenant, intento y cuenta esperados", async () => {
  const { deps, calls } = fixture();
  const body = { operation: "verify_callback", tenantId: tenant, attemptId: attempt, accountId: "ca_new", sessionUri: "fixture-session" };
  assert.deepEqual(await runHubGscAdapter(parseHubGscRequest(body), deps), { verified: true });
  assert.deepEqual(calls, [`verify:hub-connections-${tenant}-${attempt}`]);
  deps.completeAuth = async () => ({ connectedAccountId: "ca_other", toolkitSlug: "google_search_console" });
  await assert.rejects(runHubGscAdapter(parseHubGscRequest(body), deps), (error: unknown) => error instanceof HubGscError && error.code === "connection_not_validated");
  assert.throws(() => parseHubGscRequest({ ...body, sessionUri: "secret\nother" }));
});

test("inspección y sitemaps solo aceptan URLs dentro de la propiedad del tenant", async () => {
  const { deps, calls } = fixture();
  const base = { tenantId: tenant, attemptId: attempt, accountId: "ca_1", siteUrl: site };
  assert.deepEqual(await runHubGscAdapter(parseHubGscRequest({ ...base, operation: "sitemaps" }), deps), { sitemaps: ["https://example.test/sitemap.xml"] });
  assert.deepEqual(await runHubGscAdapter(parseHubGscRequest({ ...base, operation: "inspect", targetUrl: "https://www.example.test/article" }), deps), { inspection: { verdict: "PASS" } });
  assert.deepEqual(await runHubGscAdapter(parseHubGscRequest({ ...base, operation: "submit_sitemap", targetUrl: "https://example.test/sitemap.xml" }), deps), { submitted: true });
  await assert.rejects(runHubGscAdapter(parseHubGscRequest({ ...base, operation: "submit_sitemap", targetUrl: "https://example.test.attacker.invalid/sitemap.xml" }), deps), (error: unknown) => error instanceof HubGscError && error.code === "site_not_authorized");
  assert.equal(calls.filter((entry) => entry.startsWith("submit:")).length, 1);
});
