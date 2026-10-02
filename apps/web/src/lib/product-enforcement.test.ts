import { test } from "node:test";
import assert from "node:assert/strict";
import { decideEnforcement, parseEnforcementMode } from "./product-enforcement";
import type { ProductAccess } from "@auto-articulos/shared";

const allowed: ProductAccess = { allowed: true, reason: "ACTIVE", status: "ACTIVE", graceUntil: null, graceDaysLeft: null };
const denied: ProductAccess = { allowed: false, reason: "INACTIVE", status: "INACTIVE", graceUntil: null, graceDaysLeft: null };

test("el modo por defecto, o cualquier valor raro, es «off» (un valor mal guardado nunca bloquea)", () => {
  assert.equal(parseEnforcementMode(undefined), "off");
  assert.equal(parseEnforcementMode(null), "off");
  assert.equal(parseEnforcementMode(""), "off");
  assert.equal(parseEnforcementMode("ENFORCE"), "off");
  assert.equal(parseEnforcementMode("true"), "off");
  assert.equal(parseEnforcementMode(42), "off");
});

test("solo «shadow» y «enforce» exactos se reconocen", () => {
  assert.equal(parseEnforcementMode("shadow"), "shadow");
  assert.equal(parseEnforcementMode("enforce"), "enforce");
  assert.equal(parseEnforcementMode("off"), "off");
});

test("off: nunca bloquea y nunca registra, aunque no tenga derecho", () => {
  assert.deepEqual(decideEnforcement("off", denied), { block: false, wouldDeny: false });
  assert.deepEqual(decideEnforcement("off", allowed), { block: false, wouldDeny: false });
});

test("shadow: no bloquea pero registra lo que habría bloqueado", () => {
  assert.deepEqual(decideEnforcement("shadow", denied), { block: false, wouldDeny: true });
  assert.deepEqual(decideEnforcement("shadow", allowed), { block: false, wouldDeny: false });
});

test("enforce: bloquea solo a quien no tiene derecho", () => {
  assert.deepEqual(decideEnforcement("enforce", denied), { block: true, wouldDeny: true });
  assert.deepEqual(decideEnforcement("enforce", allowed), { block: false, wouldDeny: false });
});
