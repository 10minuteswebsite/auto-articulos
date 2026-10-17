import test from "node:test";
import assert from "node:assert/strict";
import { applyCookie, clearCookieHeaders, cookieEnvForHost, serializeCookie, setCookieHeaders, sharedCookieDomain } from "./shared-cookies";

test("el dominio compartido solo vale si es válido; si no, todo queda como hoy", () => {
  assert.equal(sharedCookieDomain({}), undefined);
  assert.equal(sharedCookieDomain({ SHARED_COOKIE_DOMAIN: "" }), undefined);
  assert.equal(sharedCookieDomain({ SHARED_COOKIE_DOMAIN: "lasolucionweb.com" }), undefined); // sin punto inicial
  assert.equal(sharedCookieDomain({ SHARED_COOKIE_DOMAIN: ".com" }), undefined); // un TLD entero
  assert.equal(sharedCookieDomain({ SHARED_COOKIE_DOMAIN: ".evil.com; Path=/" }), undefined); // inyección
  assert.equal(sharedCookieDomain({ SHARED_COOKIE_DOMAIN: " .LaSolucionWeb.com " }), ".lasolucionweb.com");
});

test("sin dominio: una sola cabecera, idéntica a la de siempre (ligada al host)", () => {
  const h = setCookieHeaders("s", "abc", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 }, {});
  assert.deepEqual(h, ["s=abc; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax"]);
});

test("con dominio: fija con Domain y borra la variante ligada al host", () => {
  const h = setCookieHeaders("s", "abc", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 }, { SHARED_COOKIE_DOMAIN: ".lasolucionweb.com" });
  assert.equal(h.length, 2);
  assert.match(h[0], /Domain=\.lasolucionweb\.com/);
  assert.match(h[0], /^s=abc;/);
  assert.doesNotMatch(h[1], /Domain=/);
  assert.match(h[1], /^s=; .*Max-Age=0/);
});

test("applyCookie escribe la cookie compartida en una respuesta real", () => {
  const response = { headers: new Headers(), cookies: { set: () => { throw new Error("no debe usar cookies.set con dominio activo"); } } };
  applyCookie(response, "s", "abc", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 }, { SHARED_COOKIE_DOMAIN: ".lasolucionweb.com" });
  const headers = response.headers.getSetCookie();
  assert.equal(headers.length, 2);
  assert.match(headers[0], /^s=abc; .*Domain=\.lasolucionweb\.com/);
  assert.match(headers[1], /^s=; .*Max-Age=0/);
});

test("cerrar sesión borra las dos variantes", () => {
  assert.equal(clearCookieHeaders("s", { path: "/" }, {}).length, 1);
  const h = clearCookieHeaders("s", { path: "/" }, { SHARED_COOKIE_DOMAIN: ".lasolucionweb.com" });
  assert.equal(h.length, 2);
  assert.ok(h.every((x) => /Max-Age=0/.test(x)));
  assert.ok(h.some((x) => /Domain=\.lasolucionweb\.com/.test(x)));
  assert.ok(h.some((x) => !/Domain=/.test(x)));
});

test("el valor se codifica (no puede inyectar atributos)", () => {
  assert.equal(serializeCookie("s", "a; Domain=evil.com", {}), "s=a%3B%20Domain%3Devil.com; Path=/");
});

test("solo el dominio explícito activa la cookie compartida; sin él, ligada al host", () => {
  assert.equal(sharedCookieDomain({}), undefined);
  assert.equal(sharedCookieDomain({ SHARED_COOKIE_DOMAIN: ".otro.com" }), ".otro.com");
  assert.equal(sharedCookieDomain({ SHARED_COOKIE_DOMAIN: "invalido" }), undefined);
});

test("el callback del HUB usa el dominio de la familia que lo está sirviendo", () => {
  assert.equal(cookieEnvForHost("redes.lasolucionweb.net", {}).SHARED_COOKIE_DOMAIN, ".lasolucionweb.net");
  assert.equal(cookieEnvForHost("redes.lasolucionweb.com", {}).SHARED_COOKIE_DOMAIN, ".lasolucionweb.com");
  assert.equal(cookieEnvForHost("redes.lasolucionweb.net:443", {}).SHARED_COOKIE_DOMAIN, ".lasolucionweb.net");
});
