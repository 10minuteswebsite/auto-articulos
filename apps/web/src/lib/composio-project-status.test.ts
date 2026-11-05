import assert from "node:assert/strict";
import test from "node:test";
import { callbackVerifierCandidates, readComposioProjectStatus } from "./composio-project-status";

test("provider configuration diagnostic never returns values or unrelated settings", () => {
  const result = callbackVerifierCandidates({ config: { oauth_callback_verifier_url: "https://example.test/secret?token=fixture", callback_identity_verification_enabled: false, api_key: "secret-value" } });
  assert.deepEqual(result, [{ field: "oauth_callback_verifier_url", configured: true }, { field: "callback_identity_verification_enabled", configured: false }]);
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.deepEqual(callbackVerifierCandidates({ api_key: "secret-value" }), []);
});

test("diagnostic calls only the fixed read endpoint and classifies failures without leaking values", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://backend.composio.dev/api/v3/org/project/config");
    assert.equal(new Headers(options?.headers).get("x-api-key"), "fixture-key");
    return Response.json({ oauth_callback_verifier_url: "https://secret.test/token" });
  };
  assert.deepEqual(await readComposioProjectStatus(null, transport), { state: "not_configured" });
  assert.equal(calls, 0);
  const result = await readComposioProjectStatus("fixture-key", transport);
  assert.deepEqual(result, { state: "ok", candidates: [{ field: "oauth_callback_verifier_url", configured: true }] });
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.deepEqual(await readComposioProjectStatus("fixture-key", async () => new Response("", { status: 403 })), { state: "provider_error", provider_status: 403 });
  assert.deepEqual(await readComposioProjectStatus("fixture-key", async () => { throw new Error("network"); }), { state: "unavailable" });
});
