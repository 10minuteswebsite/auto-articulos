import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { getAllowedOAuthOrigin, getOAuthRedirectUri } from "./oauth-redirect";

test("acepta solo los hosts OAuth explícitos del proyecto", () => {
  assert.equal(
    getAllowedOAuthOrigin(new NextRequest("https://seototal.articulos.lasolucionweb.com/dashboard")),
    "https://seototal.articulos.lasolucionweb.com",
  );
  assert.equal(getAllowedOAuthOrigin(new NextRequest("https://evil.example/dashboard")), null);
});

test("mantiene el URI configurado fuera de la lista blanca", () => {
  assert.equal(
    getOAuthRedirectUri(
      new NextRequest("https://preview.example/dashboard"),
      "/api/search-integrations/google/callback",
      "https://seototal.lasolucionweb.com/api/search-integrations/google/callback",
    ),
    "https://seototal.lasolucionweb.com/api/search-integrations/google/callback",
  );
});

test("rechaza puertos, sufijos y prefijos maliciosos", () => {
  for (const host of [
    "seototal.lasolucionweb.com:8443",
    "seototal.lasolucionweb.com.evil.com",
    "evilseototal.lasolucionweb.com",
  ]) {
    assert.equal(getAllowedOAuthOrigin(new NextRequest(`https://${host}/dashboard`)), null);
  }
});

test("normaliza mayúsculas, pero no acepta comodines literales ni host vacío", () => {
  assert.equal(
    getAllowedOAuthOrigin(new NextRequest("https://SEOTOTAL.ARTICULOS.LASOLUCIONWEB.COM/dashboard")),
    "https://seototal.articulos.lasolucionweb.com",
  );
  process.env.SEO_TOTAL_OAUTH_ALLOWED_HOSTS = "*.lasolucionweb.com";
  assert.equal(getAllowedOAuthOrigin(new NextRequest("https://foo.lasolucionweb.com/dashboard")), null);
  assert.equal(getAllowedOAuthOrigin(new NextRequest("https:///dashboard")), null);
  delete process.env.SEO_TOTAL_OAUTH_ALLOWED_HOSTS;
});
