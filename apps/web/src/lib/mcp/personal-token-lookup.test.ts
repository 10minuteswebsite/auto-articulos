import assert from "node:assert/strict";
import test from "node:test";
import { lookupPersonalMcpToken } from "./personal-token-lookup";

const url = new URL("https://redes.lasolucionweb.net/api/mcp/token-lookup");
const fetchResponse = (response: Response) => (async () => response) as typeof fetch;

test("valid lookup preserves native identity and restricts credential transport", async () => {
  const result = await lookupPersonalMcpToken(url, "sta_test", (async (target, init) => {
    assert.equal(String(target), String(url));
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal instanceof AbortSignal);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer sta_test");
    return Response.json({ userId: "user-a" });
  }) as typeof fetch);
  assert.deepEqual(result, { kind: "authenticated", userId: "user-a" });
});

test("only an explicit lookup401 means an invalid credential", async () => {
  assert.deepEqual(await lookupPersonalMcpToken(url, "sta_test", fetchResponse(new Response(null, { status: 401 }))), { kind: "invalid", status: 401 });
  for (const status of [403, 404, 429, 500, 502, 503]) {
    assert.deepEqual(await lookupPersonalMcpToken(url, "sta_test", fetchResponse(new Response(null, { status }))), { kind: "unavailable", status });
  }
});

test("a broken contract or network failure is unavailable, never invalid", async () => {
  for (const response of [Response.json({}), Response.json({ userId: " " }), Response.json({ userId: 1 }), new Response("not JSON")]) {
    assert.equal((await lookupPersonalMcpToken(url, "sta_test", fetchResponse(response))).kind, "unavailable");
  }
  assert.deepEqual(await lookupPersonalMcpToken(url, "sta_test", (async () => { throw new Error("simulated timeout"); }) as typeof fetch), { kind: "unavailable" });
});
