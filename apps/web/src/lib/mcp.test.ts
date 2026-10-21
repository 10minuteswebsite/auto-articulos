import test from "node:test";
import assert from "node:assert/strict";
import { MCP_PROTOCOL_VERSION, rpcError, rpcResult } from "./mcp/protocol";
import { listPromptsPayload, PROMPTS } from "./mcp/prompts";
import { TOOLS, listToolsPayload } from "./mcp/tools";

test("MCP catalog has unique tools and every personal-token tool is visible", () => {
  const names = TOOLS.map((tool) => tool.name);
  assert.equal(new Set(names).size, names.length, "no debe haber tools duplicadas");
  assert.ok(names.includes("ver_historial_publicaciones"));
  assert.ok(names.includes("ver_preferencias_contenido"));
  for (const name of ["ver_redes_sociales", "generar_propuestas_sociales", "publicar_propuestas_sociales", "cancelar_propuesta_social", "eliminar_propuestas_sociales", "listar_estilos_escritura", "cambiar_estilo_escritura_por_defecto"]) {
    assert.ok(names.includes(name), `falta la tool ${name}`);
  }
  assert.ok(listToolsPayload(["oportunidades:leer", "oportunidades:publicar"]).length >= 16);
});

test("MCP prompts are named, unique and expose the expected workflows", () => {
  const prompts = listPromptsPayload();
  assert.equal(new Set(prompts.map((prompt) => prompt.name)).size, PROMPTS.length);
  assert.deepEqual(prompts.map((prompt) => prompt.name), [
    "empezar",
    "publicar_contenido",
    "programar_publicaciones",
    "publicar_en_redes",
    "automatizar_redes",
    "diagnosticar_cuenta",
  ]);
});

test("MCP hides Redes tools and prompts when the HUB entitlement is off", () => {
  const tools = listToolsPayload(["oportunidades:leer", "oportunidades:publicar"], false);
  const prompts = listPromptsPayload(false);
  assert.equal(tools.some((tool) => tool.name === "ver_redes_sociales"), false);
  assert.equal(tools.some((tool) => tool.name === "publicar_propuestas_sociales"), false);
  assert.equal(prompts.some((prompt) => prompt.name === "publicar_en_redes"), false);
  assert.equal(prompts.some((prompt) => prompt.name === "automatizar_redes"), false);
});

test("protocol envelope uses MCP JSON-RPC version and preserves ids", () => {
  assert.equal(MCP_PROTOCOL_VERSION, "2025-11-25");
  assert.deepEqual(rpcResult("abc", { ok: true }), { jsonrpc: "2.0", id: "abc", result: { ok: true } });
  assert.deepEqual(rpcError(3, -32601, "no existe"), { jsonrpc: "2.0", id: 3, error: { code: -32601, message: "no existe" } });
});
