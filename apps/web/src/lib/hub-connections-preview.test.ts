import assert from "node:assert/strict";
import test from "node:test";
import { canShowHubConnectionsPreview } from "./hub-connections-preview";

test("the unfinished Hub resource is shown only to direct application administrators", () => {
  assert.equal(canShowHubConnectionsPreview({ role: "admin", isActingAdmin: false }), true);
  for (const identity of [null, {}, { role: "customer", isActingAdmin: false }, { role: "operator", isActingAdmin: false }, { role: "admin", isActingAdmin: true }, { role: "admin" }]) {
    assert.equal(canShowHubConnectionsPreview(identity), false);
  }
});
