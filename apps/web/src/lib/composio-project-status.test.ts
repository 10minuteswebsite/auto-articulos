import assert from "node:assert/strict";
import test from "node:test";
import { callbackVerifierCandidates } from "./composio-project-status";

test("provider configuration diagnostic never returns values or unrelated settings", () => {
  const result = callbackVerifierCandidates({ config: { oauth_callback_verifier_url: "https://example.test/secret?token=fixture", callback_identity_verification_enabled: false, api_key: "secret-value" } });
  assert.deepEqual(result, [{ field: "oauth_callback_verifier_url", configured: true }, { field: "callback_identity_verification_enabled", configured: false }]);
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.deepEqual(callbackVerifierCandidates({ api_key: "secret-value" }), []);
});
