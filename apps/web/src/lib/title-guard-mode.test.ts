import { test } from "node:test";
import assert from "node:assert/strict";
import { SELECTABLE_MODES, parseMode } from "./title-guard-mode";

test("cualquier valor raro deja la guardia apagada", () => {
  for (const raro of [undefined, null, "", "ACTIVO", "on", 1, {}, "sombra "]) assert.equal(parseMode(raro), "apagado");
  assert.equal(parseMode("sombra"), "sombra");
  assert.equal(parseMode("activo"), "activo");
});

test("hoy un administrador solo puede elegir apagado o sombra (activo llega en la Fase 3)", () => {
  assert.deepEqual(SELECTABLE_MODES, ["apagado", "sombra"]);
});
