import test from "node:test";
import assert from "node:assert/strict";
import { buildSafeCaption, buildBlueskyLinkFacets } from "@auto-articulos/shared";
import { formatBloggerSummary } from "./bloggerContent";

const articleUrl = "https://www.example.com/articulos/una-url-larga";

test("captions de redes no-Instagram conservan el enlace completo al recortar", () => {
  for (const maxChars of [280, 300, 500, 3000]) {
    const caption = buildSafeCaption("Texto generado ".repeat(1000), articleUrl, {
      maxChars,
      ...(maxChars === 280 ? { linkCostOverride: 23 } : {}),
    });
    assert.ok(caption.includes(articleUrl), `falta el enlace en límite ${maxChars}`);
    assert.equal(caption.slice(caption.indexOf(articleUrl), caption.indexOf(articleUrl) + articleUrl.length), articleUrl);
  }
});

test("Blogger convierte el enlace en un anchor HTML clicable", () => {
  const html = formatBloggerSummary("Lee más: [ENLACE]", articleUrl);
  assert.match(html, new RegExp(`<a href="${articleUrl.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}">`));
});

test("el enlace queda separado del texto por un espacio para que sea clicable (recortado o no)", () => {
  for (const maxChars of [280, 300, 500]) {
    const caption = buildSafeCaption("Texto generado largo ".repeat(100) + "aquí: [ENLACE]", articleUrl, {
      maxChars,
      ...(maxChars === 280 ? { linkCostOverride: 23 } : {}),
    });
    const index = caption.indexOf(articleUrl);
    assert.ok(index > 0);
    assert.match(caption[index - 1], /\s/, `el enlace va pegado al texto en límite ${maxChars}`);
    assert.ok(caption.endsWith(articleUrl));
  }
});

test("un [ENLACE] pegado a la palabra anterior se separa con un espacio", () => {
  const caption = buildSafeCaption("Léelo aquí:[ENLACE]", articleUrl, { maxChars: 500 });
  assert.equal(caption, `Léelo aquí: ${articleUrl}`);
});

test("el recorte no parte la última palabra y no excede el límite", () => {
  const caption = buildSafeCaption("palabrotas ".repeat(80) + "[ENLACE]", articleUrl, { maxChars: 300 });
  assert.ok(caption.length <= 300);
  assert.match(caption, /palabrotas\.\.\. https:/);
});

test("Bluesky declara el enlace como facet con posición en bytes UTF-8", () => {
  const text = `Más info en español: ${articleUrl}`;
  const [facet] = buildBlueskyLinkFacets(text);
  const bytes = new TextEncoder().encode(text);
  assert.equal(new TextDecoder().decode(bytes.slice(facet.index.byteStart, facet.index.byteEnd)), articleUrl);
  assert.equal(facet.features[0].uri, articleUrl);
  assert.equal(buildBlueskyLinkFacets("sin enlaces aquí").length, 0);
});
