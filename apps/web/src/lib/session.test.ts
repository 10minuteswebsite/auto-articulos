import assert from "node:assert/strict";
import test from "node:test";
import { createSessionToken, verifySessionContext, verifySessionToken } from "./session";

process.env.SESSION_SECRET = "session-source-test-secret";

test("marca las sesiones creadas desde el Hub sin cambiar la identidad", async () => {
  const token = await createSessionToken("user-hub", "hub");

  assert.deepEqual(await verifySessionContext(token), { userId: "user-hub", source: "hub" });
  assert.equal(await verifySessionToken(token), "user-hub");
});

test("las sesiones legacy nuevas y las cookies antiguas no reciben el menú del Hub", async () => {
  const token = await createSessionToken("user-legacy");
  assert.deepEqual(await verifySessionContext(token), { userId: "user-legacy", source: "legacy" });

  const legacyPayload = "old-user.4102444800000";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(legacyPayload)));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  assert.deepEqual(await verifySessionContext(`${legacyPayload}.${encoded}`), {
    userId: "old-user",
    source: "legacy",
  });
});
