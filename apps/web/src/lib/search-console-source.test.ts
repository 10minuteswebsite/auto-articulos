import test from "node:test";
import assert from "node:assert/strict";
import { describeNoEvidence, shouldUseComposioFallback } from "./search-console-source";

test("solo Composio (fuente NONE) pasa a usar Composio", () => {
  assert.equal(shouldUseComposioFallback({ source: "NONE", composioUsable: true, ownHasError: false }), true);
});

test("propia sana sigue ganando aunque exista Composio", () => {
  assert.equal(shouldUseComposioFallback({ source: "OWN", composioUsable: true, ownHasError: false }), false);
});

test("propia rota cede ante Composio utilizable", () => {
  assert.equal(shouldUseComposioFallback({ source: "OWN", composioUsable: true, ownHasError: true }), true);
});

test("sin Composio utilizable nunca hay relevo", () => {
  assert.equal(shouldUseComposioFallback({ source: "NONE", composioUsable: false, ownHasError: false }), false);
  assert.equal(shouldUseComposioFallback({ source: "OWN", composioUsable: false, ownHasError: true }), false);
});

test("la fuente COMPOSIO no se toca", () => {
  assert.equal(shouldUseComposioFallback({ source: "COMPOSIO", composioUsable: true, ownHasError: true }), false);
});

const base = { hasSearchConsole: false, gscError: null, gaConnected: false, bingConnected: false };

test("mensaje: nada conectado", () => {
  assert.match(describeNoEvidence(base), /Todavía no hay Google Search Console/);
});

test("mensaje: Search Console conectado sin datos", () => {
  assert.match(describeNoEvidence({ ...base, hasSearchConsole: true }), /no devolvió datos de los últimos 45 días/);
});

test("mensaje: error de Search Console conserva el motivo real", () => {
  assert.match(describeNoEvidence({ ...base, hasSearchConsole: true, gscError: "sin permiso" }), /sin permiso/);
});

test("mensaje: solo Analytics o Bing sin datos incluye su detalle", () => {
  const text = describeNoEvidence({ ...base, bingConnected: true, bingError: "token vencido" });
  assert.match(text, /token vencido/);
});
