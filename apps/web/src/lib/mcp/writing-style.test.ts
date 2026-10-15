import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

mock.module("@auto-articulos/db", { namedExports: { prisma: {} } });
mock.module("@/lib/current-user", { namedExports: { getCurrentUserId: async () => "u1" } });

const STYLES = [
  { id: "c", name: "GENERADOR DE ARTÍCULOS CON TEMAS COMPARATIVOS" },
  { id: "e", name: "GENERADOR DE ARTÍCULOS ESTADÍSTICOS" },
  { id: "g", name: "GENERADOR DE ARTÍCULOS GUÍAS" },
  { id: "p", name: "GENERADOR DE ARTÍCULOS PROBLEMA SOLUCION" },
];

test("el estilo se entiende por nombre corto, con acentos y mayúsculas", async () => {
  const { matchWritingStyle } = await import("./writing-style");
  const idOf = (input: string) => { const m = matchWritingStyle(input, STYLES); return m.kind === "match" ? m.style.id : m.kind; };
  assert.equal(idOf("guías"), "g");
  assert.equal(idOf("Guias"), "g");
  assert.equal(idOf("comparativos"), "c");
  assert.equal(idOf("estadísticos"), "e");
  assert.equal(idOf("problema solución"), "p");
  assert.equal(idOf("GENERADOR DE ARTÍCULOS GUÍAS"), "g");
});

test("sin nombre usa el de la cuenta, STANDARD es aparte y lo dudoso no se adivina", async () => {
  const { matchWritingStyle } = await import("./writing-style");
  assert.equal(matchWritingStyle(undefined, STYLES).kind, "default");
  assert.equal(matchWritingStyle("", STYLES).kind, "default");
  assert.equal(matchWritingStyle("STANDARD", STYLES).kind, "standard");
  assert.equal(matchWritingStyle("estándar", STYLES).kind, "standard");
  assert.equal(matchWritingStyle("generador", STYLES).kind, "ambiguous");
  assert.equal(matchWritingStyle("poético", STYLES).kind, "none");
});

test("las tres herramientas de publicar aceptan estilo y lo envían como promptId a las rutas", () => {
  const src = readFileSync(join(__dirname, "tools", "opportunities.ts"), "utf8");
  assert.equal((src.match(/estilo: STYLE_PROP/g) ?? []).length, 3);
  assert.equal((src.match(/promptId: style\.promptId/g) ?? []).length >= 6, true);
  assert.match(src, /operation = \{ groupId: grupo\.id, \.\.\.\(style\.promptId/);
});
