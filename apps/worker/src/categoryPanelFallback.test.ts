import test from "node:test";
import assert from "node:assert/strict";
import { chooseUnambiguousCategoryPanel } from "./categoryPanelFallback";

const category = (panel: string, externalId: string) => ({
  panel,
  externalId,
  name: externalId,
  isSequence: false,
});

test("recupera el único panel que tiene categorías", () => {
  assert.deepEqual(
    chooseUnambiguousCategoryPanel([
      category("Español", "c1"),
      category("Español", "c2"),
    ]),
    [category("Español", "c1"), category("Español", "c2")],
  );
});

test("no mezcla categorías cuando hay varios paneles", () => {
  assert.equal(
    chooseUnambiguousCategoryPanel([
      category("English", "c1"),
      category("Español", "c2"),
    ]),
    null,
  );
});

test("devuelve null si no hay categorías", () => {
  assert.equal(chooseUnambiguousCategoryPanel([]), null);
});
