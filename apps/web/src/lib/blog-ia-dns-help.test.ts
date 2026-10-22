import { test } from "node:test";
import assert from "node:assert/strict";
import { COMMON_MISTAKES, GENERIC_GUIDE, PROVIDERS, detectProvider, guideById, renderSteps, splitHostname } from "./blog-ia-dns-help";

test("detecta los proveedores comunes por sus servidores de nombres", () => {
  const cases: [string[], string][] = [
    [["ns49.domaincontrol.com.", "ns50.domaincontrol.com."], "godaddy"],
    [["dns1.registrar-servers.com", "dns2.registrar-servers.com"], "namecheap"],
    [["ada.ns.cloudflare.com", "bob.ns.cloudflare.com"], "cloudflare"],
    [["ns-cloud-a1.googledomains.com"], "squarespace"],
    [["ns1.dns-parking.com", "ns2.dns-parking.com"], "hostinger"],
    [["ns1070.ui-dns.com", "ns1067.ui-dns.de"], "ionos"],
    [["ns6.wixdns.net", "ns7.wixdns.net"], "wix"],
    [["ns1.bluehost.com"], "bluehost"],
    [["ns1.siteground.net"], "siteground"],
    [["ns1.worldnic.com"], "networksolutions"],
    [["curitiba.ns.porkbun.com"], "porkbun"],
    [["ns-123.awsdns-45.com", "ns-678.awsdns-12.org"], "route53"],
    [["dns1.p01.nsone.net.ovh.net"], "ovh"],
    [["ns1.vercel-dns.com"], "vercel"],
  ];
  for (const [ns, id] of cases) assert.equal(detectProvider(ns)?.id, id, ns.join(","));
});

test("un proveedor desconocido o sin servidores devuelve null (guía genérica)", () => {
  assert.equal(detectProvider(["ns1.proveedor-raro.example"]), null);
  assert.equal(detectProvider([]), null);
  assert.equal(guideById("no-existe").id, "generic");
  assert.equal(guideById("godaddy").name, "GoDaddy");
});

test("separa el subdominio y el dominio registrable, también con sufijos de dos niveles", () => {
  assert.deepEqual(splitHostname("blog.cliente.com"), { registrable: "cliente.com", label: "blog", full: "blog.cliente.com" });
  assert.deepEqual(splitHostname("Noticias.Empresa.Com.Co."), { registrable: "empresa.com.co", label: "noticias", full: "noticias.empresa.com.co" });
  assert.deepEqual(splitHostname("blog.tienda.co.uk"), { registrable: "tienda.co.uk", label: "blog", full: "blog.tienda.co.uk" });
  assert.equal(splitHostname("a.b.cliente.com").label, "a.b");
});

test("los pasos rellenan los marcadores y no dejan ninguno sin sustituir", () => {
  const v = { label: "blog", full: "blog.cliente.com", target: "edge.totalinfoai.com" };
  for (const g of [...PROVIDERS, GENERIC_GUIDE]) {
    const steps = renderSteps(g, v);
    assert.ok(steps.length >= 3, g.id);
    for (const s of steps) assert.doesNotMatch(s, /\{(label|full|target)\}/, `${g.id}: ${s}`);
    assert.ok(steps.some((s) => s.includes("edge.totalinfoai.com")), `${g.id} debe mencionar el destino`);
  }
  assert.match(renderSteps(guideById("godaddy"), v).join(" "), /Nombre: «blog»/);
  assert.match(renderSteps(guideById("hostgator"), v).join(" "), /blog\.cliente\.com\./); // cPanel pide el nombre completo
});

test("cada proveedor tiene id único y patrones de servidores en minúsculas", () => {
  const ids = PROVIDERS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of PROVIDERS) for (const pat of p.nsPatterns) assert.equal(pat, pat.toLowerCase());
  assert.ok(PROVIDERS.length >= 12);
  assert.ok(COMMON_MISTAKES.length >= 3);
});
