import assert from "node:assert/strict";
import test from "node:test";

import { titleUsesDeclaredGeoCombo } from "./opportunity-analysis";

const clientes = ["Mexico", "España", "Colombia", "Peru", "La Florida-USA"];
const negocio = ["La Costa del Sol-España"];

test("la ubicación del negocio declarada con guion se reconoce por el nombre del lugar", () => {
  assert.equal(titleUsesDeclaredGeoCombo("Cómo alquilar un apartamento turístico en La Costa del Sol si vivo en Perú", clientes, negocio), true);
  assert.equal(titleUsesDeclaredGeoCombo("Consejos para invertir en La Costa del Sol si vivo en La Florida", clientes, negocio), true);
});

test("sigue exigiendo una ubicación de cliente Y una de negocio", () => {
  assert.equal(titleUsesDeclaredGeoCombo("Cómo alquilar un apartamento turístico en La Costa del Sol", clientes, negocio), false, "falta el cliente");
  assert.equal(titleUsesDeclaredGeoCombo("Cómo alquilar un apartamento si vivo en Perú", clientes, negocio), false, "falta el negocio");
  assert.equal(titleUsesDeclaredGeoCombo("Cómo comprar en Orlando si vivo en Chile", clientes, negocio), false);
});

test("el nombre completo declarado también vale", () => {
  assert.equal(titleUsesDeclaredGeoCombo("Vivir en La Costa del Sol-España si vengo de Colombia", clientes, negocio), true);
});

import { classifyExcludedTopics } from "./opportunity-analysis";

const EXCLUIDOS = ["Alquiler vacacional en la Costa del Sol", "Golden visa en España", "Miami", "Punta Cana", "Cartagena"];

test("temas excluidos: palabras sueltas de un tema largo ya no excluyen todo el título", () => {
  // Antes se rechazaban por contener «costa», «sol» o «España».
  assert.equal(classifyExcludedTopics("Cómo invertir en propiedades en La Costa del Sol si vivo en Perú", EXCLUIDOS).verdict, "doubt");
  assert.equal(classifyExcludedTopics("Requisitos para comprar una propiedad en España siendo colombiano", EXCLUIDOS).verdict, "pass");
  assert.equal(classifyExcludedTopics("Qué documentos necesita un extranjero para comprar casa en Málaga", EXCLUIDOS).verdict, "pass");
});

test("temas excluidos: lo excluido de verdad se sigue rechazando", () => {
  assert.equal(classifyExcludedTopics("Alquiler vacacional en la Costa del Sol: guía para propietarios", EXCLUIDOS).verdict, "reject");
  assert.equal(classifyExcludedTopics("Cómo comprar una propiedad en Miami si vivo en México", EXCLUIDOS).verdict, "reject", "tema de una palabra");
  assert.equal(classifyExcludedTopics("Todo sobre la Golden visa en España para colombianos", EXCLUIDOS).verdict, "reject");
});

test("temas excluidos: lo dudoso va a la IA y un solo tema compartido no basta", () => {
  assert.equal(classifyExcludedTopics("Cómo alquilar un apartamento turístico en La Costa del Sol", EXCLUIDOS).verdict, "doubt", "mismo tema con otras palabras: lo decide la IA");
  assert.equal(classifyExcludedTopics("Mejores zonas de España para vivir", ["Golden visa en España"]).verdict, "pass");
  assert.equal(classifyExcludedTopics("Cualquier título", []).verdict, "pass");
});
