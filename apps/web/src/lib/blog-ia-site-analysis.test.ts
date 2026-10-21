import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeSite, analyzeSiteHtml, fetchSiteHtml, isPrivateAddress, type FetchDeps } from "./blog-ia-site-analysis";

const PAGE = `<!doctype html><html lang="es-CO"><head>
<title>Cliente Demo | Seguros en Miami</title>
<meta property="og:site_name" content="Cliente Demo SA">
<meta name="theme-color" content="#0E7490">
<meta property="og:image" content="/img/og.png">
<link rel="icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple.png">
</head><body>
<header><nav><a href="/">Inicio</a><a href="/servicios/">Servicios</a><a href="http://inseguro.com/x">Insegura</a><a href="/servicios/">Duplicada</a><a href="mailto:a@b.com">Correo</a></nav></header>
<img class="site-logo" src="/img/logo.svg" alt="Cliente Demo">
<a href="https://wa.me/573001234567?text=hola">WhatsApp</a>
<footer><a href="/privacidad">Privacidad</a><a href="/terminos">Términos &amp; condiciones</a></footer>
</body></html>`;

test("extrae nombre, color, idioma, logo, menú, pie y WhatsApp", () => {
  const r = analyzeSiteHtml(PAGE, "https://cliente.com/");
  assert.equal(r.name, "Cliente Demo SA");
  assert.equal(r.accentColor, "#0e7490");
  assert.equal(r.language, "es");
  assert.equal(r.logoUrl, "https://cliente.com/img/logo.svg"); // el logo explícito gana al og:image
  assert.deepEqual(r.nav.map((l) => l.label), ["Inicio", "Servicios"]); // sin http, sin mailto, sin duplicados
  assert.deepEqual(r.footerLinks.map((l) => l.href), ["https://cliente.com/privacidad", "https://cliente.com/terminos"]);
  assert.equal(r.footerLinks[1].label, "Términos & condiciones");
  assert.equal(r.whatsapp, "+573001234567");
});

test("sin nada reconocible devuelve sugerencias vacías y nunca lanza", () => {
  const r = analyzeSiteHtml("<html><body>hola</body></html>", "https://x.com/");
  assert.deepEqual(r, { nav: [], footerLinks: [] });
  assert.doesNotThrow(() => analyzeSiteHtml("<<<>>><a href=", "https://x.com/"));
});

test("nombre desde <title> cuando no hay og:site_name; color corto #abc", () => {
  const r = analyzeSiteHtml('<title>Mi Empresa – Inicio</title><meta name="theme-color" content="#abc">', "https://x.com/");
  assert.equal(r.name, "Mi Empresa");
  assert.equal(r.accentColor, "#aabbcc");
});

test("IP privadas y reservadas se detectan", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.16.0.1", "172.31.255.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "no-es-ip"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "172.32.0.1", "93.184.216.34", "2606:4700::1111"]) assert.equal(isPrivateAddress(ip), false, ip);
});

const okDeps = (over: Partial<FetchDeps> = {}): FetchDeps => ({
  resolveHost: async () => ["93.184.216.34"],
  fetchImpl: (async () => new Response(PAGE, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } })) as unknown as typeof fetch,
  ...over,
});

test("SSRF: rechaza http, localhost, IP literal, puerto, credenciales y dominios internos sin llamar a la red", async () => {
  let calls = 0;
  const deps = okDeps({ fetchImpl: (async () => { calls++; return new Response(""); }) as unknown as typeof fetch });
  for (const u of ["http://cliente.com", "https://localhost", "https://127.0.0.1", "https://10.0.0.1/", "https://cliente.com:8443", "https://user:pass@cliente.com", "https://intranet.local", "https://x.internal", "https://sinpunto", "no es url", "https://[::1]/"]) {
    const r = await analyzeSite(u, deps);
    assert.equal(r.ok, false, u);
  }
  assert.equal(calls, 0);
});

