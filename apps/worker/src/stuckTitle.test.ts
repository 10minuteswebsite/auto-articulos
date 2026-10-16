import assert from "node:assert/strict";
import test from "node:test";
import { isTitleStuck, lastTitleActivity, STUCK_PROCESSING_MS } from "./stuckTitle";

const now = Date.parse("2026-10-16T17:14:45Z");
const ago = (ms: number) => new Date(now - ms);

test("título recién reclamado sin eventos NO está atascado (caso Antonio 16/10)", () => {
  // processedAt se marca al reclamar; aún no hay ningún evento.
  assert.equal(isTitleStuck([undefined, ago(500), ago(48_000)], now), false);
});

test("con processedAt vacío cuenta la creación del lote como respaldo", () => {
  assert.equal(isTitleStuck([undefined, null, ago(48_000)], now), false);
  assert.equal(isTitleStuck([undefined, null, ago(STUCK_PROCESSING_MS + 1)], now), true);
});

test("sin ninguna señal no se declara atascado", () => {
  assert.equal(isTitleStuck([undefined, null], now), false);
});

test("un evento reciente mantiene vivo un título aunque el lote sea viejo", () => {
  assert.equal(isTitleStuck([ago(30_000), null, ago(3 * 60 * 60 * 1000)], now), false);
});

test("sin actividad por más de 10 minutos sí está atascado", () => {
  assert.equal(isTitleStuck([ago(11 * 60_000), ago(12 * 60_000)], now), true);
});

test("lastTitleActivity devuelve la señal más reciente", () => {
  assert.equal(lastTitleActivity([ago(5000), ago(1000), null])?.getTime(), now - 1000);
});
