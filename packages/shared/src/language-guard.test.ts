import assert from "node:assert/strict";
import { test } from "node:test";
import { detectLanguage, findLanguageProblems, isWrongLanguage, languageBase } from "./language-guard";

test("detecta español, inglés y portugués en frases normales", () => {
  assert.equal(detectLanguage("Cómo vender tu casa en Miami sin perder dinero con los impuestos")?.language, "es");
  assert.equal(detectLanguage("How to sell your home in Miami without losing money on the taxes")?.language, "en");
  assert.equal(detectLanguage("Como vender a sua casa em Miami sem perder dinheiro com os impostos")?.language, "pt");
});

test("marca un título en español cuando se pidió inglés (en_VI)", () => {
  assert.equal(languageBase("en_VI"), "en");
  assert.equal(isWrongLanguage("Guía completa para comprar una propiedad en la Costa del Sol", "en_VI"), true);
  assert.equal(isWrongLanguage("Complete guide to buying a property on the Costa del Sol", "en_VI"), false);
});

test("no marca textos cortos, nombres propios ni idiomas no medidos", () => {
  assert.equal(isWrongLanguage("Coral Gables Condos", "en"), false);
  assert.equal(isWrongLanguage("Marbella 2026", "es"), false);
  assert.equal(isWrongLanguage("Ghid complet pentru cumpărarea unei proprietăți", "ro_RO"), false);
  assert.equal(isWrongLanguage("", "en"), false);
});

test("atrapa un párrafo y un encabezado en español dentro de un artículo en inglés", () => {
  const html =
    "<h2>Why the market is strong</h2><p>Buyers are looking for properties that offer a good return and the demand is growing in the area.</p>" +
    "<p>Si estás pensando en invertir en la Costa del Sol, es importante que conozcas los requisitos legales y fiscales para extranjeros.</p>" +
    "<h2>Fuentes</h2><p>Official registry of the region.</p>";
  const problems = findLanguageProblems({ title: "Why invest on the Costa del Sol", html }, "en_VI");
  assert.ok(problems.some((p) => p.sample.startsWith("Si estás")));
  assert.ok(problems.some((p) => p.sample === "Fuentes"));
});

test("un artículo limpio en inglés no genera problemas", () => {
  const html =
    "<h2>Why the market is strong</h2><p>Buyers are looking for properties that offer a good return and the demand is growing in the area.</p>" +
    "<h2>Sources</h2><p>Official registry of the region and the national statistics office.</p>";
  assert.deepEqual(findLanguageProblems({ title: "Why invest on the Costa del Sol", summary: "A short guide for buyers who want to invest in the area.", html }, "en"), []);
});

test("un artículo en español no se marca cuando se pidió español", () => {
  const html = "<h2>Fuentes</h2><p>Registro oficial de la región y la oficina nacional de estadística para los compradores.</p>";
  assert.deepEqual(findLanguageProblems({ title: "Guía para invertir en la Costa del Sol", html }, "es"), []);
});
