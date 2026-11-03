import assert from "node:assert/strict";
import test from "node:test";

import type { MemoryEntry } from "./angle-guard-core";
import { filterComplementIdeas } from "./opportunity-complement";

const M = (title: string, source: MemoryEntry["source"] = "publicado"): MemoryEntry => ({ title, source, ageDays: 10 });
const memory = [M("Cómo comprar una propiedad en Málaga siendo colombiano"), M("Impuestos al comprar obra nueva en Málaga", "sitio")];
const base = { validCategoryIds: new Set(["c1"]), memory, excludedTopics: ["Alquiler vacacional en la Costa del Sol", "Miami"], need: 3, currentYear: 2026 };
const idea = (text: string, categoryId = "c1") => ({ categoryId, text, rationale: "x" });

test("el modo complementario se queda con las ideas válidas, hasta las que faltan", () => {
  const { chosen, discarded } = filterComplementIdeas(
    [
      idea("Qué seguro de hogar necesita un extranjero que compra casa en Málaga"),
      idea("Cómo abrir una cuenta bancaria en España siendo no residente"),
      idea("Cómo preparar un piso para fotos antes de venderlo en Marbella"),
      idea("Guía para elegir notaría al comprar vivienda en Estepona"),
    ],
    base,
  );
  assert.equal(chosen.length, 3, "completa solo hasta lo que faltaba");
  assert.equal(discarded.tema_excluido, 0);
});

test("descarta lo repetido, lo excluido, el año viejo, la categoría falsa y lo muy corto", () => {
  const { chosen, discarded } = filterComplementIdeas(
    [
      idea("Cómo comprar una propiedad en Málaga siendo colombiano"), // duplicado exacto de lo publicado
      idea("Alquiler vacacional en la Costa del Sol: guía para propietarios"), // excluido
      idea("Invertir en propiedades en Miami desde Latinoamérica"), // excluido (una palabra)
      idea("Cómo declarar impuestos al vender un piso en España en 2019"), // año viejo
      idea("Cómo elegir abogado para comprar casa en Málaga", "otra"), // categoría falsa
      idea("Corto"), // formato
      idea("Cómo elegir una agencia inmobiliaria de confianza en Fuengirola"), // válida
    ],
    base,
  );
  assert.deepEqual(chosen.map((c) => c.text), ["Cómo elegir una agencia inmobiliaria de confianza en Fuengirola"]);
  assert.equal(discarded.tema_excluido, 2);
  assert.equal(discarded.anioViejo, 1);
  assert.equal(discarded.categoriaInvalida, 1);
  assert.equal(discarded.formato, 1);
  assert.ok(discarded.repiteLoExistente >= 1);
});

test("sin ideas válidas devuelve vacío y no lanza", () => {
  assert.deepEqual(filterComplementIdeas([], base).chosen, []);
  assert.deepEqual(filterComplementIdeas([idea("Cómo comprar una propiedad en Málaga siendo colombiano")], base).chosen, []);
});
