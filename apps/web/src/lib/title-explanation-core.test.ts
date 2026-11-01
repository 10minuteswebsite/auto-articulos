import { test } from "node:test";
import assert from "node:assert/strict";
import { limitToTwoParagraphs, nextExplanationAt, similarityPct } from "./title-explanation-core";

test("títulos iguales se parecen 100% y distintos casi nada", () => {
  assert.equal(similarityPct("How to Price Your Coral Gables Home", "how to price your coral gables home!"), 100);
  assert.ok(similarityPct("Post-Closing Occupancy Agreements: What Sellers Need to Know", "Understanding Post-Closing Occupancy Agreements") >= 40);
  assert.ok(similarityPct("Halloween events in Coral Gables", "Closing costs for sellers") < 20);
});

test("el resumen nunca pasa de dos párrafos", () => {
  assert.equal(limitToTwoParagraphs("Uno.\n\nDos.\n\nTres.\n\nCuatro."), "Uno.\n\nDos.");
  assert.equal(limitToTwoParagraphs("  Solo uno.  "), "Solo uno.");
  assert.equal(limitToTwoParagraphs("   "), "");
});

test("el cupo diario dice cuándo se libera la siguiente explicación", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  const hace3h = new Date("2026-11-02T09:00:00Z");
  assert.equal(nextExplanationAt([], 1, now), null);
  assert.equal(nextExplanationAt([hace3h], 1, now)?.toISOString(), "2026-11-03T09:00:00.000Z");
  assert.equal(nextExplanationAt([new Date("2026-11-01T09:00:00Z")], 1, now), null);
  assert.equal(nextExplanationAt([hace3h], 2, now), null);
});
