import test from "node:test";
import assert from "node:assert/strict";
import { isMigrationApp, isOpenComposioApp } from "./composio-access";

test("GSC y GA están abiertas a toda cuenta (incluida la desconexión)", () => {
  assert.equal(isMigrationApp("google_search_console"), true);
  assert.equal(isMigrationApp("google_analytics"), true);
});

test("Facebook, Instagram y valores raros siguen sin ser de la migración GSC/GA", () => {
  assert.equal(isMigrationApp("facebook"), false);
  assert.equal(isMigrationApp("instagram"), false);
  assert.equal(isMigrationApp(undefined), false);
  assert.equal(isMigrationApp(42), false);
});

test("Instagram, Facebook y Pinterest se conectan por Composio sin módulo opt-in; valores raros no", () => {
  for (const app of ["facebook", "instagram", "pinterest", "google_search_console", "google_analytics"]) assert.equal(isOpenComposioApp(app), true, app);
  for (const app of ["tumblr", "threads", "", undefined, 42, null]) assert.equal(isOpenComposioApp(app), false, String(app));
});
