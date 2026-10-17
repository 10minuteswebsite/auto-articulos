import test from "node:test";
import assert from "node:assert/strict";
import { bingExplicitRedirect, bingOAuthConfig } from "./bing-oauth";

test("las credenciales guardadas en Administración mandan sobre las variables", () => {
  const antes = { id: process.env.BING_WEBMASTER_CLIENT_ID, secret: process.env.BING_WEBMASTER_CLIENT_SECRET };
  process.env.BING_WEBMASTER_CLIENT_ID = "id-entorno";
  process.env.BING_WEBMASTER_CLIENT_SECRET = "secreto-entorno";
  try {
    assert.equal(bingOAuthConfig().clientId, "id-entorno");
    const guardadas = bingOAuthConfig({ clientId: "id-admin", clientSecret: "secreto-admin" });
    assert.equal(guardadas.clientId, "id-admin");
    assert.equal(guardadas.clientSecret, "secreto-admin");
    assert.equal(bingOAuthConfig(null).clientId, "id-entorno");
  } finally {
    if (antes.id === undefined) delete process.env.BING_WEBMASTER_CLIENT_ID; else process.env.BING_WEBMASTER_CLIENT_ID = antes.id;
    if (antes.secret === undefined) delete process.env.BING_WEBMASTER_CLIENT_SECRET; else process.env.BING_WEBMASTER_CLIENT_SECRET = antes.secret;
  }
});

test("sin credenciales guardadas ni variables, falla con el mensaje habitual", () => {
  const antes = { id: process.env.BING_WEBMASTER_CLIENT_ID, secret: process.env.BING_WEBMASTER_CLIENT_SECRET };
  delete process.env.BING_WEBMASTER_CLIENT_ID;
  delete process.env.BING_WEBMASTER_CLIENT_SECRET;
  try {
    assert.throws(() => bingOAuthConfig(null), /no está configurado/);
  } finally {
    if (antes.id !== undefined) process.env.BING_WEBMASTER_CLIENT_ID = antes.id;
    if (antes.secret !== undefined) process.env.BING_WEBMASTER_CLIENT_SECRET = antes.secret;
  }
});

test("la dirección de retorno guardada en Administración manda sobre la variable", () => {
  const env = { BING_WEBMASTER_REDIRECT_URI: "https://viejo.example.com/cb" };
  assert.equal(bingExplicitRedirect(env)?.host, "viejo.example.com");
  const guardada = "https://articulos.lasolucionweb.net/api/search-integrations/bing/callback";
  assert.equal(bingExplicitRedirect(env, guardada)?.toString(), guardada);
  assert.equal(bingExplicitRedirect({}, null), null);
  assert.equal(bingExplicitRedirect({}, "http://inseguro.example.com/cb"), null);
});
