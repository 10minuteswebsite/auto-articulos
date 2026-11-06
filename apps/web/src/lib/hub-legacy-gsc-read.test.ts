import assert from "node:assert/strict";
import test from "node:test";
import { executeLegacyGscRead, handleLegacyGscRead, LegacyGscReadError, parseLegacyGscInput, type LegacyGscReadDependencies } from "./hub-legacy-gsc-read";

const tenant = "11111111-1111-4111-8111-111111111111";
const site = "sc-domain:example.test";
const body = { operation: "verify", tenantId: tenant, sourceRef: "legacy-ref:composio:c123", siteUrl: site };
function fixture(): LegacyGscReadDependencies {
  return {
    async load() { return { tenantId: tenant, source: "composio", id: "c123", userId: "local-user", siteUrl: site, connectedAccountId: "ca_123" }; },
    async open() { return { source: "composio", apiKey: "secret-key", accountId: "ca_123", userId: "local-user", status: "ACTIVE", toolkitSlug: "google_search_console" }; },
    async sites() { return [{ siteUrl: site, permissionLevel: "siteOwner" }]; },
    async sitemaps() { return ["https://example.test/sitemap.xml"]; },
    async inspect() { return { verdict: "PASS" }; },
    async query() { return [{ keys: [], clicks: 3, impressions: 4, ctr: 0.75, position: 1 }]; },
  };
}
const unavailable = (error: unknown) => error instanceof LegacyGscReadError && error.code === "connection_unavailable";

test("reutiliza cuenta Composio existente tras comprobar tenant, cuenta y propiedad", async () => {
  assert.deepEqual(await executeLegacyGscRead(parseLegacyGscInput(body), fixture()), { verified: true });
  const query = { ...body, operation: "query", startDate: "2026-10-01", endDate: "2026-10-31", dimensions: ["query"] };
  const result = await executeLegacyGscRead(parseLegacyGscInput(query), fixture());
  assert.ok("rows" in result);
  assert.doesNotMatch(JSON.stringify(result), /secret-key|ca_123|local-user/);
});

test("la fuente nativa existente funciona sin copiar ni entregar su token", async () => {
  const deps = fixture();
  deps.load = async () => ({ tenantId: tenant, source: "native", id: "n123", userId: "local-user", siteUrl: site, encryptedRefreshToken: "encrypted-secret" });
  deps.open = async () => ({ source: "native", accessToken: "access-secret" });
  const result = await executeLegacyGscRead(parseLegacyGscInput({ ...body, sourceRef: "legacy-ref:native:n123", operation: "sitemaps" }), deps);
  assert.deepEqual(result, { sitemaps: ["https://example.test/sitemap.xml"] });
  assert.doesNotMatch(JSON.stringify(result), /secret/);
});

test("una fuente cambiada, revocada, de otro tenant o sin permiso falla antes de consultar", async () => {
  for (const altered of [
    { tenantId: "22222222-2222-4222-8222-222222222222" }, { id: "other" }, { siteUrl: "sc-domain:other.test" },
  ]) {
    const deps = fixture(); const original = deps.load;
    deps.load = async (...args) => ({ ...(await original(...args))!, ...altered });
    await assert.rejects(executeLegacyGscRead(parseLegacyGscInput(body), deps), unavailable);
  }
  for (const altered of [{ userId: "other-user" }, { accountId: "ca_other" }, { status: "EXPIRED" }, { toolkitSlug: "google_calendar" }]) {
    const deps = fixture(); const original = deps.open;
    deps.open = async (...args) => ({ ...(await original(...args)) as Extract<Awaited<ReturnType<typeof original>>, { source: "composio" }>, ...altered });
    await assert.rejects(executeLegacyGscRead(parseLegacyGscInput(body), deps), unavailable);
  }
  const deps = fixture(); deps.sites = async () => [{ siteUrl: site, permissionLevel: "siteUnverifiedUser" }];
  await assert.rejects(executeLegacyGscRead(parseLegacyGscInput(body), deps), unavailable);
});

test("solo lectura y campos estrictos; no acepta destinos ni escrituras ajenas", () => {
  for (const invalid of [
    { ...body, operation: "submit_sitemap" }, { ...body, credential: "not-allowed" },
    { ...body, operation: "inspect", targetUrl: "https://example.test.attacker.invalid/a" },
    { ...body, operation: "query", startDate: "2026-02-30", endDate: "2026-03-01", dimensions: [] },
  ]) assert.throws(() => parseLegacyGscInput(invalid), LegacyGscReadError);
});

test("la ruta exige autenticación backend y oculta errores del proveedor", async () => {
  const request = () => new Request("https://example.test/api/integrations/hub/gsc-legacy-read", { method: "POST", body: JSON.stringify(body) });
  const deps = fixture();
  assert.equal((await handleLegacyGscRead(request(), { ...deps, authenticate: async () => false })).status, 401);
  deps.open = async () => { throw Error("secret-from-provider"); };
  const response = await handleLegacyGscRead(request(), { ...deps, authenticate: async () => true });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret-from-provider/);
});
