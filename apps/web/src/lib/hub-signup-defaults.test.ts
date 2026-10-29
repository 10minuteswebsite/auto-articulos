import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("las cuatro altas de usuario guardan el prompt problema-solución por defecto", () => {
  for (const path of [
    "src/app/auth/hub/route.ts",
    "src/app/api/integrations/hub/access-sync/route.ts",
    "src/app/api/auth/trial-signup/route.ts",
    "src/app/api/admin/users/route.ts",
  ]) {
    const source = read(path);
    assert.match(source, /\.\.\.\(await newUserDefaultPromptData\(\)\)/, path);
  }
  assert.match(read("src/lib/default-prompt.ts"), /GENERADOR DE ARTÍCULOS PROBLEMA SOLUCION/);
});

test("registro de prueba y alta de administrador ya traen la región confirmada; el Hub no", () => {
  assert.match(read("src/app/api/auth/trial-signup/route.ts"), /platformDomainConfirmedAt: new Date\(\)/);
  assert.match(read("src/app/api/admin/users/route.ts"), /platformDomainConfirmedAt: new Date\(\)/);
  assert.doesNotMatch(read("src/app/auth/hub/route.ts"), /platformDomainConfirmedAt/);
  assert.doesNotMatch(read("src/app/api/integrations/hub/access-sync/route.ts"), /platformDomainConfirmedAt/);
});

test("el panel pregunta la región solo a cuentas sin confirmar, nunca a administradores ni «Acceder como»", () => {
  const layout = read("src/app/dashboard/layout.tsx");
  assert.match(layout, /const needsRegion = !actingAdmin && user\.role !== "admin" && !user\.platformDomainConfirmedAt/);
  assert.match(layout, /needsRegion \? \(\s*<RegionQuestionScreen \/>/);
});

test("responder la región nunca cambia una cuenta ya confirmada y mapea Europa a .site", () => {
  const route = read("src/app/api/me/region/route.ts");
  assert.match(route, /where: \{ id: userId, platformDomainConfirmedAt: null \}/);
  assert.match(route, /region === "europe" \? "site" : "net"/);
});

test("la migración confirma las cuentas existentes y corrige solo las nuevas sin prompt", () => {
  const sql = read("../../packages/db/prisma/migrations/20261029190000_platform_domain_confirmed_default_prompt/migration.sql");
  assert.match(sql, /ADD COLUMN "platformDomainConfirmedAt"/);
  assert.match(sql, /UPDATE "User" SET "platformDomainConfirmedAt" = NOW\(\)/);
  assert.match(sql, /"defaultPromptId" IS NULL\s+AND "createdAt" >= TIMESTAMP '2026-10-19 19:00:00'/);
});
