import test from "node:test";
import assert from "node:assert/strict";
import {
  checkLoginModeTransition,
  createLoginLimiter,
  decidePasswordLogin,
  parseLoginMode,
} from "./login-policy";

test("parseLoginMode: solo «hub» activa el modo; todo lo demás es legacy", () => {
  assert.equal(parseLoginMode("hub"), "hub");
  for (const v of ["legacy", "", null, undefined, "HUB ", 3]) assert.equal(parseLoginMode(v), "legacy");
});

test("legacy deja pasar a todos (comportamiento de hoy)", () => {
  assert.deepEqual(decidePasswordLogin({ mode: "legacy", role: "user" }), { allow: true });
  assert.deepEqual(decidePasswordLogin({ mode: "legacy", role: "admin" }), { allow: true });
  assert.deepEqual(decidePasswordLogin({ mode: "legacy", role: null }), { allow: true });
});

test("hub solo deja pasar a administradores", () => {
  assert.deepEqual(decidePasswordLogin({ mode: "hub", role: "admin" }), { allow: true });
  assert.deepEqual(decidePasswordLogin({ mode: "hub", role: "user" }), { allow: false, reason: "USE_HUB" });
  assert.deepEqual(decidePasswordLogin({ mode: "hub", role: undefined }), { allow: false, reason: "USE_HUB" });
});

test("pasar a hub exige escribir SOLO HUB; volver a legacy es libre", () => {
  assert.equal(checkLoginModeTransition({ current: "legacy", next: "hub" }).ok, false);
  assert.equal(checkLoginModeTransition({ current: "legacy", next: "hub", confirmation: "si" }).ok, false);
  assert.equal(checkLoginModeTransition({ current: "legacy", next: "hub", confirmation: " solo hub " }).ok, true);
  assert.equal(checkLoginModeTransition({ current: "hub", next: "legacy" }).ok, true);
  assert.equal(checkLoginModeTransition({ current: "hub", next: "hub" }).ok, true);
});

test("el limitador bloquea tras 5 fallos, vence con el tiempo y se reinicia al acertar", () => {
  let t = 0;
  const limiter = createLoginLimiter({ max: 5, windowMs: 1000, now: () => t });
  for (let i = 0; i < 4; i++) limiter.recordFailure("k");
  assert.equal(limiter.isBlocked("k"), false);
  limiter.recordFailure("k");
  assert.equal(limiter.isBlocked("k"), true);
  assert.equal(limiter.isBlocked("otra"), false); // claves independientes
  t = 1500; // pasó la ventana
  assert.equal(limiter.isBlocked("k"), false);
  limiter.recordFailure("k");
  limiter.reset("k");
  assert.equal(limiter.isBlocked("k"), false);
});
