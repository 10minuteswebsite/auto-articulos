import assert from "node:assert/strict";
import test from "node:test";
import { hubSocialClient } from "./hub-social-client";

test("resolves an authorized account and submits one write with the job key", async () => {
  const id = "33333333-3333-4333-8333-333333333333";
  const calls: Request[] = [];
  const client = hubSocialClient("fixture", async (input, init) => {
    const request = new Request(input, init);
    calls.push(request);
    assert.equal(request.headers.get("authorization"), "Bearer fixture");
    assert.equal(request.redirect, "error");
    if (request.method === "GET") return Response.json({ data: { connection_id: id } });
    assert.equal((await request.json()).idempotency_key, "stable-job-key");
    return new Response(null, { status: 502 });
  });
  assert.equal(await client.resolve("bluesky"), id);
  await assert.rejects(client.publish({ connection_id: id, idempotency_key: "stable-job-key", content: "Test" }));
  assert.deepEqual(calls.map(call => call.method), ["GET", "POST"]);
});

test("requests a publishing token for the exact Redes tenant and rejects a different tenant", async () => {
  const { hubSocialClientForTenant } = await import("./hub-social-client");
  const tenant = "33333333-3333-4333-8333-333333333333";
  const previousId = process.env.HUB_REDES_SOCIAL_CLIENT_ID;
  const previousSecret = process.env.HUB_REDES_SOCIAL_CLIENT_SECRET;
  process.env.HUB_REDES_SOCIAL_CLIENT_ID = "fixture-client";
  process.env.HUB_REDES_SOCIAL_CLIENT_SECRET = "fixture-secret";
  try {
    const transport = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      assert.equal(new URL(request.url).searchParams.get("app"), "auto-redes");
      assert.equal(request.headers.get("x-platform-user-id"), tenant);
      assert.equal(request.headers.get("x-platform-client-id"), "fixture-client");
      assert.deepEqual(await request.json(), { resource: "connections", scopes: ["connections:publish"] });
      return Response.json({ data: { access_token: "fixture-token", audience: "connections", context: {
        tenant_id: "44444444-4444-4444-8444-444444444444", app_id: "auto-redes", scopes: ["connections:publish"],
      } } });
    };
    await assert.rejects(hubSocialClientForTenant(tenant, transport), /hub_social_unavailable/);
  } finally {
    if (previousId === undefined) delete process.env.HUB_REDES_SOCIAL_CLIENT_ID;
    else process.env.HUB_REDES_SOCIAL_CLIENT_ID = previousId;
    if (previousSecret === undefined) delete process.env.HUB_REDES_SOCIAL_CLIENT_SECRET;
    else process.env.HUB_REDES_SOCIAL_CLIENT_SECRET = previousSecret;
  }
});
