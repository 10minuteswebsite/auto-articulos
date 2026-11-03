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
