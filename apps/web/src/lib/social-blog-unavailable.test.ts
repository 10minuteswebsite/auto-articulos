import { test } from "node:test";
import assert from "node:assert/strict";
import { belongsToUnavailableBlog, type BlogAvailability } from "./social-article-url";

const active: BlogAvailability = { hostname: "blog.cliente.com", status: "active", dnsVerified: true, tlsReady: true };
const url = "https://blog.cliente.com/guia-completa/";

test("blog activo con dominio y HTTPS listos: sus artículos SÍ se ofrecen", () => {
  assert.equal(belongsToUnavailableBlog(url, active), false);
});

test("blog desactivado, suspendido o sin dominio/HTTPS listo: sus artículos NO se ofrecen", () => {
  for (const blog of [{ ...active, status: "deactivated" }, { ...active, status: "suspended" }, { ...active, dnsVerified: false }, { ...active, tlsReady: false }, { ...active, status: "pending_dns" }])
    assert.equal(belongsToUnavailableBlog(url, blog), true, JSON.stringify(blog));
});

test("solo cuenta la dirección del propio blog: artículos de 10minutesWebsite u otros sitios no cambian", () => {
  const off = { ...active, status: "deactivated" };
  assert.equal(belongsToUnavailableBlog("https://miweb.10minuteswebsite.net/articulo/", off), false);
  assert.equal(belongsToUnavailableBlog("https://otro-blog.cliente.com/x/", off), false);
  assert.equal(belongsToUnavailableBlog("https://BLOG.cliente.com/x/", off), true, "el nombre de host no distingue mayúsculas");
});

test("sin blog, sin dirección o con dirección inválida: no se excluye nada", () => {
  assert.equal(belongsToUnavailableBlog(url, null), false);
  assert.equal(belongsToUnavailableBlog(url, { ...active, hostname: null, status: "deactivated" }), false);
  assert.equal(belongsToUnavailableBlog(null, { ...active, status: "deactivated" }), false);
  assert.equal(belongsToUnavailableBlog("no es una dirección", { ...active, status: "deactivated" }), false);
});
