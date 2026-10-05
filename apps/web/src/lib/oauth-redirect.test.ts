import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { getAllowedOAuthOrigin, getOAuthRedirectUri } from "./oauth-redirect";

test("acepta solo los hosts OAuth explícitos del proyecto", () => {
  assert.equal(
    getAllowedOAuthOrigin(new NextRequest("https://articulos.lasolucionweb.com/dashboard")),
    "https://articulos.lasolucionweb.com",
  );
  assert.equal(
    getAllowedOAuthOrigin(new NextRequest("https://redes.lasolucionweb.net/dashboard")),
    "https://redes.lasolucionweb.net",
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

// ── Retorno único (DIA_CERO) ─────────────────────────────────────────────────
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

test("retorno único apagado: el redirect_uri sale del host de la petición, como siempre", () => {
  assert.equal(canonicalOAuthOrigin({}), null);
  assert.equal(
    oauthCallbackUri(req("https://redes.lasolucionweb.com/api/x"), "/api/search-integrations/tumblr/callback", {}),
    "https://redes.lasolucionweb.com/api/search-integrations/tumblr/callback",
  );
  const r = req("https://redes.lasolucionweb.com/api/x", `${OAUTH_ORIGIN_COOKIE}=articulos.lasolucionweb.com`);
  assert.equal(oauthReturnBase(r, {}), r.url); // ignora la cookie
});

test("DIA_CERO=on: .com usa el canónico y .net conserva su propio callback", () => {
  assert.equal(canonicalOAuthOrigin({ DIA_CERO: "on" }), "https://seototal.lasolucionweb.com");
  for (const host of ["seototal", "articulos", "redes"]) {
    assert.equal(
      oauthCallbackUri(req(`https://${host}.lasolucionweb.com/api/x`), "/api/search-integrations/linkedin/callback", { DIA_CERO: "on" }),
      "https://seototal.lasolucionweb.com/api/search-integrations/linkedin/callback",
    );
  }
  assert.equal(
    oauthCallbackUri(req("https://redes.lasolucionweb.net/api/x"), "/api/search-integrations/instagram/callback", { DIA_CERO: "on" }),
    "https://redes.lasolucionweb.net/api/search-integrations/instagram/callback",
  );
  assert.equal(canonicalOAuthOrigin({ DIA_CERO: "on", OAUTH_CANONICAL_ORIGIN: "https://otro.example.com/ruta" }), "https://otro.example.com");
  assert.equal(canonicalOAuthOrigin({ OAUTH_CANONICAL_ORIGIN: "http://inseguro.example.com" }), null); // solo https
  assert.equal(canonicalOAuthOrigin({ OAUTH_CANONICAL_ORIGIN: "no es url" }), null);
});

test("el retorno vuelve al host recordado solo si está permitido", () => {
  const env = { DIA_CERO: "on" };
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

test("rememberOAuthOrigin/clearOAuthOrigin escriben la cookie solo con el retorno único activo y host permitido", () => {
  const mk = () => ({ headers: new Headers(), cookies: { set: () => { throw new Error("no debe usar cookies.set con dominio activo"); } } });
  const off = mk();
  rememberOAuthOrigin(off, req("https://redes.lasolucionweb.com/x"), {});
  assert.equal(off.headers.get("set-cookie"), null);
  const on = mk();
  rememberOAuthOrigin(on, req("https://redes.lasolucionweb.com/x"), { DIA_CERO: "on" });
  const all = on.headers.getSetCookie();
  assert.match(all[0], new RegExp(`^${OAUTH_ORIGIN_COOKIE}=redes\\.lasolucionweb\\.com; .*Domain=\\.lasolucionweb\\.com`));
  const evil = mk();
  rememberOAuthOrigin(evil, req("https://evil.example.com/x"), { DIA_CERO: "on" });
  assert.equal(evil.headers.get("set-cookie"), null);
  const clr = mk();
  clearOAuthOrigin(clr, { DIA_CERO: "on" });
  assert.equal(clr.headers.getSetCookie().length, 2); // las dos variantes
});

test("acepta los dos subdominios de producto y el principal", () => {
  for (const host of [
    "seototal.lasolucionweb.com",
    "articulos.lasolucionweb.com",
    "redes.lasolucionweb.com",
    "seototal.lasolucionweb.net",
    "articulos.lasolucionweb.net",
    "redes.lasolucionweb.net",
  ]) {
    assert.equal(getAllowedOAuthOrigin(new NextRequest(`https://${host}/dashboard`)), `https://${host}`);
  }
});
