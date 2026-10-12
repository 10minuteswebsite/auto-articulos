import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBusinessProfileCandidateWhere } from "./businessProfilePublish";

// Regresión (2026-10-12): el carril tomaba cualquier artículo viejo sin publicación de una
// cuenta conectada por PostPeer y envió ~160 a su ficha de Google.
test("Google Business solo toma lo aprobado (pending) o, con conexión propia antigua, lo automático", () => {
  const where = buildBusinessProfileCandidateWhere(undefined, undefined, true);
  const [approved, legacy] = where.OR as Array<Record<string, unknown>>;
  assert.deepEqual(approved, {
    businessProfilePost: { status: "pending" },
    socialOpportunities: { some: { platform: "google-business", status: "queued" } },
  });
  assert.equal(legacy.businessProfilePost, null);
  // Sin la conexión propia con locationName, la rama «sin publicación» no puede coincidir.
  assert.deepEqual(legacy.run, { user: { businessProfileIntegration: { locationName: { not: null } } } });
});

test("la conexión PostPeer solo habilita al usuario si está activa y el interruptor está encendido", () => {
  const on = buildBusinessProfileCandidateWhere(undefined, undefined, true);
  const off = buildBusinessProfileCandidateWhere(undefined, undefined, false);
  assert.equal(((on.run.user.OR as unknown[]).length), 2);
  assert.equal(((off.run.user.OR as unknown[]).length), 1);
});

test("el filtro por usuario y por artículo se respeta", () => {
  const where = buildBusinessProfileCandidateWhere("u1", "https://x.com/a", false);
  assert.equal(where.run.userId, "u1");
  assert.ok((where.articleUrl as { in?: string[] }).in?.includes("https://x.com/a"));
});
