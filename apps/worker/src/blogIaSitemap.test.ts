import assert from "node:assert/strict";
import { test } from "node:test";
import { propertyCoversSitemap, resolveSitemapForAccount } from "./blogIaSitemap";

const active = { status: "active", hostname: "blog.cliente.com" };

test("una propiedad de dominio cubre el subdominio del blog; la de otro dominio no", () => {
  assert.equal(propertyCoversSitemap("sc-domain:cliente.com", "https://blog.cliente.com/sitemap.xml"), true);
  assert.equal(propertyCoversSitemap("sc-domain:cliente.com", "https://cliente.com/sitemap.xml"), true);
  assert.equal(propertyCoversSitemap("sc-domain:www.cliente.com", "https://blog.cliente.com/sitemap.xml"), true);
  assert.equal(propertyCoversSitemap("sc-domain:cliente.com", "https://blog.otro.com/sitemap.xml"), false);
  assert.equal(propertyCoversSitemap("sc-domain:cliente.com", "https://malocliente.com/sitemap.xml"), false); // sufijo engañoso
});

test("una propiedad de prefijo de URL solo cubre su mismo origen", () => {
  assert.equal(propertyCoversSitemap("https://cliente.com/", "https://blog.cliente.com/sitemap.xml"), false);
  assert.equal(propertyCoversSitemap("https://blog.cliente.com/", "https://blog.cliente.com/sitemap.xml"), true);
  assert.equal(propertyCoversSitemap("https://blog.cliente.com", "https://blog.cliente.com/sitemap.xml"), true);
  assert.equal(propertyCoversSitemap("no-es-url", "https://blog.cliente.com/sitemap.xml"), false);
});

test("cuenta que no usa BLOG: no se toca el comportamiento actual", () => {
  for (const m of ["BROWSER", "MCP", null, undefined]) {
    assert.deepEqual(resolveSitemapForAccount({ publishMethod: m, blog: active, siteUrl: "sc-domain:cliente.com" }), { kind: "keep" });
  }
});

test("cuenta BLOG con blog activo y propiedad de dominio: se envía el sitemap del blog", () => {
  assert.deepEqual(resolveSitemapForAccount({ publishMethod: "BLOG", blog: active, siteUrl: "sc-domain:cliente.com" }), { kind: "use", sitemapUrl: "https://blog.cliente.com/sitemap.xml" });
});

test("cuenta BLOG con propiedad que no cubre el blog: error claro, no se envía", () => {
  const r = resolveSitemapForAccount({ publishMethod: "BLOG", blog: active, siteUrl: "https://cliente.com/" });
  assert.equal(r.kind, "error");
  assert.match((r as { message: string }).message, /blog\.cliente\.com/);
});

test("cuenta BLOG con blog desactivado, suspendido o sin dominio: no se envía nada", () => {
  for (const blog of [null, { status: "deactivated", hostname: "blog.cliente.com" }, { status: "suspended", hostname: "blog.cliente.com" }, { status: "active", hostname: null }, { status: "pending_dns", hostname: "blog.cliente.com" }]) {
    assert.equal(resolveSitemapForAccount({ publishMethod: "BLOG", blog, siteUrl: "sc-domain:cliente.com" }).kind, "error");
  }
});
