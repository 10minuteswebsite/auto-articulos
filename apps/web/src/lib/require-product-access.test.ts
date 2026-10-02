import test from "node:test";
import assert from "node:assert/strict";
import { decideEnforcement } from "./product-enforcement";

test("product enforcement matrix preserves off and shadow behavior", () => {
  const denied = { allowed: false, reason: "NO_RECORD_LEGACY" as const, status: null, graceUntil: null, graceDaysLeft: null };
  const allowed = { ...denied, allowed: true, reason: "ACTIVE" as const };

  assert.deepEqual(decideEnforcement("off", denied), { block: false, wouldDeny: false });
  assert.deepEqual(decideEnforcement("shadow", denied), { block: false, wouldDeny: true });
  assert.deepEqual(decideEnforcement("enforce", denied), { block: true, wouldDeny: true });
  assert.deepEqual(decideEnforcement("enforce", allowed), { block: false, wouldDeny: false });
});

// --- requireProductAccess con dependencias simuladas ------------------------
import { mock } from "node:test";
import { requireProductAccess } from "./require-product-access";
import type { ProductAccess } from "@auto-articulos/shared";

const acceso = (allowed: boolean): ProductAccess => ({
  allowed,
  reason: allowed ? "ACTIVE" : "INACTIVE",
  status: allowed ? "ACTIVE" : "INACTIVE",
  graceUntil: null,
  graceDaysLeft: null,
});

test("off: no consulta los derechos y deja pasar (cero cambio de comportamiento)", async () => {
  let consultas = 0;
  const r = await requireProductAccess("u1", "ARTICULOS", "/api/x", {
    getMode: async () => "off",
    checkAccess: async () => { consultas++; return acceso(false); },
  });
  assert.equal(r, null);
  assert.equal(consultas, 0);
});

test("shadow: sin derecho NO bloquea pero registra un aviso con el motivo", async () => {
  const warn = mock.method(console, "warn", () => {});
  try {
    const r = await requireProductAccess("u1", "REDES", "/api/social-opportunities", {
      getMode: async () => "shadow",
      checkAccess: async () => acceso(false),
    });
    assert.equal(r, null);
    assert.equal(warn.mock.callCount(), 1);
  } finally {
    warn.mock.restore();
  }
});

test("shadow: con derecho no registra nada", async () => {
  const warn = mock.method(console, "warn", () => {});
  try {
    const r = await requireProductAccess("u1", "ARTICULOS", "/api/runs", {
      getMode: async () => "shadow",
      checkAccess: async () => acceso(true),
    });
    assert.equal(r, null);
    assert.equal(warn.mock.callCount(), 0);
  } finally {
    warn.mock.restore();
  }
});

test("enforce: sin derecho responde 403 con un mensaje claro", async () => {
  const warn = mock.method(console, "warn", () => {});
  try {
    const r = await requireProductAccess("u1", "ARTICULOS", "/api/runs", {
      getMode: async () => "enforce",
      checkAccess: async () => acceso(false),
    });
    assert.ok(r);
    assert.equal(r!.status, 403);
    const body = await r!.json();
    assert.match(body.error, /ARTICULOS/);
  } finally {
    warn.mock.restore();
  }
});

test("enforce: con derecho deja pasar", async () => {
  const r = await requireProductAccess("u1", "ARTICULOS", "/api/runs", {
    getMode: async () => "enforce",
    checkAccess: async () => acceso(true),
  });
  assert.equal(r, null);
});

test("un fallo al consultar los derechos NUNCA bloquea (se permite y se registra)", async () => {
  const error = mock.method(console, "error", () => {});
  try {
    const r = await requireProductAccess("u1", "ARTICULOS", "/api/runs", {
      getMode: async () => "enforce",
      checkAccess: async () => { throw new Error("base caída"); },
    });
    assert.equal(r, null);
    assert.equal(error.mock.callCount(), 1);
  } finally {
    error.mock.restore();
  }
});
