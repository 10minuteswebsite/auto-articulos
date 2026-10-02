import assert from "node:assert/strict";
import test from "node:test";
import { applyHubEntitlements } from "./apply-hub-entitlements";

test("aplica formatos allowed/status y mapea appId desde configuración", () => {
  const result = applyHubEntitlements(
    [{ product: "articulos", status: "INACTIVE", version: 4 }],
    [{ appId: "hub-a", allowed: true }, { appId: "hub-r", status: "denied" }],
    { "hub-a": "articulos", "hub-r": "redes" },
  );
  assert.deepEqual(result.transitions, [
    { product: "articulos", from: "INACTIVE", to: "ACTIVE", source: "HUB", version: 5, event: "activated" },
    { product: "redes", from: null, to: "INACTIVE", source: "HUB", version: 1, event: "deactivated" },
  ]);
});

test("no revoca por omisión y reporta entradas desconocidas", () => {
  const result = applyHubEntitlements(
    [{ product: "redes", status: "ACTIVE", version: 2 }],
    [{ appId: "other", allowed: true }],
    {},
  );
  assert.deepEqual(result.transitions, []);
  assert.deepEqual(result.unknown, [{ appId: "other", allowed: true }]);
});
