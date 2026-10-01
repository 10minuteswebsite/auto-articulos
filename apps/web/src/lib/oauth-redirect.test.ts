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