test("SSRF: un dominio que resuelve a IP privada (o mezcla) se rechaza antes de pedir la página", async () => {
  let calls = 0;
  const fetchImpl = (async () => { calls++; return new Response(PAGE, { headers: { "content-type": "text/html" } }); }) as unknown as typeof fetch;
  for (const ips of [["10.0.0.5"], ["93.184.216.34", "169.254.169.254"], []]) {
    const r = await analyzeSite("https://cliente.com", { resolveHost: async () => ips, fetchImpl });
    assert.equal(r.ok, false);
  }
  assert.equal(calls, 0);
  const noDns = await analyzeSite("https://cliente.com", { resolveHost: async () => { throw new Error("ENOTFOUND"); }, fetchImpl });
  assert.equal(noDns.ok, false);
});

test("SSRF: cada redirección se vuelve a validar (redirige a metadatos internos → rechazo)", async () => {
  const fetchImpl = (async (u: string) =>
    u.startsWith("https://cliente.com")
      ? new Response(null, { status: 302, headers: { location: "https://interno.cliente.com/" } })
      : new Response(PAGE, { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
  const r = await analyzeSite("https://cliente.com", { fetchImpl, resolveHost: async (h) => (h === "interno.cliente.com" ? ["169.254.169.254"] : ["93.184.216.34"]) });
  assert.equal(r.ok, false);
  const toHttp = (async () => new Response(null, { status: 301, headers: { location: "http://cliente.com/" } })) as unknown as typeof fetch;
  assert.equal((await analyzeSite("https://cliente.com", okDeps({ fetchImpl: toHttp }))).ok, false);
});

test("redirección legítima a www se sigue; más de 3 saltos se corta", async () => {
  const hop = (async (u: string) =>
    u === "https://cliente.com/"
      ? new Response(null, { status: 301, headers: { location: "https://www.cliente.com/" } })
      : new Response(PAGE, { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
  const r = await analyzeSite("https://cliente.com", okDeps({ fetchImpl: hop }));
  assert.ok(r.ok && r.finalUrl === "https://www.cliente.com/" && r.value.name === "Cliente Demo SA");
  const loop = (async () => new Response(null, { status: 302, headers: { location: "https://cliente.com/" } })) as unknown as typeof fetch;
  assert.equal((await analyzeSite("https://cliente.com", okDeps({ fetchImpl: loop }))).ok, false);
});

test("errores claros: sitio que bloquea, tiempo agotado, contenido que no es HTML", async () => {
  const blocked = (async () => new Response("no", { status: 403 })) as unknown as typeof fetch;
  const r1 = await analyzeSite("https://cliente.com", okDeps({ fetchImpl: blocked }));
  assert.ok(!r1.ok && /bloquea/.test(r1.error) && r1.manual === true);
  const down = (async () => { throw new Error("timeout"); }) as unknown as typeof fetch;
  const r2 = await analyzeSite("https://cliente.com", okDeps({ fetchImpl: down }));
  assert.ok(!r2.ok && /a mano/.test(r2.error));
  const pdf = (async () => new Response("%PDF", { headers: { "content-type": "application/pdf" } })) as unknown as typeof fetch;
  assert.equal((await analyzeSite("https://cliente.com", okDeps({ fetchImpl: pdf }))).ok, false);
});

test("una página enorme se recorta y se analiza lo recibido (no se descarga entera)", async () => {
  const big = PAGE + "x".repeat(3_000_000);
  const res = await fetchSiteHtml("https://cliente.com", okDeps({ fetchImpl: (async () => new Response(big, { headers: { "content-type": "text/html" } })) as unknown as typeof fetch }));
  assert.ok("html" in res);
  if ("html" in res) assert.ok(res.html.length <= 1_000_000 + 70_000);
});

import { createThrottle } from "./blog-ia-site-analysis";
test("el freno por persona permite N en la ventana y se libera después", () => {
  let t = 0;
  const ok = createThrottle(2, 1000, () => t);
  assert.deepEqual([ok("a"), ok("a"), ok("a")], [true, true, false]);
  assert.equal(ok("b"), true); // otra persona no se ve afectada
  t = 1500;
  assert.equal(ok("a"), true);
});
