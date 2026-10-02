import { test } from "node:test";
import assert from "node:assert/strict";
import { decideEnforcement, parseEnforcementMode } from "./product-enforcement";
import type { ProductAccess } from "@auto-articulos/shared";

const allowed: ProductAccess = { allowed: true, reason: "ACTIVE", status: "ACTIVE", graceUntil: null, graceDaysLeft: null };
const denied: ProductAccess = { allowed: false, reason: "INACTIVE", status: "INACTIVE", graceUntil: null, graceDaysLeft: null };

test("el modo por defecto, o cualquier valor raro, es «off» (un valor mal guardado nunca bloquea)", () => {
  assert.equal(parseEnforcementMode(undefined), "off");
  assert.equal(parseEnforcementMode(null), "off");
  assert.equal(parseEnforcementMode(""), "off");
  assert.equal(parseEnforcementMode("ENFORCE"), "off");
  assert.equal(parseEnforcementMode("true"), "off");
  assert.equal(parseEnforcementMode(42), "off");
});

test("solo «shadow» y «enforce» exactos se reconocen", () => {
  assert.equal(parseEnforcementMode("shadow"), "shadow");
  assert.equal(parseEnforcementMode("enforce"), "enforce");
  assert.equal(parseEnforcementMode("off"), "off");
});

test("off: nunca bloquea y nunca registra, aunque no tenga derecho", () => {
  assert.deepEqual(decideEnforcement("off", denied), { block: false, wouldDeny: false });
  assert.deepEqual(decideEnforcement("off", allowed), { block: false, wouldDeny: false });
});

test("shadow: no bloquea pero registra lo que habría bloqueado", () => {
  assert.deepEqual(decideEnforcement("shadow", denied), { block: false, wouldDeny: true });
  assert.deepEqual(decideEnforcement("shadow", allowed), { block: false, wouldDeny: false });
});

test("enforce: bloquea solo a quien no tiene derecho", () => {
  assert.deepEqual(decideEnforcement("enforce", denied), { block: true, wouldDeny: true });
  assert.deepEqual(decideEnforcement("enforce", allowed), { block: false, wouldDeny: false });
});

// --- Caché del modo --------------------------------------------------------
import { createModeCache } from "./product-enforcement";

test("caché del modo: dentro del tiempo de vida lee la base una sola vez", async () => {
  let reads = 0;
  let clock = 1000;
  const cache = createModeCache(async () => { reads++; return "shadow"; }, 30_000, () => clock);
  assert.equal(await cache.get(), "shadow");
  clock += 29_000;
  assert.equal(await cache.get(), "shadow");
  assert.equal(reads, 1);
});

test("caché del modo: vencido el tiempo de vida vuelve a leer y ve el cambio", async () => {
  let current: "off" | "enforce" = "off";
  let clock = 0;
  const cache = createModeCache(async () => current, 30_000, () => clock);
  assert.equal(await cache.get(), "off");
  current = "enforce";
  clock += 29_999;
  assert.equal(await cache.get(), "off"); // aún dentro de los 30 s
  clock += 2;
  assert.equal(await cache.get(), "enforce");
});

test("caché del modo: guardar un cambio lo refleja de inmediato en esta instancia", async () => {
  const cache = createModeCache(async () => "off", 30_000, () => 0);
  assert.equal(await cache.get(), "off");
  cache.set("shadow");
  assert.equal(await cache.get(), "shadow");
});

test("caché del modo: un error de lectura da «off» y NO se guarda (se reintenta)", async () => {
  let fail = true;
  let reads = 0;
  const cache = createModeCache(async () => { reads++; if (fail) throw new Error("base caída"); return "enforce"; }, 30_000, () => 0);
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal(await cache.get(), "off");
    fail = false;
    assert.equal(await cache.get(), "enforce"); // reintentó: el fallo no se cacheó
    assert.equal(reads, 2);
  } finally {
    console.error = originalError;
  }
});

test("caché del modo: reset obliga a leer de nuevo", async () => {
  let reads = 0;
  const cache = createModeCache(async () => { reads++; return "off"; }, 30_000, () => 0);
  await cache.get();
  cache.reset();
  await cache.get();
  assert.equal(reads, 2);
});
