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

test("la ubicación del cartel «Tu ubicación» decide el servidor, solo mientras no esté confirmado", () => {
  const route = read("src/app/api/me/route.ts");
  assert.match(route, /if \(current && !current\.platformDomainConfirmedAt\)/);
  assert.match(route, /data\.platformDomain = platformDomainForCountry\(country\)/);
  assert.match(route, /data\.platformDomainConfirmedAt = new Date\(\)/);
});

test("la ubicación es un paso obligatorio solo para cuentas nuevas sin región confirmada", () => {
  const route = read("src/app/api/configuration-status/route.ts");
  assert.match(route, /required: !user\?\.platformDomainConfirmedAt/);
});

test("no hay pantalla bloqueante nueva en el panel", () => {
  assert.doesNotMatch(read("src/app/dashboard/layout.tsx"), /RegionQuestion|needsRegion/);
});

test("la migración confirma las cuentas existentes y corrige solo las nuevas sin prompt", () => {
  const sql = read("../../packages/db/prisma/migrations/20261029190000_platform_domain_confirmed_default_prompt/migration.sql");
  assert.match(sql, /ADD COLUMN "platformDomainConfirmedAt"/);
  assert.match(sql, /UPDATE "User" SET "platformDomainConfirmedAt" = NOW\(\)/);
  assert.match(sql, /"defaultPromptId" IS NULL\s+AND "createdAt" >= TIMESTAMP '2026-10-19 19:00:00'/);
});

test("el asistente inicial pide la ubicación primero a las cuentas nuevas del Hub", () => {
  const wizard = read("src/components/OnboardingWizard.tsx");
  assert.match(wizard, /setLocationRequired\(data\.locationRequired === true\)/);
  assert.match(wizard, /if \(locationRequired\) return <LocationStep initial=\{savedLocation\} \/>/);
  const me = read("src/app/api/me/route.ts");
  assert.match(me, /locationRequired: user\.role !== "admin" && !user\.platformDomainConfirmedAt/);
  const step = read("src/components/LocationStep.tsx");
  assert.match(step, /method: "PATCH"/);
  assert.match(step, /country, city: city\.trim\(\), timeZone/);
});
