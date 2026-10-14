import { test, mock } from "node:test";
import assert from "node:assert/strict";

process.env.SESSION_SECRET ??= "test-secret";

type Row = Record<string, unknown>;
const refreshRows = new Map<string, Row>();
const accessRows = new Map<string, Row>();
let refreshSeq = 0;

// Simula la restricción única de `id` en OAuthRefreshToken: es la que hacía
// fallar toda renovación en producción (P2002 → 400).
const prisma = {
  oAuthRefreshToken: {
    findUnique: async ({ where }: { where: { tokenHash: string } }) =>
      [...refreshRows.values()].find((r) => r.tokenHash === where.tokenHash) ?? null,
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = [...refreshRows.values()].filter((r) => r.id === where.id && (where.revokedAt === null ? r.revokedAt == null : true));
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    },
    create: ({ data }: { data: Row }) => ({ run: () => {
      const id = (data.id as string | undefined) ?? `r${++refreshSeq}`;
      if (refreshRows.has(id)) throw new Error("P2002 Unique constraint failed on id");
      refreshRows.set(id, { revokedAt: null, ...data, id });
    } }),
  },
  oAuthAccessToken: {
    create: ({ data }: { data: Row }) => ({ run: () => { accessRows.set(data.tokenHash as string, data); } }),
  },
  $transaction: async (ops: Array<{ run: () => void }>) => { ops.forEach((o) => o.run()); },
};

mock.module("@auto-articulos/db", { namedExports: { prisma } });
let mod: typeof import("./server");

test("renovar con un refresh token válido emite un par nuevo y retira el viejo", async () => {
  mod = await import("./server");
  const { refreshTokens, hashSecret } = mod;
  refreshRows.set("old", { id: "old", tokenHash: hashSecret("viejo"), userId: "u1", clientId: "chatgpt-auto-articulos-v1", scopes: "oportunidades:leer", resource: "https://x/api/mcp", expiresAt: new Date(Date.now() + 1e6), revokedAt: null, createdAt: new Date() });
  const result = await refreshTokens("viejo", "chatgpt-auto-articulos-v1");
  assert.ok(result.access_token && result.refresh_token);
  assert.notEqual(result.refresh_token, "viejo");
  assert.ok(refreshRows.get("old")!.revokedAt, "el refresh viejo queda revocado");
  assert.equal(refreshRows.size, 2, "el refresh nuevo tiene su propio id");
});

test("reusar el refresh token ya canjeado sigue siendo inválido", async () => {
  const { refreshTokens } = mod;
  await assert.rejects(() => refreshTokens("viejo", "chatgpt-auto-articulos-v1"), /invalid_grant|ya utilizado|inválido/i);
});
