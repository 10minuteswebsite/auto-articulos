import assert from "node:assert/strict";
import { test } from "node:test";
import { isSeoTotalHumanEntry } from "./seo-total-hub-redirect";

test("solo redirige entradas humanas sin sesión de seototal.com", () => {
  for (const pathname of ["/", "/login", "/dashboard", "/dashboard/configuracion/conexiones"]) {
    assert.equal(isSeoTotalHumanEntry("seototal.lasolucionweb.com", pathname), true, pathname);
  }
});

test("no confunde otros dominios ni rutas técnicas con entradas humanas", () => {
  for (const [hostname, pathname] of [
    ["seototal.lasolucionweb.net", "/"],
    ["articulos.lasolucionweb.com", "/dashboard"],
    ["redes.lasolucionweb.com", "/dashboard"],
    ["seototal.lasolucionweb.com", "/api/search-integrations/google/callback"],
    ["seototal.lasolucionweb.com", "/auth/hub"],
    ["seototal.lasolucionweb.com", "/acerca-de"],
  ] as const) {
    assert.equal(isSeoTotalHumanEntry(hostname, pathname), false, `${hostname}${pathname}`);
  }
});
