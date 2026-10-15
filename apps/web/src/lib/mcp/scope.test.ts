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

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MCP_AUTOMATION_RULES } from "./automation";

test("la automatización solo nombra herramientas que existen y cubre reposición y fallos", () => {
  const dir = join(__dirname, "tools");
  const existentes = new Set(
    readdirSync(dir).filter((f) => f.endsWith(".ts")).flatMap((f) =>
      [...readFileSync(join(dir, f), "utf8").matchAll(/^\s+name: "([a-z_]+)"/gm)].map((m) => m[1]),
    ),
  );
  const usadas = new Set(MCP_AUTOMATION_RULES.match(/\b(?:ver|listar|crear|publicar|estado)_[a-z_]+/g) ?? []);
  assert.ok(usadas.size >= 8);
  for (const nombre of usadas) assert.ok(existentes.has(nombre), `${nombre} no existe en el catálogo`);
  assert.match(MCP_AUTOMATION_RULES, /07:00, 12:00 y 19:00/);
  assert.match(MCP_AUTOMATION_RULES, /No quedan títulos pendientes|NO quedan títulos pendientes/);
  assert.match(MCP_AUTOMATION_RULES, /crear_titulos_con_ia/);
  assert.match(MCP_AUTOMATION_RULES, /SI ALGO FALLA/);
});

test("el flujo programar_publicaciones existe y respeta los horarios pedidos", () => {
  const prompt = PROMPTS.find((p) => p.name === "programar_publicaciones")!;
  const texto = prompt.build({ horarios: "uno a las 7, otro a las 12 y otro a las 19" });
  assert.ok(texto.includes("uno a las 7, otro a las 12 y otro a las 19"));
  assert.ok(texto.includes(MCP_AUTOMATION_RULES) && texto.includes(MCP_SCOPE_RULES));
});
