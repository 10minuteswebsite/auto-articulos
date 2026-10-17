import test from "node:test";
import assert from "node:assert/strict";
import { bingClientChangedAt, bingNeedsReconnect } from "./bing-client-change";

test("sin fecha de cambio no se avisa a nadie", () => {
  assert.equal(bingClientChangedAt({}), null);
  assert.equal(bingClientChangedAt({ BING_CLIENT_CHANGED_AT: "  " }), null);
  assert.equal(bingClientChangedAt({ BING_CLIENT_CHANGED_AT: "no es fecha" }), null);
  assert.equal(bingNeedsReconnect(null, null), false);
});

test("con fecha de cambio se avisa a quien no reconectó o reconectó antes", () => {
  const changed = bingClientChangedAt({ BING_CLIENT_CHANGED_AT: "2026-10-18T12:00:00Z" });
  assert.ok(changed);
  assert.equal(bingNeedsReconnect(changed, null), true);
  assert.equal(bingNeedsReconnect(changed, new Date("2026-10-17T00:00:00Z")), true);
});

test("quien reconectó después de la fecha ya no ve el aviso", () => {
  const changed = new Date("2026-10-18T12:00:00Z");
  assert.equal(bingNeedsReconnect(changed, new Date("2026-10-18T12:00:00Z")), false);
  assert.equal(bingNeedsReconnect(changed, new Date("2026-10-19T09:00:00Z")), false);
});

import { bingExplicitRedirect } from "./bing-oauth";

test("la dirección de retorno explícita de Bing solo vale si es https y válida", () => {
  assert.equal(bingExplicitRedirect({}), null);
  assert.equal(bingExplicitRedirect({ BING_WEBMASTER_REDIRECT_URI: "no es url" }), null);
  assert.equal(bingExplicitRedirect({ BING_WEBMASTER_REDIRECT_URI: "http://articulos.lasolucionweb.net/x" }), null);
  const ok = bingExplicitRedirect({ BING_WEBMASTER_REDIRECT_URI: "https://articulos.lasolucionweb.net/api/search-integrations/bing/callback" });
  assert.equal(ok?.host, "articulos.lasolucionweb.net");
  assert.equal(ok?.toString(), "https://articulos.lasolucionweb.net/api/search-integrations/bing/callback");
});
