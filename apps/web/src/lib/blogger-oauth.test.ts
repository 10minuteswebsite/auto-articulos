import assert from "node:assert/strict";
import test from "node:test";
import { createBloggerOAuthState, verifyBloggerOAuthState } from "./blogger-oauth";

test("Blogger OAuth state is signed, identifies the user, and rejects tampering", () => {
  process.env.SESSION_SECRET = "blogger-state-test-secret";
  const state = createBloggerOAuthState("user-123");
  assert.equal(verifyBloggerOAuthState(state), "user-123");
  assert.equal(verifyBloggerOAuthState(`${state}x`), null);
  assert.equal(verifyBloggerOAuthState(null), null);
});
