import test from "node:test";
import assert from "node:assert/strict";
import { isConnectionVisible, isProductViewAllowed } from "./product-view-filter";

test("sin producto conserva ambas vistas", () => {
  assert.equal(isProductViewAllowed(null, "analiticas"), true);
  assert.equal(isProductViewAllowed(null, "difusion"), true);
});

test("articulos solo muestra analiticas y redes solo difusion", () => {
  assert.equal(isProductViewAllowed("articulos", "analiticas"), true);
  assert.equal(isProductViewAllowed("articulos", "difusion"), false);
  assert.equal(isProductViewAllowed("redes", "analiticas"), false);
  assert.equal(isProductViewAllowed("redes", "difusion"), true);
});

test("Search Console es visible en ambos productos sin duplicar conexiones", () => {
  assert.equal(isConnectionVisible("articulos", "analiticas", "google-search-console"), true);
  assert.equal(isConnectionVisible("redes", "analiticas", "google-search-console"), true);
  assert.equal(isConnectionVisible("redes", "analiticas", "google-analytics"), false);
});
