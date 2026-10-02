import test from "node:test";
import assert from "node:assert/strict";
import { finalRedirectUrl, toOriginUrl } from "./access-router-adapter";

test("toOriginUrl normaliza host o URL a origen https", () => {
  assert.equal(toOriginUrl("redes.lasolucionweb.com"), "https://redes.lasolucionweb.com");
  assert.equal(toOriginUrl("https://hub.lasolucionweb.net/algo?x=1"), "https://hub.lasolucionweb.net");
});

test("finalRedirectUrl: sin redirección, null; con ella, URL completa al dashboard", () => {
  assert.equal(finalRedirectUrl({ kind: "stay" }, "seototal.lasolucionweb.com"), null);
  assert.equal(
    finalRedirectUrl({ kind: "redirect", url: "articulos.lasolucionweb.com" }, "seototal.lasolucionweb.com"),
    "https://articulos.lasolucionweb.com/dashboard",
  );
  assert.equal(
    finalRedirectUrl({ kind: "redirect", url: "https://hub.lasolucionweb.net" }, "seototal.lasolucionweb.com"),
    "https://hub.lasolucionweb.net/dashboard",
  );
});

test("finalRedirectUrl nunca redirige al mismo host (anti-bucle)", () => {
  assert.equal(finalRedirectUrl({ kind: "redirect", url: "redes.lasolucionweb.com" }, "redes.lasolucionweb.com"), null);
  assert.equal(finalRedirectUrl({ kind: "redirect", url: "https://REDES.lasolucionweb.com" }, "redes.lasolucionweb.com"), null);
});
