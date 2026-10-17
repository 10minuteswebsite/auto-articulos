import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  canonicalOAuthOrigin,
  clearOAuthOrigin,
  getAllowedOAuthOrigin,
  getOAuthRedirectUri,
  isAllowedOAuthHost,
  oauthCallbackUri,
  oauthReturnBase,
  rememberOAuthOrigin,
} from "./oauth-redirect";

const ARTICULOS = "articulos.lasolucionweb.net";
const REDES = "redes.lasolucionweb.net";
const req = (url: string, cookie?: string) => ({ url, headers: new Headers(cookie ? { cookie } : {}) });

test("acepta solo articulos y redes .net", () => {
  for (const host of [ARTICULOS, REDES]) {
    assert.equal(getAllowedOAuthOrigin(new NextRequest(`https://${host}/dashboard`)), `https://${host}`);
  }
  assert.equal(getAllowedOAuthOrigin(new NextRequest("https://evil.example/dashboard")), null);
});

test("seototal y el .com ya no son hosts de callback", () => {
  for (const host of [
    "seototal.lasolucionweb.com",
    "seototal.lasolucionweb.net",
    "articulos.lasolucionweb.com",
    "redes.lasolucionweb.com",
    "seototal.articulos.lasolucionweb.com",
  ]) {
    assert.equal(getAllowedOAuthOrigin(new NextRequest(`https://${host}/dashboard`)), null, host);
    assert.equal(isAllowedOAuthHost(host), false, host);
  }
});

test("la variable SEO_TOTAL_OAUTH_ALLOWED_HOSTS no puede ampliar la lista", () => {
  process.env.SEO_TOTAL_OAUTH_ALLOWED_HOSTS = "seototal.lasolucionweb.com,articulos.lasolucionweb.com,*.lasolucionweb.net";
  assert.equal(getAllowedOAuthOrigin(new NextRequest("https://seototal.lasolucionweb.com/x")), null);
  assert.equal(getAllowedOAuthOrigin(new NextRequest("https://foo.lasolucionweb.net/x")), null);
  delete process.env.SEO_TOTAL_OAUTH_ALLOWED_HOSTS;
});

test("rechaza puertos, sufijos y prefijos maliciosos y normaliza mayúsculas", () => {
  for (const host of [`${REDES}:8443`, `${REDES}.evil.com`, `evil${REDES}`, `${ARTICULOS}.evil.com`]) {
    assert.equal(getAllowedOAuthOrigin(new NextRequest(`https://${host}/dashboard`)), null, host);
  }
  assert.equal(getAllowedOAuthOrigin(new NextRequest("https://ARTICULOS.LASOLUCIONWEB.NET/dashboard")), `https://${ARTICULOS}`);
  assert.equal(getAllowedOAuthOrigin(new NextRequest("https:///dashboard")), null);
});

test("el redirect_uri sale del host .net de la petición; fuera de la lista usa el configurado", () => {
  const path = "/api/search-integrations/google/callback";
  assert.equal(getOAuthRedirectUri(new NextRequest(`https://${REDES}/x`), path, "https://x/y"), `https://${REDES}${path}`);
  assert.equal(getOAuthRedirectUri(new NextRequest("https://preview.example/x"), path, `https://${ARTICULOS}${path}`), `https://${ARTICULOS}${path}`);
});

test("sin origen canónico: el callback no manda a seototal y el retorno es el host de la petición", () => {
  assert.equal(canonicalOAuthOrigin({}), null);
  for (const host of [ARTICULOS, REDES]) {
    assert.equal(
      oauthCallbackUri(req(`https://${host}/api/x`), "/api/search-integrations/linkedin/callback", {}),
      `https://${host}/api/search-integrations/linkedin/callback`,
    );
  }
  const r = req(`https://${REDES}/api/x`, `oauth_return_origin=${ARTICULOS}`);
  assert.equal(oauthReturnBase(r, {}), r.url);
});

test("OAUTH_CANONICAL_ORIGIN solo vale si es https y de un host permitido", () => {
  assert.equal(canonicalOAuthOrigin({ OAUTH_CANONICAL_ORIGIN: `https://${ARTICULOS}/ruta` }), `https://${ARTICULOS}`);
  for (const bad of ["https://seototal.lasolucionweb.com", "https://redes.lasolucionweb.com", "http://" + REDES, "no es url"]) {
    assert.equal(canonicalOAuthOrigin({ OAUTH_CANONICAL_ORIGIN: bad }), null, bad);
  }
});

test("con origen canónico explícito el retorno vuelve al host recordado solo si está permitido", () => {
  const env = { OAUTH_CANONICAL_ORIGIN: `https://${ARTICULOS}` };
  const ok = req(`https://${ARTICULOS}/cb`, `a=1; oauth_return_origin=${REDES}; b=2`);
  assert.equal(oauthReturnBase(ok, env), `https://${REDES}`);
  for (const evil of ["evil.example.com", `${REDES}.evil.com`, "seototal.lasolucionweb.com", "redes.lasolucionweb.com", ""]) {
    const r = req(`https://${ARTICULOS}/cb`, `oauth_return_origin=${evil}`);
    assert.equal(oauthReturnBase(r, env), r.url, evil);
  }
});

test("rememberOAuthOrigin/clearOAuthOrigin solo escriben cookie con origen canónico explícito", () => {
  const mk = () => {
    const sets: string[] = [];
    return { sets, headers: new Headers(), cookies: { set: (name: string) => { sets.push(name); } } };
  };
  const off = mk();
  rememberOAuthOrigin(off, req(`https://${REDES}/x`), {});
  clearOAuthOrigin(off, {});
  assert.equal(off.headers.get("set-cookie"), null);
  assert.equal(off.sets.length, 0);
  const on = mk();
  rememberOAuthOrigin(on, req(`https://${REDES}/x`), { OAUTH_CANONICAL_ORIGIN: `https://${ARTICULOS}` });
  assert.deepEqual(on.sets, ["oauth_return_origin"]);
  const evil = mk();
  rememberOAuthOrigin(evil, req("https://evil.example.com/x"), { OAUTH_CANONICAL_ORIGIN: `https://${ARTICULOS}` });
  assert.equal(evil.sets.length, 0);
});

import { isNetProductHost, netCallbackUri } from "./oauth-redirect";

test("el retorno .net usa el host de articulos o redes .net y nunca seototal ni .com", () => {
  const path = "/api/search-integrations/linkedin/callback";
  assert.equal(netCallbackUri({ url: "https://redes.lasolucionweb.net/x" }, path), `https://redes.lasolucionweb.net${path}`);
  assert.equal(netCallbackUri({ url: "https://articulos.lasolucionweb.net/x" }, path), `https://articulos.lasolucionweb.net${path}`);
  for (const url of ["https://seototal.lasolucionweb.com/x", "https://articulos.lasolucionweb.com/x", "https://evil.example/x"]) {
    assert.equal(netCallbackUri({ url }, path), `https://articulos.lasolucionweb.net${path}`, url);
  }
  assert.equal(isNetProductHost("REDES.lasolucionweb.net"), true);
  assert.equal(isNetProductHost("redes.lasolucionweb.net.evil.com"), false);
});
