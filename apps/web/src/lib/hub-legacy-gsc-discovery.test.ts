import assert from "node:assert/strict";
import test from "node:test";
import { handleLegacyGscDiscovery, projectLegacyGscRows } from "./hub-legacy-gsc-discovery";

const tenant = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const row = { id: "c_legacy_1", siteDomain: "example.test", siteUrl: "sc-domain:example.test", sitemapUrl: "https://example.test/sitemap.xml", encryptedRefreshToken: "NEVER-EXPORT", connectedAccountId: "NEVER-EXPORT-EITHER" };
const request = (body: unknown) => new Request("https://example.test/api/integrations/hub/gsc-legacy", { method: "POST", body: JSON.stringify(body) });

test("proyecta solo la referencia y configuración, nunca credenciales", () => {
  const result = projectLegacyGscRows("composio", [row]);
  assert.deepEqual(result, [{ source: "composio", sourceRef: "composio:c_legacy_1", siteDomain: "example.test", siteUrl: "sc-domain:example.test", sitemapUrl: "https://example.test/sitemap.xml", needsValidation: true }]);
  assert.doesNotMatch(JSON.stringify(result), /NEVER-EXPORT/);
  assert.deepEqual(projectLegacyGscRows("native", [{ ...row, siteUrl: null }]), []);
});

test("requiere autenticación y rechaza parámetros adicionales antes de leer", async () => {
  let reads = 0;
  const load = async () => { reads++; return { native: [row], composio: [] }; };
  assert.equal((await handleLegacyGscDiscovery(request({ tenantId: tenant }), { authenticate: async () => false, load })).status, 401);
  assert.equal((await handleLegacyGscDiscovery(request({ tenantId: tenant, sourceRef: "other" }), { authenticate: async () => true, load })).status, 400);
  assert.equal((await handleLegacyGscDiscovery(request({ tenantId: "invalid" }), { authenticate: async () => true, load })).status, 400);
  assert.equal(reads, 0);
});

test("solicita exclusivamente el tenant autenticado por el Hub y no presenta configuración como validada", async () => {
  const deps = { authenticate: async () => true, load: async (id: string) => id === tenant ? { native: [row], composio: [row] } : { native: [], composio: [] } };
  const response = await handleLegacyGscDiscovery(request({ tenantId: tenant }), deps);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.data.candidates.length, 2);
  assert.ok(body.data.candidates.every((candidate: { needsValidation: boolean }) => candidate.needsValidation));
  assert.doesNotMatch(JSON.stringify(body), /NEVER-EXPORT/);
  const otherResponse = await handleLegacyGscDiscovery(request({ tenantId: other }), deps);
  assert.deepEqual((await otherResponse.json()).data.candidates, []);
});

test("fallos devuelven error genérico sin datos sensibles", async () => {
  const response = await handleLegacyGscDiscovery(request({ tenantId: tenant }), { authenticate: async () => true, load: async () => { throw Error("secret-token"); } });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret-token/);
});
