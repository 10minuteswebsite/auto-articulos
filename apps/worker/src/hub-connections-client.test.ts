import assert from "node:assert/strict";
import test from "node:test";
import { hubGscPilotEnabled, listHubGscConnections, resolveHubGsc, submitHubGscSitemap } from "./hub-connections-client";

const tenant = "11111111-1111-4111-8111-111111111111";
const connection = "33333333-3333-4333-8333-333333333333";

test("the central path is disabled unless the exact Hub tenant is in the pilot", () => {
  delete process.env.HUB_GSC_CONSUMER_PILOT_IDS;
  assert.equal(hubGscPilotEnabled(tenant), false);
  process.env.HUB_GSC_CONSUMER_PILOT_IDS = tenant;
  assert.equal(hubGscPilotEnabled(tenant), true);
  assert.equal(hubGscPilotEnabled("22222222-2222-4222-8222-222222222222"), false);
  delete process.env.HUB_GSC_CONSUMER_PILOT_IDS;
});

test("GitHub worker uses its own short-lived audience and a fixed read-only broker route", async () => {
  const oldFetch = globalThis.fetch;
  process.env.GITHUB_ACTIONS = "true";
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL = "https://runner.actions.githubusercontent.com/token";
  process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = "fixture-request-token";
  const calls: Array<{ url: string; headers: Headers; body: unknown }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input), headers = new Headers(init?.headers);
    calls.push({ url, headers, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (calls.length === 1) return Response.json({ value: "x".repeat(64) });
    return Response.json({ data: { connections: [{ id: connection, site_url: "sc-domain:example.test", validated_at: "2026-11-04T00:00:00Z" }] } });
  };
  try {
    assert.equal((await listHubGscConnections(tenant))[0].id, connection);
    assert.equal(new URL(calls[0].url).searchParams.get("audience"), "https://hub-workload-credential-broker.10minuteswebsite.workers.dev/github-connections");
    assert.equal(calls[1].url, "https://hub-workload-credential-broker.10minuteswebsite.workers.dev/connections-read");
    assert.deepEqual(calls[1].body, { hub_user_id: tenant, app: "seo-total", operation: "list" });
    assert.equal(calls[1].headers.get("authorization"), `Bearer ${"x".repeat(64)}`);
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of ["GITHUB_ACTIONS", "ACTIONS_ID_TOKEN_REQUEST_URL", "ACTIONS_ID_TOKEN_REQUEST_TOKEN"]) delete process.env[key];
  }
});

test("worker refuses an untrusted identity URL before sending a request", async () => {
  process.env.GITHUB_ACTIONS = "true";
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL = "https://attacker.invalid/token";
  process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = "fixture-request-token";
  try { await assert.rejects(listHubGscConnections(tenant), /hub_connections_unavailable/); }
  finally { for (const key of ["GITHUB_ACTIONS", "ACTIONS_ID_TOKEN_REQUEST_URL", "ACTIONS_ID_TOKEN_REQUEST_TOKEN"]) delete process.env[key]; }
});

test("worker selects only an equivalent property and preserves legacy when Hub fails", async () => {
  const row = { id: connection, site_url: "sc-domain:example.test", validated_at: "2026-11-04T00:00:00Z" };
  let calls = 0;
  const list = async () => { calls++; return [row]; };
  delete process.env.HUB_GSC_CONSUMER_PILOT_IDS;
  assert.equal(await resolveHubGsc(tenant, row.site_url, list), null);
  assert.equal(calls, 0);
  process.env.HUB_GSC_CONSUMER_PILOT_IDS = tenant;
  try {
    assert.equal(await resolveHubGsc(tenant, row.site_url, list), null);
    assert.deepEqual(await resolveHubGsc(tenant, null, list), row);
    assert.equal(await resolveHubGsc(tenant, "sc-domain:other.test", list), null);
    assert.equal(await resolveHubGsc(tenant, null, async () => [row, { ...row, id: "44444444-4444-4444-8444-444444444444" }]), null);
    assert.equal(await resolveHubGsc(tenant, row.site_url, async () => { throw new Error("offline"); }), null);
  } finally { delete process.env.HUB_GSC_CONSUMER_PILOT_IDS; }
});

test("sitemap uses its separate workflow audience and never retries an unknown result", async () => {
  const oldFetch = globalThis.fetch;
  process.env.GITHUB_ACTIONS = "true";
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL = "https://runner.actions.githubusercontent.com/token";
  process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = "fixture-request-token";
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input); calls.push(url);
    if (calls.length === 1) return Response.json({ value: "x".repeat(64) });
    assert.deepEqual(JSON.parse(String(init?.body)), { hub_user_id: tenant, app: "seo-total", connection_id: connection, target_url: "https://example.test/sitemap.xml" });
    throw new Error("timeout after submit");
  };
  try {
    await assert.rejects(submitHubGscSitemap(tenant, connection, "https://example.test/sitemap.xml"));
    assert.equal(new URL(calls[0]).searchParams.get("audience"), "https://hub-workload-credential-broker.10minuteswebsite.workers.dev/github-sitemap");
    assert.equal(calls[1], "https://hub-workload-credential-broker.10minuteswebsite.workers.dev/connections-sitemap");
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of ["GITHUB_ACTIONS", "ACTIONS_ID_TOKEN_REQUEST_URL", "ACTIONS_ID_TOKEN_REQUEST_TOKEN"]) delete process.env[key];
  }
});
