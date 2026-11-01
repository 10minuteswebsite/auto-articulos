import { test } from "node:test";
import assert from "node:assert/strict";
import { SELECTABLE_MODES, SHADOW_MAX_DAYS, isShadowExpired, parseMode, parsePercent, requestBucket, shouldApplyGuard } from "./title-guard-mode";

test("cualquier valor raro deja la guardia apagada", () => {
  for (const raro of [undefined, null, "", "ACTIVO", "on", 1, {}, "sombra "]) assert.equal(parseMode(raro), "apagado");
  assert.equal(parseMode("sombra"), "sombra");
  assert.equal(parseMode("activo"), "activo");
});

test("un administrador puede elegir apagado, sombra o activo", () => {
  assert.deepEqual(SELECTABLE_MODES, ["apagado", "sombra", "activo"]);
});

test("la sombra se apaga sola a los 14 días si nadie la renueva", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const hace = (d: number) => new Date(now.getTime() - d * 86_400_000);
  assert.equal(SHADOW_MAX_DAYS, 14);
  assert.equal(isShadowExpired(hace(1), now), false);
  assert.equal(isShadowExpired(hace(14), now), false);
  assert.equal(isShadowExpired(hace(15), now), true);
});

test("el porcentaje se acota entre 0 y 100 y cualquier valor raro es 0", () => {
  assert.equal(parsePercent(10), 10);
  assert.equal(parsePercent("55"), 55);
  assert.equal(parsePercent(250), 100);
  assert.equal(parsePercent(-4), 0);
  for (const raro of [undefined, null, "", "abc", NaN]) assert.equal(parsePercent(raro), 0);
});

test("la cubeta de una solicitud es estable y el reparto se parece al porcentaje pedido", () => {
  assert.equal(requestBucket("abc123"), requestBucket("abc123"));
  const ids = Array.from({ length: 5000 }, (_, i) => `cm${i.toString(36)}x${(i * 7919).toString(36)}`);
  for (const pct of [0, 10, 50, 100]) {
    const applied = ids.filter((id) => shouldApplyGuard(id, pct)).length / ids.length;
    assert.ok(Math.abs(applied - pct / 100) < 0.04, `${pct} % → ${applied}`);
  }
  assert.equal(ids.filter((id) => shouldApplyGuard(id, 0)).length, 0);
  assert.equal(ids.filter((id) => shouldApplyGuard(id, 100)).length, ids.length);
});
