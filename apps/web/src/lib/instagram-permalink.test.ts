import test from "node:test";
import assert from "node:assert/strict";
import { _findInstagramPermalink } from "@auto-articulos/shared/src/composio-social";

test("encuentra el enlace en la respuesta directa o anidada", () => {
  assert.equal(_findInstagramPermalink({ permalink: "https://www.instagram.com/p/ABC/" }), "https://www.instagram.com/p/ABC/");
  assert.equal(_findInstagramPermalink({ data: { response_data: { id: "1", permalink: "https://www.instagram.com/reel/XYZ/" } } }), "https://www.instagram.com/reel/XYZ/");
});

test("sin enlace válido devuelve null", () => {
  assert.equal(_findInstagramPermalink({ id: "1" }), null);
  assert.equal(_findInstagramPermalink({ permalink: "no-es-url" }), null);
  assert.equal(_findInstagramPermalink(null), null);
});
