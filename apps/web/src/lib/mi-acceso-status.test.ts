import test from "node:test";
import assert from "node:assert/strict";
import { accessStatusText } from "./mi-acceso-status";

test("traduce estados de acceso para la vista Mi acceso", () => {
  assert.equal(accessStatusText({ allowed: true, reason: "ACTIVE", graceUntil: null, graceDaysLeft: null }), "Activo");
  assert.equal(accessStatusText({ allowed: true, reason: "GRACE", graceUntil: "2026-10-05T00:00:00.000Z", graceDaysLeft: 3 }), "En gracia hasta 05/10/2026 (3 días)");
  assert.equal(accessStatusText({ allowed: false, reason: "INACTIVE", graceUntil: null, graceDaysLeft: null }), "Sin acceso");
  assert.equal(accessStatusText({ allowed: true, reason: "NO_RECORD_LEGACY", graceUntil: null, graceDaysLeft: null }), "Sin registro (se mantiene el acceso de siempre)");
});
