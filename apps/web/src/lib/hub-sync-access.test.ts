import test, { mock } from "node:test";
import assert from "node:assert/strict";

let userReads = 0;
const prisma = {
  user: {
    findUnique: async () => {
      userReads += 1;
      return { hubUserId: "hub-1", trialUnlocked: true };
    },
    update: async () => ({}),
  },
  $transaction: async (fn: (tx: unknown) => Promise<void>) =>
    fn({
      productEntitlement: {
        findUnique: async () => ({ status: "ACTIVE", source: "HUB", graceUntil: null }),
        upsert: async () => ({}),
      },
      productEntitlementEvent: { create: async () => ({}) },
    }),
};

mock.module("@auto-articulos/db", { namedExports: { prisma } });
process.env.AUTO_ARTICULOS_HUB_CLIENT_ID = "id";
process.env.AUTO_ARTICULOS_HUB_CLIENT_SECRET = "secret";

const realFetch = globalThis.fetch;
let hubCalls = 0;
function stubHub(handler: () => Promise<Response>) {
  globalThis.fetch = (async () => {
    hubCalls += 1;
    return handler();
  }) as typeof fetch;
}
const ok = () => new Response(JSON.stringify({ allowed: true }), { status: 200 });

test("peticiones simultáneas comparten una sola consulta al Hub y la siguiente no consulta nada", async () => {
  const { refreshHubAccessForUser } = await import("./hub-sync");
  hubCalls = 0;
  userReads = 0;
  stubHub(async () => ok());
  await Promise.all(Array.from({ length: 12 }, () => refreshHubAccessForUser("u-shared")));
  assert.equal(hubCalls, 1);
  assert.equal(userReads, 1);
  await refreshHubAccessForUser("u-shared");
  assert.equal(hubCalls, 1);
  assert.equal(userReads, 1);
  globalThis.fetch = realFetch;
});

test("un fallo del Hub se recuerda: no cada petición espera el fallo otra vez", async () => {
  const { refreshHubAccessForUser } = await import("./hub-sync");
  hubCalls = 0;
  stubHub(async () => new Response("{}", { status: 503 }));
  await assert.rejects(refreshHubAccessForUser("u-fail"));
  await refreshHubAccessForUser("u-fail");
  await refreshHubAccessForUser("u-fail");
  assert.equal(hubCalls, 1);
  globalThis.fetch = realFetch;
});
