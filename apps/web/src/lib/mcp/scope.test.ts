import { test } from "node:test";
import assert from "node:assert/strict";
import { PROMPTS } from "./prompts";
import { MCP_SCOPE_RULES, MCP_UNCONNECTED_NOTE } from "./scope";

test("el alcance dice que conectar o reparar integraciones no es trabajo del asistente", () => {
  assert.match(MCP_SCOPE_RULES, /NO te corresponde conectar, autorizar, probar ni reparar/);
  assert.match(MCP_SCOPE_RULES, /SIGUE con lo que sí puedes hacer/);
  assert.match(MCP_UNCONNECTED_NOTE, /Configuración → Conexiones/);
});

test("los flujos con nombre que pueden topar con una integración repiten el alcance", () => {
  for (const nombre of ["publicar_contenido", "diagnosticar_cuenta"]) {
    const prompt = PROMPTS.find((p) => p.name === nombre)!;
    assert.ok(prompt.build({}).includes(MCP_SCOPE_RULES), `${nombre} debe incluir el alcance`);
  }
});
