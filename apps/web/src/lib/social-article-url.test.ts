import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isArticleUrlGone, isFetchableArticleUrl } from "./social-article-url";

const fakeFetch = (status: number | "throw") => async () => {
  if (status === "throw") throw new Error("timeout");
  return { status };
};

test("Redes solo descarta un artículo si su URL responde 404 o 410", async () => {
  assert.equal(await isArticleUrlGone("https://sitio.com/a", fakeFetch(404)), true);
  assert.equal(await isArticleUrlGone("https://sitio.com/a", fakeFetch(410)), true);
});

test("Redes conserva el artículo si la verificación es inconclusiva (403, 5xx, red)", async () => {
  for (const status of [200, 301, 403, 429, 500, 503, "throw"] as const) {
    assert.equal(await isArticleUrlGone("https://sitio.com/a", fakeFetch(status)), false, String(status));
  }
});

test("Redes no depende del dominio guardado en la cuenta", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/social-opportunities/generate/route.ts"), "utf8");
  assert.doesNotMatch(source, /isPublicArticleUrl/);
  assert.match(source, /isArticleUrlGone\(article\.articleUrl!\)/);
});

test("Redes no consulta direcciones internas", () => {
  assert.equal(isFetchableArticleUrl("http://localhost:3000/x"), false);
  assert.equal(isFetchableArticleUrl("http://169.254.169.254/latest"), false);
  assert.equal(isFetchableArticleUrl("ftp://sitio.com/x"), false);
  assert.equal(isFetchableArticleUrl("https://www.inesgarcia-arcaya.com/downsizing"), true);
});

test("Redes distingue sin artículos, URL caída y artículos ya usados", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/social-opportunities/generate/route.ts"), "utf8");
  assert.match(source, /Todavía no tienes artículos publicados/);
  assert.match(source, /no están disponibles en tu sitio/);
  assert.match(source, /Ya generaste propuestas para todos tus artículos/);
});
