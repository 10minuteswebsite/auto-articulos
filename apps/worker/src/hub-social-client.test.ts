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
