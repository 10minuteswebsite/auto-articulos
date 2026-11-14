import assert from "node:assert/strict";
import test from "node:test";
import { canShowHubConnectionsPreview } from "./hub-connections-preview";
import { isHubConnectionsPilot } from "./hub-connections-pilot";

test("the unfinished Hub resource is shown to direct administrators and the authorized pilot", () => {
  assert.equal(canShowHubConnectionsPreview({ role: "admin", isActingAdmin: false }), true);
  assert.equal(canShowHubConnectionsPreview({ role: "user", isActingAdmin: false, hubConnectionsPilot: true }), true);
  assert.equal(canShowHubConnectionsPreview({ role: "user", isActingAdmin: true, hubConnectionsPilot: true }), false);
  assert.equal(canShowHubConnectionsPreview({ role: "user", hubConnectionsPilot: true }), false);
  for (const identity of [null, {}, { role: "customer", isActingAdmin: false }, { role: "operator", isActingAdmin: false }, { role: "admin", isActingAdmin: true }, { role: "admin" }]) {
    assert.equal(canShowHubConnectionsPreview(identity), false);
  }
});


test("only the selected direct Hub identity is marked as pilot", () => {
  const id = "a1049d33-ca3a-4519-b67c-9909b35cdee1";
  assert.equal(isHubConnectionsPilot(id, false), true);
  assert.equal(isHubConnectionsPilot(id, true), false);
  assert.equal(isHubConnectionsPilot("other", false), false);
  assert.equal(isHubConnectionsPilot(null, false), false);
});
