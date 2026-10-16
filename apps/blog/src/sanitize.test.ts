import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeHtml } from "./sanitize";

test("elimina scripts, iframes y manejadores de eventos", () => {
  const out = sanitizeHtml(`<p onclick="x()">Hola</p><script>alert(1)</script><iframe src="https://evil"></iframe><img src="https://a/b.jpg" onerror="x()">`);
  assert.equal(out.includes("script"), false);
  assert.equal(out.includes("iframe"), false);
  assert.equal(out.includes("onclick"), false);
  assert.equal(out.includes("onerror"), false);
  assert.match(out, /<p>Hola<\/p>/);
});

test("bloquea javascript: y data: en enlaces e imágenes", () => {
  const out = sanitizeHtml(`<a href="javascript:alert(1)">x</a><a href=" JaVa\tScRiPt:alert(1)">y</a><img src="data:text/html;base64,AAAA">`);
  assert.equal(/javascript/i.test(out), false);
  assert.equal(out.includes("data:"), false);
});

test("conserva enlaces seguros y añade rel", () => {
  const out = sanitizeHtml(`<a href="https://ejemplo.com/a?b=1&c=2" title="t">ok</a><a href="/interno/">i</a><a href="#ancla">a</a>`);
  assert.match(out, /href="https:\/\/ejemplo\.com\/a\?b=1&amp;c=2"/);
  assert.match(out, /rel="noopener noreferrer"/);
  assert.match(out, /href="\/interno\/"/);
  assert.match(out, /href="#ancla"/);
});

test("descarta etiquetas desconocidas pero conserva su texto", () => {
  assert.equal(sanitizeHtml(`<custom-tag>texto</custom-tag><font color="red">f</font>`), "textof");
});

test("las imágenes salen con lazy-loading y sin atributos extra", () => {
  const out = sanitizeHtml(`<img src="https://a/b.jpg" alt="foto" style="x" class="y" width="10" height="abc">`);
  assert.equal(out, `<img src="https://a/b.jpg" alt="foto" width="10" loading="lazy">`);
});
