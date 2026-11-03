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
    assert.match(m.bodies[1].messages[1].content, /EXPAND THE DRAFT BELOW\. It has only 500 words/);
    assert.match(m.bodies[1].messages[1].content, /DRAFT contentHtml:\n<p>palabra/, "el reintento incluye el borrador anterior");
    assert.equal(countArticleWords(r.contentHtml), 1100);
  } finally { m.restore(); }
});

test("con política: si todos los intentos quedan cortos, publica el más largo en vez de fallar", async () => {
  const { generateCustomArticle, countArticleWords } = await import("./generateCustomArticle");
  const m = mockOpenAi([600, 800, 700]);
  try {
    const r = await generateCustomArticle("Tema", "p", "es", null, { minWords: 1000, maxWords: 1400 });
    assert.equal(m.bodies.length, 3);
    assert.equal(countArticleWords(r.contentHtml), 800);
  } finally { m.restore(); }
});

test("con política: 950 palabras NO alcanzan el mínimo de 1,000 y se reintenta (sin tolerancia)", async () => {
  const { generateCustomArticle, countArticleWords } = await import("./generateCustomArticle");
  const m = mockOpenAi([950, 1010]);
  try {
    const r = await generateCustomArticle("Tema", "p", "es", null, { minWords: 1000, maxWords: 1400 });
    assert.equal(m.bodies.length, 2);
    assert.equal(countArticleWords(r.contentHtml), 1010);
  } finally { m.restore(); }
});

test("con política: 1,000 exactas se aceptan sin reintento", async () => {
  const { generateCustomArticle } = await import("./generateCustomArticle");
  const m = mockOpenAi([1000]);
  try {
    await generateCustomArticle("Tema", "p", "es", null, { minWords: 1000, maxWords: 1400 });
    assert.equal(m.bodies.length, 1);
  } finally { m.restore(); }
});

test("con política: el tercer intento expande y logra el mínimo (caso real: 678 → 820 → 1,050)", async () => {
  const { generateCustomArticle, countArticleWords } = await import("./generateCustomArticle");
  const m = mockOpenAi([678, 820, 1050]);
  try {
    const r = await generateCustomArticle("Tema", "p", "es", null, { minWords: 1000, maxWords: 1400 });
    assert.equal(m.bodies.length, 3);
    assert.match(m.bodies[2].messages[1].content, /It has only 820 words/, "expande el borrador más largo, no el primero");
    assert.equal(countArticleWords(r.contentHtml), 1050);
  } finally { m.restore(); }
});

test("sin política el reintento sigue siendo el de siempre (2 intentos, sin expandir)", async () => {
  const { generateCustomArticle } = await import("./generateCustomArticle");
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: "no es json" } }] }), { status: 200 }); }) as typeof fetch;
  try {
    await assert.rejects(() => generateCustomArticle("Tema", "p", "es"));
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

function mockLanguage(responses: Array<{ title: string; html: string }>) {
  const bodies: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  const original = globalThis.fetch;
  let call = 0;
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    bodies.push(JSON.parse(init?.body ?? "{}"));
    const r = responses[Math.min(call++, responses.length - 1)];
    const content = JSON.stringify({ title: r.title, summary: "A short guide for buyers who want to invest in the area.", contentHtml: r.html });
    return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content } }] }), { status: 200 });
  }) as typeof fetch;
  return { bodies, restore: () => (globalThis.fetch = original) };
}

const SPANISH = { title: "Guía para invertir en la Costa del Sol", html: "<h2>Por qué invertir en la zona</h2><p>Los compradores buscan propiedades que ofrezcan una buena rentabilidad y la demanda crece en toda la zona.</p><h2>Fuentes</h2>" };
const ENGLISH = { title: "Guide to investing on the Costa del Sol", html: "<h2>Why invest in the area</h2><p>Buyers are looking for properties that offer a good return and the demand is growing in the area.</p><h2>Sources</h2>" };

test("idioma: un borrador en español con idioma inglés se reescribe y NO se publica el malo", async () => {
  const { generateCustomArticle } = await import("./generateCustomArticle");
  const m = mockLanguage([SPANISH, ENGLISH]);
  try {
    const r = await generateCustomArticle("Invertir en la Costa del Sol", "Escribe un artículo con sección Fuentes", "en_VI");
    assert.equal(m.bodies.length, 2);
    assert.match(m.bodies[1].messages[1].content, /LANGUAGE CORRECTION/);
    assert.equal(r.title, ENGLISH.title);
  } finally { m.restore(); }
});

test("idioma: si todos los intentos salen en el idioma equivocado, falla en vez de publicar", async () => {
  const { generateCustomArticle } = await import("./generateCustomArticle");
  const m = mockLanguage([SPANISH]);
  try {
    await assert.rejects(() => generateCustomArticle("Tema", "p", "en_VI"), /No se publicó/);
    assert.equal(m.bodies.length, 4);
  } finally { m.restore(); }
});

test("idioma: el prompt obliga a traducir los encabezados del prompt del usuario", async () => {
  const { generateCustomArticle } = await import("./generateCustomArticle");
  const m = mockLanguage([ENGLISH]);
  try {
    await generateCustomArticle("Tema", "Incluye una sección Fuentes y una Conclusión", "en_VI");
    assert.match(m.bodies[0].messages[1].content, /OUTPUT LANGUAGE OVERRIDE/);
    assert.doesNotMatch(m.bodies[0].messages[0].content, /"Fuentes"/);
  } finally { m.restore(); }
});
