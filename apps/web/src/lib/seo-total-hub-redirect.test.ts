import assert from "node:assert/strict";
import { test } from "node:test";
import { isSeoTotalHumanEntry } from "./seo-total-hub-redirect";

test("solo redirige entradas humanas sin sesión de seototal.com", () => {
  for (const hostname of [
    "seototal.lasolucionweb.com",
    "articulos.lasolucionweb.com",
    "articulos.lasolucionweb.net",
    "redes.lasolucionweb.com",
    "redes.lasolucionweb.net",
  ]) {
    for (const pathname of ["/", "/login", "/dashboard", "/dashboard/configuracion/conexiones"]) {
      assert.equal(isSeoTotalHumanEntry(hostname, pathname), true, `${hostname}${pathname}`);
    }
  }
});

test("no confunde otros dominios ni rutas técnicas con entradas humanas", () => {
  for (const [hostname, pathname] of [
    ["seototal.lasolucionweb.net", "/"],
    ["otro.lasolucionweb.net", "/dashboard"],
    ["seototal.lasolucionweb.com", "/api/search-integrations/google/callback"],
    ["seototal.lasolucionweb.com", "/auth/hub"],
    ["seototal.lasolucionweb.com", "/acerca-de"],
  ] as const) {
    assert.equal(isSeoTotalHumanEntry(hostname, pathname), false, `${hostname}${pathname}`);
  }
});
