import assert from "node:assert/strict";
import test from "node:test";
import { stripMarkdownEmphasis } from "./caption-limits";

test("stripMarkdownEmphasis quita ** y __ sin tocar el resto del texto", () => {
  assert.equal(stripMarkdownEmphasis("✨ **Conoce tus opciones:**\nHMO es ideal"), "✨ Conoce tus opciones:\nHMO es ideal");
  assert.equal(stripMarkdownEmphasis("Un __punto__ y **otro**"), "Un punto y otro");
  assert.equal(stripMarkdownEmphasis("Sin énfasis, 2*3 y snake_case"), "Sin énfasis, 2*3 y snake_case");
});
