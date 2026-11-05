import assert from "node:assert/strict";
import test from "node:test";
import { completeConnectedAccount } from "@auto-articulos/shared";

test("one-use provider session is redeemed only at the fixed endpoint for the expected user", async () => {
  const oldFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://backend.composio.dev/api/v3.1/connected_accounts/complete_auth");
    assert.equal(options?.method, "POST");
    assert.deepEqual(JSON.parse(String(options?.body)), { session_uri: "fixture-session", user_id: "fixture-owner" });
    return Response.json({ connected_account_id: "ca_fixture", toolkit_slug: "google_search_console" });
  };
  try {
    assert.deepEqual(await completeConnectedAccount("fixture-key", { sessionUri: "fixture-session", userId: "fixture-owner" }), { connectedAccountId: "ca_fixture", toolkitSlug: "google_search_console" });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = oldFetch; }
});
