import assert from "node:assert/strict";
import test from "node:test";
import { isSafeSitemapUrl, parseSitemapXml, readSitemapTitles, titleFromArticleUrl } from "./site-titles";
import { findPublishedTitleMatch } from "./published-title";

test("el título sale del slug y coincide con el título normalizado", () => {
  const entry = titleFromArticleUrl("https://x.com/blog/aspectos-clave-para-comprar-propiedades-en-orlando.html");
  assert.equal(entry?.title, "aspectos clave para comprar propiedades en orlando");
  const match = findPublishedTitleMatch(
    "Aspectos clave para comprar propiedades en Orlando",
    [{ text: entry!.title, finalTitle: null, articleUrl: entry!.url }],
  );
  assert.ok(match);
});

test("páginas de navegación y archivos no cuentan como artículos", () => {
  assert.equal(titleFromArticleUrl("https://x.com/"), null);
  assert.equal(titleFromArticleUrl("https://x.com/contacto"), null);
  assert.equal(titleFromArticleUrl("https://x.com/img/foto-de-la-casa-grande.jpg"), null);
});

test("parseSitemapXml distingue índice y urlset", () => {
  assert.equal(parseSitemapXml("<sitemapindex><sitemap><loc>https://x.com/a.xml</loc></sitemap></sitemapindex>").isIndex, true);
  const set = parseSitemapXml("<urlset><url><loc> https://x.com/a-b-c </loc></url><url><loc><![CDATA[https://x.com/d-e-f]]></loc></url></urlset>");
  assert.deepEqual(set.locs, ["https://x.com/a-b-c", "https://x.com/d-e-f"]);
});

test("readSitemapTitles sigue el índice con una petición por archivo", async () => {
  const calls: string[] = [];
  const files: Record<string, string> = {
    "https://x.com/sitemap.xml": "<sitemapindex><sitemap><loc>https://x.com/p1.xml</loc></sitemap></sitemapindex>",
    "https://x.com/p1.xml": "<urlset><url><loc>https://x.com/seguros-de-salud-en-miami</loc></url><url><loc>https://x.com/seguros-de-salud-en-miami</loc></url></urlset>",
  };
  const titles = await readSitemapTitles("https://x.com/sitemap.xml", async (url) => {
    calls.push(url);
    return files[url];
  });
  assert.equal(titles.length, 1);
  assert.equal(calls.length, 2);
});

test("un sitemap raíz que falla lanza error", async () => {
  await assert.rejects(readSitemapTitles("https://x.com/sitemap.xml", async () => { throw new Error("HTTP 404"); }));
});

test("direcciones internas no se permiten", () => {
  assert.equal(isSafeSitemapUrl("http://localhost/sitemap.xml"), false);
  assert.equal(isSafeSitemapUrl("http://169.254.169.254/x"), false);
  assert.equal(isSafeSitemapUrl("ftp://x.com/s.xml"), false);
  assert.equal(isSafeSitemapUrl("https://example.com/sitemap.xml"), true);
});
