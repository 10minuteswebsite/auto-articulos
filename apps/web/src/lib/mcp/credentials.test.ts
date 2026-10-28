import assert from "node:assert/strict";
import { before, beforeEach, mock, test } from "node:test";
import { NextRequest } from "next/server";
import { hashMcpApiToken } from "./api-token";

type Row = { id: string; userId: string; tokenHash: string; name: string; createdAt: Date; issuedAt: Date | null; credentialVersion: string | null; revokedAt: Date | null; lastUsedAt: Date | null };
const rows = new Map<string, Row>();
let sequence = 0;
let lookupFails = false;
let usageFails = false;
const prisma = { mcpApiToken: {
  findUnique: async ({ where }: { where: { userId: string } }) => rows.has(where.userId) ? { ...rows.get(where.userId)! } : null,
  findFirst: async ({ where }: { where: { tokenHash: string } }) => {
    if (lookupFails) throw new Error("simulated unavailable database");
    const row = [...rows.values()].find(r => r.tokenHash === where.tokenHash && r.revokedAt === null);
    return row ? { id: row.id, userId: row.userId } : null;
  },
  create: async ({ data }: { data: Omit<Row, "id" | "createdAt"> }) => {
    if (rows.has(data.userId)) throw Object.assign(new Error("unique user"), { code: "P2002" });
    const row = { id: `row-${++sequence}`, createdAt: new Date(), ...data };
    rows.set(row.userId, row);
    return row;
  },
  updateMany: async ({ where, data }: { where: Partial<Row>; data: Partial<Row> }) => {
    if (usageFails && data.lastUsedAt) throw new Error("simulated metric failure");
    let count = 0;
    for (const row of rows.values()) {
      if (Object.entries(where).every(([key, value]) => row[key as keyof Row] === value)) {
        Object.assign(row, data);
        count++;
      }
    }
    return { count };
  },
} };
mock.module("@auto-articulos/db", { namedExports: { prisma } });
mock.module("../current-user.ts", { namedExports: { getCurrentUserId: async () => "user-a" } });
let store: typeof import("./credential-store");
let issuer: typeof import("../../app/api/configuracion/mcp-token/route");
let lookup: typeof import("../../app/api/mcp/token-lookup/route");
let middleware: typeof import("../../middleware").middleware;
before(async () => {
  store = await import("./credential-store");
  issuer = await import("../../app/api/configuracion/mcp-token/route");
  lookup = await import("../../app/api/mcp/token-lookup/route");
  ({ middleware } = await import("../../middleware"));
});
const issue = (replaceExisting = false, expectedVersion?: string) => store.issueMcpCredential("user-a", { name: "test", replaceExisting, expectedVersion });
const resolve = (token: string) => lookup.POST(new NextRequest("https://redes.lasolucionweb.net/api/mcp/token-lookup", { method: "POST", headers: { authorization: `Bearer ${token}` } }));
beforeEach(() => { rows.clear(); sequence = 0; lookupFails = false; usageFails = false; });

test("first issuance is usable; metadata never includes credential or hash", async () => {
  const created = await issue();
  assert.match(created.token, /^sta_[A-Za-z0-9_-]{43}$/);
  const metadata = await store.getMcpCredentialState("user-a");
  assert.equal(metadata.active, true);
  assert.equal(metadata.version, created.version);
  assert.equal("token" in metadata, false);
  assert.equal("tokenHash" in metadata, false);
  assert.ok("issuedAt" in metadata && metadata.issuedAt instanceof Date);
  assert.deepEqual(await (await resolve(created.token)).json(), { userId: "user-a" });
  assert.ok(rows.get("user-a")?.lastUsedAt instanceof Date);
});

test("active credential cannot be silently replaced or replaced by a stale page", async () => {
  const first = await issue();
  await assert.rejects(issue(), { code: "TOKEN_REPLACEMENT_REQUIRED" });
  await assert.rejects(issue(true, "stale"), { code: "TOKEN_STATE_CHANGED" });
  assert.equal((await resolve(first.token)).status, 200);
  const next = await issue(true, first.version);
  assert.notEqual(next.version, first.version);
  assert.equal((await resolve(first.token)).status, 401);
  assert.equal((await resolve(next.token)).status, 200);
});

test("parallel first issuances deliver exactly one credential", async () => {
  const results = await Promise.allSettled([issue(), issue()]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.filter(r => r.status === "rejected").length, 1);
  assert.equal(rows.size, 1);
});

test("parallel confirmed replacements cannot overwrite the credential just delivered", async () => {
  const first = await issue();
  const results = await Promise.allSettled([issue(true, first.version), issue(true, first.version)]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.filter(r => r.status === "rejected").length, 1);
});

test("legacy dates remain unknown until an explicit confirmed issuance", async () => {
  await issue();
  Object.assign(rows.get("user-a")!, { issuedAt: null, credentialVersion: null, createdAt: new Date("2026-09-30T00:00:00Z") });
  const before = await store.getMcpCredentialState("user-a");
  assert.equal("issuedAt" in before && before.issuedAt, null);
  assert.equal(before.version, "row-1:legacy");
  await issue(true, before.version!);
  const after = await store.getMcpCredentialState("user-a");
  assert.ok("issuedAt" in after && after.issuedAt instanceof Date);
  assert.ok("createdAt" in after && after.createdAt instanceof Date);
  assert.equal(after.createdAt.toISOString(), "2026-09-30T00:00:00.000Z");
});

