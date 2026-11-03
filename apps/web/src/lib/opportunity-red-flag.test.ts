import assert from "node:assert/strict";
import test from "node:test";

import { MIN_TITLES_PROMISE, buildRedFlag } from "./opportunity-red-flag";

test("la promesa mínima del botón 2 es 3", () => {
  assert.equal(MIN_TITLES_PROMISE, 3);
});

test("bandera roja: el motivo para el administrador lleva los números reales y el del usuario no lleva códigos", () => {
  const diag = { modelProposedTitles: 32, rejectedDuplicateOfExisting: 19, rejectedDuplicateOfThisRun: 0, rejectedExcludedTopic: 5, rejectedNoQuotedEvidence: 3, rejectedGeoComboNotUsed: 4, rejectedCategoryMismatch: 1, filasDeEvidencia: 2640 };
  const flag = buildRedFlag(0, diag);
  assert.match(flag.admin, /Quedaron 0 de 3/);
  assert.match(flag.admin, /32 propuestas/);
  assert.match(flag.admin, /19 repetían/);
  assert.match(flag.admin, /5 chocaban con los temas excluidos/);
  assert.match(flag.usuario, /ninguna idea nueva/);
  assert.match(flag.usuario, /ya cubre casi todos los temas/, "predominan los repetidos");
  assert.doesNotMatch(flag.usuario, /rejected|Diagnostico|batches|\d{3,}/);
});

test("bandera roja: si predominan las exclusiones, se le sugiere revisar sus temas excluidos", () => {
  const flag = buildRedFlag(2, { modelProposedTitles: 20, rejectedDuplicateOfExisting: 2, rejectedExcludedTopic: 12 });
  assert.match(flag.usuario, /2 ideas nuevas/);
  assert.match(flag.usuario, /temas excluidos/);
  assert.match(buildRedFlag(1, undefined).usuario, /1 idea nueva/);
});
