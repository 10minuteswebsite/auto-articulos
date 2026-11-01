import { test } from "node:test";
import assert from "node:assert/strict";
import { SELECTABLE_MODES, SHADOW_MAX_DAYS, isShadowExpired, parseMode } from "./title-guard-mode";

test("cualquier valor raro deja la guardia apagada", () => {
  for (const raro of [undefined, null, "", "ACTIVO", "on", 1, {}, "sombra "]) assert.equal(parseMode(raro), "apagado");
  assert.equal(parseMode("sombra"), "sombra");
  assert.equal(parseMode("activo"), "activo");
});

test("hoy un administrador solo puede elegir apagado o sombra (activo llega en la Fase 3)", () => {
  assert.deepEqual(SELECTABLE_MODES, ["apagado", "sombra"]);
});

test("la sombra se apaga sola a los 14 días si nadie la renueva", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const hace = (d: number) => new Date(now.getTime() - d * 86_400_000);
  assert.equal(SHADOW_MAX_DAYS, 14);
  assert.equal(isShadowExpired(hace(1), now), false);
  assert.equal(isShadowExpired(hace(14), now), false);
  assert.equal(isShadowExpired(hace(15), now), true);
});
