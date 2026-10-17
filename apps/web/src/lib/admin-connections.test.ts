import test from "node:test";
import assert from "node:assert/strict";
import { adminConnectionItems } from "./admin-connections";

test("el menú Admin muestra las mismas conexiones en Artículos, Redes y compartido", () => {
  const labels = (host: "ARTICULOS" | "REDES" | "COMPARTIDO") => adminConnectionItems(host).map((item) => item.label);
  const todas = labels("COMPARTIDO");
  assert.deepEqual(labels("ARTICULOS"), todas);
  assert.deepEqual(labels("REDES"), todas);
  for (const nombre of ["Bing Webmaster Tools", "LinkedIn", "Pinterest", "Tumblr", "Bluesky", "Blogger"]) {
    assert.ok(todas.includes(nombre), nombre);
  }
});
