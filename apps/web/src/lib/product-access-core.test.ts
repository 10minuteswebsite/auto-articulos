import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateProductAccess,
  type EntitlementRecord,
  type ProductKey,
} from "@auto-articulos/shared";

const NOW = new Date("2026-10-10T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY);

function evaluate(opts: {
  role?: string;
  product: ProductKey;
  entitlement?: EntitlementRecord | null;
  legacyAllowsRedes?: boolean;
}) {
  return evaluateProductAccess({
    role: opts.role ?? "user",
    product: opts.product,
    entitlement: opts.entitlement ?? null,
    legacyAllowsRedes: opts.legacyAllowsRedes ?? false,
    now: NOW,
  });
}

// --- Regla 1: los administradores siempre pasan -----------------------------
test("administrador: pasa en ambos productos aunque no tenga fila o esté inactivo", () => {
  for (const product of ["ARTICULOS", "REDES"] as const) {
    assert.equal(evaluate({ role: "admin", product }).allowed, true);
    assert.equal(
      evaluate({ role: "admin", product, entitlement: { status: "INACTIVE", graceUntil: null } }).reason,
      "ADMIN",
    );
  }
});

// --- Regla 2: sin fila = comportamiento de hoy ------------------------------
test("sin fila: Artículos sigue permitido (nadie queda bloqueado por no tener fila)", () => {
  const r = evaluate({ product: "ARTICULOS" });
  assert.equal(r.allowed, true);
  assert.equal(r.reason, "NO_RECORD_LEGACY");
  assert.equal(r.status, null);
});

test("sin fila: Redes depende de la regla que ya existía", () => {
  assert.equal(evaluate({ product: "REDES", legacyAllowsRedes: true }).allowed, true);
  assert.equal(evaluate({ product: "REDES", legacyAllowsRedes: true }).reason, "NO_RECORD_LEGACY");
  const sinRedes = evaluate({ product: "REDES", legacyAllowsRedes: false });
  assert.equal(sinRedes.allowed, false);
  assert.equal(sinRedes.reason, "NO_NETWORK_APPROVED");
});

// --- Estados con fila --------------------------------------------------------
test("ACTIVE permite", () => {
  const r = evaluate({
    product: "ARTICULOS",
    entitlement: { status: "ACTIVE", graceUntil: null },
  });
  assert.equal(r.allowed, true);
  assert.equal(r.reason, "ACTIVE");
  assert.equal(r.graceDaysLeft, null);
});

test("INACTIVE bloquea", () => {
  const r = evaluate({
    product: "ARTICULOS",
    entitlement: { status: "INACTIVE", graceUntil: null },
  });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "INACTIVE");
});

// --- Regla 3: la gracia se evalúa al leer ------------------------------------
test("GRACE vigente permite y cuenta los días que quedan", () => {
  const r = evaluate({
    product: "ARTICULOS",
    entitlement: { status: "GRACE", graceUntil: inDays(5) },
  });
  assert.equal(r.allowed, true);
  assert.equal(r.reason, "GRACE");
  assert.equal(r.graceDaysLeft, 5);
});

test("GRACE que vence en menos de un día cuenta como 1 día (nunca 0 mientras sea válida)", () => {
  const r = evaluate({
    product: "ARTICULOS",
    entitlement: { status: "GRACE", graceUntil: new Date(NOW.getTime() + 60 * 60 * 1000) },
  });
  assert.equal(r.allowed, true);
  assert.equal(r.graceDaysLeft, 1);
});

test("GRACE vencida bloquea sin necesitar ninguna tarea que la normalice", () => {
  const r = evaluate({
    product: "ARTICULOS",
    entitlement: { status: "GRACE", graceUntil: inDays(-1) },
  });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "GRACE_EXPIRED");
  assert.equal(r.graceDaysLeft, null);
});

test("GRACE que vence justo ahora ya no permite", () => {
  const r = evaluate({
    product: "ARTICULOS",
    entitlement: { status: "GRACE", graceUntil: new Date(NOW.getTime()) },
  });
  assert.equal(r.allowed, false);
});

test("GRACE sin fecha es un dato incoherente: se trata como vencida, nunca como concedida", () => {
  const r = evaluate({
    product: "ARTICULOS",
    entitlement: { status: "GRACE", graceUntil: null },
  });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "GRACE_EXPIRED");
});

// --- Regla 4: Redes suma el derecho a la regla anterior -----------------------
test("Redes con derecho ACTIVE pero sin ninguna red aprobada sigue bloqueado", () => {
  const r = evaluate({
    product: "REDES",
    entitlement: { status: "ACTIVE", graceUntil: null },
    legacyAllowsRedes: false,
  });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "NO_NETWORK_APPROVED");
});

test("Redes con derecho ACTIVE y redes aprobadas permite", () => {
  const r = evaluate({
    product: "REDES",
    entitlement: { status: "ACTIVE", graceUntil: null },
    legacyAllowsRedes: true,
  });
  assert.equal(r.allowed, true);
  assert.equal(r.reason, "ACTIVE");
});

test("Redes con derecho INACTIVE bloquea aunque tenga redes aprobadas", () => {
  const r = evaluate({
    product: "REDES",
    entitlement: { status: "INACTIVE", graceUntil: null },
    legacyAllowsRedes: true,
  });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "INACTIVE");
});

test("Redes en gracia vigente con redes aprobadas permite", () => {
  const r = evaluate({
    product: "REDES",
    entitlement: { status: "GRACE", graceUntil: inDays(3) },
    legacyAllowsRedes: true,
  });
  assert.equal(r.allowed, true);
  assert.equal(r.reason, "GRACE");
  assert.equal(r.graceDaysLeft, 3);
});

// --- Independencia entre productos --------------------------------------------
test("tener Artículos no concede Redes ni al revés (cada producto se evalúa solo)", () => {
  const art = { status: "ACTIVE" as const, graceUntil: null };
  assert.equal(evaluate({ product: "ARTICULOS", entitlement: art }).allowed, true);
  assert.equal(evaluate({ product: "REDES", entitlement: null, legacyAllowsRedes: false }).allowed, false);
});

test("el resultado conserva el estado y la fecha para que la pantalla pueda avisar", () => {
  const until = inDays(2);
  const r = evaluate({ product: "ARTICULOS", entitlement: { status: "GRACE", graceUntil: until } });
  assert.equal(r.status, "GRACE");
  assert.equal(r.graceUntil?.getTime(), until.getTime());
});
