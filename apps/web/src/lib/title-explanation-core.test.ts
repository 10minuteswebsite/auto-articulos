import { test } from "node:test";
import assert from "node:assert/strict";
import { limitToTwoParagraphs, similarityPct } from "./title-explanation-core";

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
