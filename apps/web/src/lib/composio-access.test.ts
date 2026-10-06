import test from "node:test";
import assert from "node:assert/strict";
import { isMigrationApp } from "./composio-access";
import { userMayConnectApp } from "./composio-connections";

test("GSC y GA están abiertas a toda cuenta (incluida la desconexión)", () => {
  assert.equal(isMigrationApp("google_search_console"), true);
  assert.equal(isMigrationApp("google_analytics"), true);
});

test("Facebook, Instagram, Pinterest y valores raros no son apps de migración", () => {
  assert.equal(isMigrationApp("facebook"), false);
  assert.equal(isMigrationApp("instagram"), false);
  assert.equal(isMigrationApp("pinterest"), false);
  assert.equal(isMigrationApp(undefined), false);
  assert.equal(isMigrationApp(42), false);
});

test("el acceso al producto Redes permite configurar redes antes de aprobarlas individualmente", () => {
  assert.equal(userMayConnectApp({ id: "u1", canConfigureRedes: true }, "facebook"), true);
  assert.equal(userMayConnectApp({ id: "u1", canConfigureRedes: true }, "instagram"), true);
  assert.equal(userMayConnectApp({ id: "u1", canConfigureRedes: true }, "pinterest"), true);
  assert.equal(userMayConnectApp({ id: "u1", canConfigureRedes: false }, "facebook"), false);
  assert.equal(userMayConnectApp({ id: "u1", canConfigureRedes: false }, "instagram"), false);
  assert.equal(userMayConnectApp({ id: "u1", canConfigureRedes: false }, "pinterest"), false);
});
