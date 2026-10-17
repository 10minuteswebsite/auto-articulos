import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { getAllowedOAuthOrigin, getOAuthRedirectUri } from "./oauth-redirect";

test("acepta solo los hosts OAuth explícitos del proyecto", () => {
  assert.equal(
    getAllowedOAuthOrigin(new NextRequest("https://articulos.lasolucionweb.com/dashboard")),
    "https://articulos.lasolucionweb.com",
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
    "articulos.lasolucionweb.com.evil.com",
    "redes.lasolucionweb.com.evil.com",
    "evilarticulos.lasolucionweb.com",
    "seototal.articulos.lasolucionweb.com", // nombre antiguo ya descartado
  ]) {
    assert.equal(getAllowedOAuthOrigin(new NextRequest(`https://${host}/dashboard`)), null);
  }
});

test("normaliza mayúsculas, pero no acepta comodines literales ni host vacío", () => {
  assert.equal(
    getAllowedOAuthOrigin(new NextRequest("https://ARTICULOS.LASOLUCIONWEB.COM/dashboard")),
    "https://articulos.lasolucionweb.com",
  );
  process.env.SEO_TOTAL_OAUTH_ALLOWED_HOSTS = "*.lasolucionweb.com";
  assert.equal(getAllowedOAuthOrigin(new NextRequest("https://foo.lasolucionweb.com/dashboard")), null);
  assert.equal(getAllowedOAuthOrigin(new NextRequest("https:///dashboard")), null);
  delete process.env.SEO_TOTAL_OAUTH_ALLOWED_HOSTS;
});

// ── Retorno único ─────────────────────────────────────────────────
import {
  canonicalOAuthOrigin,
  isAllowedOAuthHost,
  oauthCallbackUri,
  oauthReturnBase,
  rememberOAuthOrigin,
  clearOAuthOrigin,
  OAUTH_ORIGIN_COOKIE,
} from "./oauth-redirect";

const req = (url: string, cookie?: string) => ({ url, headers: new Headers(cookie ? { cookie } : {}) });

test("el redirect_uri es SIEMPRE el canónico (la dirección ya registrada)", () => {
  assert.equal(canonicalOAuthOrigin({}), "https://seototal.lasolucionweb.com");
  for (const host of ["seototal", "articulos", "redes"]) {
    assert.equal(
      oauthCallbackUri(req(`https://${host}.lasolucionweb.com/api/x`), "/api/search-integrations/linkedin/callback", {}),
      "https://seototal.lasolucionweb.com/api/search-integrations/linkedin/callback",
    );
  }
  assert.equal(canonicalOAuthOrigin({ OAUTH_CANONICAL_ORIGIN: "https://otro.example.com/ruta" }), "https://otro.example.com");
  assert.equal(canonicalOAuthOrigin({ OAUTH_CANONICAL_ORIGIN: "http://inseguro.example.com" }), "https://seototal.lasolucionweb.com"); // solo https
  assert.equal(canonicalOAuthOrigin({ OAUTH_CANONICAL_ORIGIN: "no es url" }), "https://seototal.lasolucionweb.com");
});

test("el retorno vuelve al host recordado solo si está permitido", () => {
  const env = {};
  const ok = req("https://seototal.lasolucionweb.com/cb", `a=1; ${OAUTH_ORIGIN_COOKIE}=redes.lasolucionweb.com; b=2`);
  assert.equal(oauthReturnBase(ok, env), "https://redes.lasolucionweb.com");
  const mayus = req("https://seototal.lasolucionweb.com/cb", `${OAUTH_ORIGIN_COOKIE}=ARTICULOS.LASOLUCIONWEB.COM`);
  assert.equal(oauthReturnBase(mayus, env), "https://articulos.lasolucionweb.com");
  for (const evil of ["evil.example.com", "redes.lasolucionweb.com.evil.com", "evil.com%2F@redes.lasolucionweb.com", ""]) {
    const r = req("https://seototal.lasolucionweb.com/cb", `${OAUTH_ORIGIN_COOKIE}=${evil}`);
    assert.equal(oauthReturnBase(r, env), r.url, evil); // nunca un destino arbitrario
  }
  const sinCookie = req("https://seototal.lasolucionweb.com/cb");
  assert.equal(oauthReturnBase(sinCookie, env), sinCookie.url);
  assert.equal(isAllowedOAuthHost("redes.lasolucionweb.com", env), true);
  assert.equal(isAllowedOAuthHost("evil.com", env), false);
});

test("rememberOAuthOrigin/clearOAuthOrigin escriben la cookie solo con host permitido", () => {
  const mk = () => {
    const sets: string[] = [];
    return { sets, headers: new Headers(), cookies: { set: (name: string) => { sets.push(name); } } };
  };
  const ok = mk();
  rememberOAuthOrigin(ok, req("https://redes.lasolucionweb.com/x"), {});
  assert.deepEqual(ok.sets, [OAUTH_ORIGIN_COOKIE]);
  const evil = mk();
  rememberOAuthOrigin(evil, req("https://evil.example.com/x"), {});
  assert.equal(evil.sets.length, 0);
  const net = mk();
  rememberOAuthOrigin(net, req("https://redes.lasolucionweb.net/x"), {});
  assert.equal(net.sets.length, 0); // los .net no están en la lista de retorno
  const clr = mk();
  clearOAuthOrigin(clr, {});
  assert.equal(clr.sets.length, 1);
});

test("acepta los dos subdominios de producto y el principal", () => {
  for (const host of ["seototal.lasolucionweb.com", "articulos.lasolucionweb.com", "redes.lasolucionweb.com"]) {
    assert.equal(getAllowedOAuthOrigin(new NextRequest(`https://${host}/dashboard`)), `https://${host}`);
  }
});
