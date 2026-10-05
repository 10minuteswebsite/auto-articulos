import { test } from "node:test";
import assert from "node:assert/strict";
import { checkModeTransition, ENFORCE_CONFIRMATION_WORD } from "./product-enforcement-transition";

test("volver atrás (a off o a shadow) es siempre libre, desde cualquier modo y sin confirmar", () => {
  for (const current of ["off", "shadow", "enforce"] as const) {
    assert.deepEqual(checkModeTransition({ current, next: "off" }), { ok: true });
    assert.deepEqual(checkModeTransition({ current, next: "shadow" }), { ok: true });
  }
});

test("de apagado NO se puede saltar directo a activo", () => {
  const r = checkModeTransition({ current: "off", next: "enforce", confirmation: ENFORCE_CONFIRMATION_WORD });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /Sombra/);
});

test("de sombra a activo exige la confirmación escrita", () => {
  for (const confirmation of [undefined, "", "activar", "SI", true, null]) {
    const r = checkModeTransition({ current: "shadow", next: "enforce", confirmation });
    assert.equal(r.ok, false);
  }
  assert.deepEqual(checkModeTransition({ current: "shadow", next: "enforce", confirmation: "ACTIVAR" }), { ok: true });
});

test("si ya está activo, repetir «activo» no pide nada", () => {
  assert.deepEqual(checkModeTransition({ current: "enforce", next: "enforce" }), { ok: true });
});
