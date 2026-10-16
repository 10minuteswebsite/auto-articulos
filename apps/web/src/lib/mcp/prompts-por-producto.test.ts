import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MCP_PROMPT_ARTICULOS, MCP_PROMPT_REDES } from "./prompts-por-producto";

const dir = join(__dirname, "tools");
const existentes = new Set(
  readdirSync(dir).filter((f) => f.endsWith(".ts")).flatMap((f) =>
    [...readFileSync(join(dir, f), "utf8").matchAll(/^\s+name: "([a-z_]+)"/gm)].map((m) => m[1]),
  ),
);
const herramientas = (texto: string) => new Set(texto.match(/\b(?:ver|listar|crear|publicar|estado|generar|cancelar|eliminar|cambiar)_[a-z_]+/g) ?? []);

test("cada prompt solo nombra herramientas que existen en el catálogo", () => {
  for (const [nombre, texto] of [["articulos", MCP_PROMPT_ARTICULOS], ["redes", MCP_PROMPT_REDES]] as const) {
    const usadas = herramientas(texto);
    assert.ok(usadas.size >= 5, `${nombre} nombra herramientas`);
    for (const h of usadas) assert.ok(existentes.has(h), `${nombre}: ${h} no existe`);
  }
});

test("las órdenes están separadas: Artículos no trae Redes y Redes no trae Artículos", () => {
  assert.doesNotMatch(MCP_PROMPT_ARTICULOS, /ver_redes_sociales|generar_propuestas_sociales|publicar_propuestas_sociales|listar_propuestas_sociales/);
  assert.doesNotMatch(MCP_PROMPT_REDES, /crear_oportunidades|listar_oportunidades|publicar_oportunidades_seleccionadas|crear_titulos_con_ia|estado_de_publicaciones|listar_estilos_escritura/);
  assert.match(MCP_PROMPT_ARTICULOS, /07:00, 12:00 y 19:00/);
  assert.match(MCP_PROMPT_REDES, /las 10:00/);
  assert.match(MCP_PROMPT_ARTICULOS, /cambiar_estilo_escritura_por_defecto/);
  assert.match(MCP_PROMPT_REDES, /reintentar=true/);
});

test("ambos mantienen alcance, comprobante y sin pedir credenciales", () => {
  for (const texto of [MCP_PROMPT_ARTICULOS, MCP_PROMPT_REDES]) {
    assert.match(texto, /TU ALCANCE/);
    assert.match(texto, /confirmar=false/);
    assert.match(texto, /Nunca me pidas contraseñas ni tokens/);
    assert.doesNotMatch(texto, /Servidor MCP:/);
  }
});

import { MCP_AUTOMATION_RULES, MCP_SOCIAL_AUTOMATION_RULES } from "./automation";

test("la automatización se propone y el usuario la acepta una vez; después corre sin pedir aprobación por publicación", () => {
  for (const texto of [MCP_PROMPT_ARTICULOS, MCP_PROMPT_REDES, MCP_AUTOMATION_RULES, MCP_SOCIAL_AUTOMATION_RULES]) {
    assert.match(texto, /resúmeme la propuesta/);
    assert.match(texto, /espera mi sí/);
    assert.match(texto, /Solo con mi sí, crea/);
    assert.match(texto, /sin pedirme aprobación en cada publicación; solo te pediré aprobar cada publicación si yo te lo pido/);
  }
});