test("stale revocation cannot disable a newer credential; confirmed revocation is enforced", async () => {
  const first = await issue();
  const next = await issue(true, first.version);
  await assert.rejects(store.revokeMcpCredential("user-a", first.version), { code: "TOKEN_STATE_CHANGED" });
  assert.equal((await resolve(next.token)).status, 200);
  await store.revokeMcpCredential("user-a", next.version);
  assert.equal((await resolve(next.token)).status, 401);
  const renewed = await issue();
  assert.equal((await resolve(renewed.token)).status, 200);
  assert.equal((await resolve(next.token)).status, 401);
});

test("configuration API returns409 without mutating an active credential and never caches it", async () => {
  const first = await issue();
  const response = await issuer.POST(new Request("https://redes.lasolucionweb.net/api/configuracion/mcp-token", { method: "POST", body: "null" }));
  assert.equal(response.status, 409);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await resolve(first.token)).status, 200);
  const metadata = await issuer.GET();
  assert.equal(metadata.headers.get("cache-control"), "no-store");
  assert.equal("tokenHash" in await metadata.json(), false);
});

test("metadata and issuance stay isolated by native user", async () => {
  const other = await store.issueMcpCredential("user-b", { name: "other", replaceExisting: false });
  assert.equal((await store.getMcpCredentialState("user-a")).active, false);
  await issue();
  assert.deepEqual(await (await resolve(other.token)).json(), { userId: "user-b" });
});

test("configuration HTTP contract requires a current version for replacement and revocation", async () => {
  const first = await issue();
  const cfgUrl = "https://redes.lasolucionweb.net/api/configuracion/mcp-token";
  const replaced = await issuer.POST(new Request(cfgUrl, { method: "POST", body: JSON.stringify({ replaceExisting: true, expectedVersion: first.version }) }));
  assert.equal(replaced.status, 200);
  assert.equal(replaced.headers.get("cache-control"), "no-store");
  const next = await replaced.json() as { token: string; version: string };
  const stale = await issuer.DELETE(new Request(cfgUrl, { method: "DELETE", body: JSON.stringify({ expectedVersion: first.version }) }));
  assert.equal(stale.status, 409);
  assert.equal((await resolve(next.token)).status, 200);
  const revoked = await issuer.DELETE(new Request(cfgUrl, { method: "DELETE", body: JSON.stringify({ expectedVersion: next.version }) }));
  assert.equal(revoked.status, 200);
  assert.equal((await resolve(next.token)).status, 401);
});

test("middleware fixes product context and ignores forged identity/admin/scopes on all product hosts", async () => {
  const created = await issue();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => lookup.POST(new NextRequest(String(url), { ...init, signal: init?.signal ?? undefined }));
  try {
    for (const [host, slug] of [["redes.lasolucionweb.net", "auto-redes"], ["redes.lasolucionweb.com", "auto-redes"], ["articulos.lasolucionweb.net", "seo-total"], ["articulos.lasolucionweb.com", "seo-total"]]) {
      const result = await middleware(new NextRequest(`https://${host}/api/mcp`, { method: "POST", headers: { authorization: `Bearer ${created.token}`, origin: "https://www.meta.ai", "x-user-id": "user-b", "x-hub-product-slug": "forged", "x-acting-admin-id": "user-b", "x-auth-source": "hub", "x-mcp-scopes": "forged" } }));
      assert.equal(result.status, 200);
      assert.equal(result.headers.get("x-middleware-request-x-user-id"), "user-a");
      assert.equal(result.headers.get("x-middleware-request-x-hub-product-slug"), slug);
      assert.equal(result.headers.get("x-middleware-request-x-acting-admin-id"), null);
      assert.equal(result.headers.get("x-middleware-request-x-auth-source"), null);
      assert.equal(result.headers.get("x-middleware-request-x-mcp-scopes"), "oportunidades:leer oportunidades:publicar");
    }
  } finally { globalThis.fetch = originalFetch; }
});

test("database/lookup outage returns503 with retry information, invalid credential remains401", async () => {
  const created = await issue();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => lookup.POST(new NextRequest(String(url), { ...init, signal: init?.signal ?? undefined }));
  try {
    lookupFails = true;
    const result = await middleware(new NextRequest("https://redes.lasolucionweb.net/api/mcp", { method: "POST", headers: { authorization: `Bearer ${created.token}` } }));
    assert.equal(result.status, 503);
    assert.equal(result.headers.get("retry-after"), "5");
    lookupFails = false;
    const invalid = await middleware(new NextRequest("https://redes.lasolucionweb.net/api/mcp", { method: "POST", headers: { authorization: "Bearer sta_unknown" } }));
    assert.equal(invalid.status, 401);
  } finally { globalThis.fetch = originalFetch; }
});

test("usage-metric failure does not reject a credential already authenticated", async () => {
  const created = await issue();
  usageFails = true;
  assert.equal((await resolve(created.token)).status, 200);
});

test("stored hash is unchanged when metadata is only read", async () => {
  const created = await issue();
  const expectedHash = hashMcpApiToken(created.token);
  await store.getMcpCredentialState("user-a");
  assert.equal(rows.get("user-a")?.tokenHash === expectedHash, true);
});
