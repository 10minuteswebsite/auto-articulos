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
    async account(_key, id) { return { id, status: "ACTIVE", userId: hubGscProviderUser(tenant, attempt), toolkitSlug: "google_search_console", authConfigId: "fixture-config" }; },
    async sites() { calls.push("sites"); return [{ siteUrl: site, permissionLevel: "siteOwner" }]; },
    async query(_account, selected) { calls.push(`query:${selected}`); return [{ clicks: 3 }]; },
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
  assert.equal((await handleHubGscRequest(makeRequest(), { authenticate: async () => false, adapter: deps, startEnabled: true })).status, 401);
  const closed = await handleHubGscRequest(makeRequest(), { authenticate: async () => true, adapter: deps, startEnabled: false });
  assert.equal(closed.status, 503);
  assert.equal((await closed.json()).error, "connection_setup_unavailable");
  assert.deepEqual(calls, []);
});
