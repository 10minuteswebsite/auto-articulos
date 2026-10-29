import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { declaresOgImage, inspectArticlePage, isFetchableArticleUrl } from "./social-article-url";

const page = (html: string, status = 200) => async () => ({ status, text: async () => html });
const failing = async () => { throw new Error("timeout"); };
const withImage = `<html><head><meta property='og:image' content='https://sitio.com/a.webp?t=1' ></head><body></body></html>`;
const withoutImage = `<html><head><title>x</title></head><body>texto</body></html>`;
const URL_OK = "https://sitio.com/categ/a";

test("404 y 410 descartan el artículo", async () => {
  assert.equal(await inspectArticlePage(URL_OK, page("", 404)), "gone");
  assert.equal(await inspectArticlePage(URL_OK, page("", 410)), "gone");
});

test("página completa con og:image se ofrece", async () => {
  assert.equal(await inspectArticlePage(URL_OK, page(withImage)), "ok");
});

test("página completa sin og:image se descarta como sin foto", async () => {
  assert.equal(await inspectArticlePage(URL_OK, page(withoutImage)), "no-image");
});

test("página a medias (sin cierre de cabecera) o bloqueo no prueban nada", async () => {
  assert.equal(await inspectArticlePage(URL_OK, page("<html><head><title>x")), "unknown");
  for (const status of [403, 429, 500, 503]) assert.equal(await inspectArticlePage(URL_OK, page(withImage, status)), "unknown", String(status));
  assert.equal(await inspectArticlePage(URL_OK, failing), "unknown");
});

test("declaresOgImage acepta cualquier orden de atributos y exige contenido", () => {
  assert.equal(declaresOgImage(`<meta content="https://s.com/a.jpg" property="og:image">`), true);
  assert.equal(declaresOgImage(`<meta property="og:image" content="">`), false);
});

test("Redes no depende del dominio guardado en la cuenta", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/social-opportunities/generate/route.ts"), "utf8");
  assert.doesNotMatch(source, /isPublicArticleUrl|selectedSiteDomain \?\? null/);
  assert.match(source, /inspectArticlePage\(article\.articleUrl!\)/);
});

test("Redes no consulta direcciones internas", () => {
  assert.equal(isFetchableArticleUrl("http://localhost:3000/x"), false);
  assert.equal(isFetchableArticleUrl("http://169.254.169.254/latest"), false);
  assert.equal(isFetchableArticleUrl("ftp://sitio.com/x"), false);
  assert.equal(isFetchableArticleUrl("https://www.inesgarcia-arcaya.com/downsizing"), true);
});

test("Redes distingue sin artículos, URL caída, sin foto y ya usados", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/social-opportunities/generate/route.ts"), "utf8");
  assert.match(source, /Todavía no tienes artículos publicados/);
  assert.match(source, /ya no están disponibles en tu sitio/);
  assert.match(source, /foto de portada \(og:image\) en su página/);
  assert.match(source, /Ya generaste propuestas para todos tus artículos/);
});
