import assert from "node:assert/strict";
import { test } from "node:test";

process.env.OPENAI_API_KEY = "test-key";
const words = (n: number) => `<p>${Array.from({ length: n }, () => "palabra").join(" ")}</p>`;

function mockOpenAi(sizes: number[]) {
  const bodies: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  const original = globalThis.fetch;
  let call = 0;
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    bodies.push(JSON.parse(init?.body ?? "{}"));
    const n = sizes[Math.min(call++, sizes.length - 1)];
    const content = JSON.stringify({ title: "Guía completa", summary: "Resumen", contentHtml: words(n) });
    return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content } }] }), { status: 200 });
  }) as typeof fetch;
  return { bodies, restore: () => (globalThis.fetch = original) };
}

test("sin política de longitud: tope histórico de 1,200 y un solo intento", async () => {
  const { generateCustomArticle } = await import("./generateCustomArticle");
  const m = mockOpenAi([300]);
  try {
    const r = await generateCustomArticle("Tema", "Escribe {title}", "es");
    assert.equal(m.bodies.length, 1);
    assert.match(m.bodies[0].messages[0].content, /no more than 1,200 words/);
    assert.ok(r.contentHtml.length > 0);
  } finally { m.restore(); }
});

test("con política: pide entre 1,000 y 1,400 y reintenta si queda corto", async () => {
  const { generateCustomArticle, countArticleWords } = await import("./generateCustomArticle");
  const m = mockOpenAi([500, 1100]);
  try {
    const r = await generateCustomArticle("Tema", "Escribe {title}", "es", null, { minWords: 1000, maxWords: 1400 });
    assert.equal(m.bodies.length, 2);
    assert.match(m.bodies[0].messages[0].content, /between 1,000 and 1,400 words/);
    assert.match(m.bodies[1].messages[1].content, /too short \(500 words\)/);
    assert.equal(countArticleWords(r.contentHtml), 1100);
  } finally { m.restore(); }
});

test("con política: si ambos intentos quedan cortos, publica el más largo en vez de fallar", async () => {
  const { generateCustomArticle, countArticleWords } = await import("./generateCustomArticle");
  const m = mockOpenAi([600, 800]);
  try {
    const r = await generateCustomArticle("Tema", "p", "es", null, { minWords: 1000, maxWords: 1400 });
    assert.equal(countArticleWords(r.contentHtml), 800);
  } finally { m.restore(); }
});

test("con política: un artículo de 950 palabras (≥90 %) se acepta sin reintento", async () => {
  const { generateCustomArticle } = await import("./generateCustomArticle");
  const m = mockOpenAi([950]);
  try {
    await generateCustomArticle("Tema", "p", "es", null, { minWords: 1000, maxWords: 1400 });
    assert.equal(m.bodies.length, 1);
  } finally { m.restore(); }
});
