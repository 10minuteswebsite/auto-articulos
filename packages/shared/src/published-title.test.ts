import assert from "node:assert/strict";
import test from "node:test";
import { findPublishedTitleMatch, normalizeTitleKey } from "./published-title";

const published = [
  {
    text: "Aspectos clave para comprar propiedades en Orlando desde Medellín",
    finalTitle: "Aspectos clave para comprar propiedades en Orlando desde Medellín",
    articleUrl: "https://www.antonioaguirre.com/categ/aspectos-clave",
  },
  {
    text: "Guía para inversores de Santiago",
    finalTitle: "Guía para inversores de Santiago en el mercado inmobiliario",
    articleUrl: "https://www.antonioaguirre.com/categ/guia-santiago",
  },
  { text: "Sin enlace todavía", finalTitle: null, articleUrl: null },
];

test("normaliza tildes, mayúsculas y puntuación", () => {
  assert.equal(
    normalizeTitleKey("  ¡Aspectos CLAVE: Medellín!  "),
    "aspectos clave medellin",
  );
});

test("detecta el mismo tema aunque cambien tildes, mayúsculas o signos", () => {
  const match = findPublishedTitleMatch(
    "aspectos clave para comprar propiedades en orlando desde medellin.",
    published,
  );
  assert.equal(match?.articleUrl, "https://www.antonioaguirre.com/categ/aspectos-clave");
});

test("también compara contra el título final reformulado", () => {
  const match = findPublishedTitleMatch(
    "Guía para inversores de Santiago en el mercado inmobiliario",
    published,
  );
  assert.equal(match?.articleUrl, "https://www.antonioaguirre.com/categ/guia-santiago");
});

test("no marca como duplicado un tema parecido pero distinto (sin similitud difusa)", () => {
  assert.equal(
    findPublishedTitleMatch("Aspectos clave para comprar propiedades en Miami desde Medellín", published),
    null,
  );
});

test("ignora registros sin enlace publicado y textos vacíos", () => {
  assert.equal(findPublishedTitleMatch("Sin enlace todavía", published), null);
  assert.equal(findPublishedTitleMatch("   ", published), null);
});
