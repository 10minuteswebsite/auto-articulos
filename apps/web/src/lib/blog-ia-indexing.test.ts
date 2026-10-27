import { test } from "node:test";
import assert from "node:assert/strict";
import { isIndexingNotApplicable, starterHostOf } from "./blog-ia-indexing";

test("starterHostOf: solo la dirección de inicio cuenta; un dominio propio o nada, no", () => {
  assert.equal(starterHostOf("blogia-lorena.lasolucionweb.net"), "blogia-lorena.lasolucionweb.net");
  assert.equal(starterHostOf("  BLOGIA-Lorena.LaSolucionWeb.net "), "blogia-lorena.lasolucionweb.net");
  assert.equal(starterHostOf("blog.segurosdesaludyvida.com"), null);
  assert.equal(starterHostOf("lasolucionweb.net"), null);
  assert.equal(starterHostOf("evil-lasolucionweb.net"), null);
  assert.equal(starterHostOf(null), null);
});

test("isIndexingNotApplicable: solo los artículos del blog en dirección de inicio", () => {
  const host = "blogia-lorena.lasolucionweb.net";
  assert.equal(isIndexingNotApplicable(host, `https://${host}/un-articulo/`), true);
  assert.equal(isIndexingNotApplicable(host, "https://www.segurosdesaludyvida.com/categ/otro"), false);
  assert.equal(isIndexingNotApplicable(null, `https://${host}/x/`), false);
  assert.equal(isIndexingNotApplicable(host, null), false);
  assert.equal(isIndexingNotApplicable(host, "no es una url"), false);
});
