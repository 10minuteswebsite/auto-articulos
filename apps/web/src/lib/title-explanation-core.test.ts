import { test } from "node:test";
import assert from "node:assert/strict";
import { humanizeRequestInputs, limitToThreeParagraphs, nextExplanationAt, similarityPct } from "./title-explanation-core";

test("títulos iguales se parecen 100% y distintos casi nada", () => {
  assert.equal(similarityPct("How to Price Your Coral Gables Home", "how to price your coral gables home!"), 100);
  assert.ok(similarityPct("Post-Closing Occupancy Agreements: What Sellers Need to Know", "Understanding Post-Closing Occupancy Agreements") >= 40);
  assert.ok(similarityPct("Halloween events in Coral Gables", "Closing costs for sellers") < 20);
});

test("el resumen nunca pasa de tres párrafos", () => {
  assert.equal(limitToThreeParagraphs("Uno.\n\nDos.\n\nTres.\n\nCuatro."), "Uno.\n\nDos.\n\nTres.");
  assert.equal(limitToThreeParagraphs("  Solo uno.  "), "Solo uno.");
  assert.equal(limitToThreeParagraphs("   "), "");
});

test("el cupo diario dice cuándo se libera la siguiente explicación", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  const hace3h = new Date("2026-11-02T09:00:00Z");
  assert.equal(nextExplanationAt([], 1, now), null);
  assert.equal(nextExplanationAt([hace3h], 1, now)?.toISOString(), "2026-11-03T09:00:00.000Z");
  assert.equal(nextExplanationAt([new Date("2026-11-01T09:00:00Z")], 1, now), null);
  assert.equal(nextExplanationAt([hace3h], 2, now), null);
});

test("lo que la persona pidió sale con etiquetas en español, sin JSON ni claves", () => {
  const lines = humanizeRequestInputs({ tema: "Vender y mudarse", clienteTipo: "Dueños en Coral Gables", rareza: "x", ubicacionNegocio: "  Coral   Gables " });
  assert.deepEqual(lines, [
    { etiqueta: "Tema que pediste", texto: "Vender y mudarse" },
    { etiqueta: "A quién le escribes", texto: "Dueños en Coral Gables" },
    { etiqueta: "Dónde está tu negocio", texto: "Coral Gables" },
  ]);
  assert.deepEqual(humanizeRequestInputs(null), []);
  assert.ok(humanizeRequestInputs({ tema: "a".repeat(500) })[0].texto.length <= 221);
});
