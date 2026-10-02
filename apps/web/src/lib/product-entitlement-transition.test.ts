import test from "node:test";
import assert from "node:assert/strict";
import { computeNextEntitlement } from "./product-entitlement-transition";

const now = new Date("2026-10-02T00:00:00.000Z");

test("computes entitlement transitions and validates boundaries", () => {
  assert.deepEqual(computeNextEntitlement(null, "set_status", { status: "ACTIVE" }, now), { ok: true, status: "ACTIVE", graceUntil: null });
  assert.equal(computeNextEntitlement(null, "set_status", { status: "GRACE" }, now).ok, false);
  assert.equal(computeNextEntitlement(null, "grant_grace", { days: 0 }, now).ok, false);
  assert.equal(computeNextEntitlement(null, "grant_grace", { days: 366 }, now).ok, false);
  assert.deepEqual(computeNextEntitlement(null, "grant_grace", { days: 1 }, now), { ok: true, status: "GRACE", graceUntil: new Date("2026-10-03T00:00:00.000Z") });
  assert.equal(computeNextEntitlement(null, "remove_grace", {}, now).ok, false);
  assert.deepEqual(computeNextEntitlement({ status: "GRACE", graceUntil: new Date("2026-10-05T00:00:00.000Z") }, "remove_grace", {}, now), { ok: true, status: "INACTIVE", graceUntil: null });
});
