import assert from "node:assert/strict";
import test from "node:test";
import { getHubLogoutContinuation } from "./logout-bridge";

test("uses the HUB logout continuation by default", () => {
  assert.equal(
    getHubLogoutContinuation(null).href,
    "https://hub.lasolucionweb.net/auth/logout?autoArticulosCleared=1",
  );
});

test("preserves an internal HUB logout return target", () => {
  assert.equal(
    getHubLogoutContinuation(
      "https://hub.lasolucionweb.net/auth/logout?returnTo=%2Fwelcome",
    ).href,
    "https://hub.lasolucionweb.net/auth/logout?returnTo=%2Fwelcome&autoArticulosCleared=1",
  );
});

test("rejects external logout continuations", () => {
  assert.equal(
    getHubLogoutContinuation("https://evil.example/logout").href,
    "https://hub.lasolucionweb.net/auth/logout?autoArticulosCleared=1",
  );
});
