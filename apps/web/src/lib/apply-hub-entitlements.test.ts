import assert from "node:assert/strict";
import test from "node:test";
import { applyHubEntitlements } from "./apply-hub-entitlements";

test("aplica formatos allowed/status y mapea appId desde configuración", () => {
  const result = applyHubEntitlements(
    [{ product: "articulos", status: "INACTIVE", version: 4 }],
    [{ appId: "hub-a", allowed: true }, { appId: "hub-r", status: "denied" }],
    { "hub-a": "ARTICULOS", "hub-r": "REDES" },
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

test("acepta el formato agrupado por productos", () => {
  const result = applyHubEntitlements([], [{ products: { ARTICULOS: { status: "trialing" }, REDES: { status: "revoked" } } }], {});
  assert.deepEqual(result.transitions.map(({ product, to }) => ({ product, to })), [
    { product: "articulos", to: "ACTIVE" },
    { product: "redes", to: "INACTIVE" },
  ]);
});

test("normaliza producto en minúsculas y conserva GRACE", () => {
  const result = applyHubEntitlements(
    [{ product: "REDES", status: "GRACE", version: 2 }],
    [{ product: "redes", allowed: true }],
    {},
  );
  assert.equal(result.transitions[0]?.to, "ACTIVE");
  assert.equal(result.transitions[0]?.version, 3);
});

test("ignora entrada sin producto ni app y deja INACTIVE explícito", () => {
  const result = applyHubEntitlements(
    [{ product: "ARTICULOS", status: "ACTIVE", version: 1 }],
    [{ allowed: true }, { product: "ARTICULOS", allowed: false }],
    {},
  );
  assert.equal(result.unknown.length, 1);
  assert.equal(result.transitions[0]?.to, "INACTIVE");
});

test("el mismo mensaje repetido produce unchanged", () => {
  const result = applyHubEntitlements(
    [{ product: "REDES", status: "ACTIVE", version: 4 }],
    [{ product: "REDES", status: "active" }],
    {},
  );
  assert.equal(result.transitions[0]?.event, "unchanged");
});
