import assert from "node:assert/strict";
import test from "node:test";
import { createHubSessionContextToken, verifyHubSessionContextToken } from "./session";

process.env.SESSION_SECRET = "hub-navigation-session-test-secret";

test("el contexto Hub identifica al usuario correcto y no acepta modificaciones", async () => {
  const token = await createHubSessionContextToken("user-hub");

  assert.equal(await verifyHubSessionContextToken(token), "user-hub");
  assert.equal(await verifyHubSessionContextToken(`${token}x`), null);
  assert.equal(await verifyHubSessionContextToken("hubctx.user-hub.invalid"), null);
});

test("un contexto Hub no puede habilitar el shell para otra sesión", async () => {
  const token = await createHubSessionContextToken("user-hub");

  assert.notEqual(await verifyHubSessionContextToken(token), "user-legacy");
  assert.equal(await verifyHubSessionContextToken(null), null);
});
