import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePageGate, graceNotices, type ProductsInfo } from "./product-page-gate";

const denied = { allowed: false, reason: "INACTIVE" };
const ok = { allowed: true, reason: "ACTIVE" };
const products: ProductsInfo = { articulos: denied, redes: ok };

test("con el interruptor apagado o en sombra NUNCA bloquea, aunque no tenga derecho", () => {
  for (const mode of ["off", "shadow", undefined, null, "algo-raro"]) {
    assert.deepEqual(evaluatePageGate({ mode, scope: "ARTICULOS", products }), { block: false });
  }
});

test("en enforce bloquea la pantalla propia de un producto sin derecho", () => {
  const r = evaluatePageGate({ mode: "enforce", scope: "ARTICULOS", products });
  assert.deepEqual(r, { block: true, product: "ARTICULOS", reason: "INACTIVE" });
});

test("en enforce NO bloquea el producto que sí tiene", () => {
  assert.deepEqual(evaluatePageGate({ mode: "enforce", scope: "REDES", products }), { block: false });
});

test("«sin redes aprobadas» NO bloquea: esa pantalla ya tiene su propio aviso (ModuleGuard)", () => {
  const sinRedes: ProductsInfo = { articulos: ok, redes: { allowed: false, reason: "NO_NETWORK_APPROVED" } };
  assert.deepEqual(evaluatePageGate({ mode: "enforce", scope: "REDES", products: sinRedes }), { block: false });
});

test("la gracia vencida SÍ bloquea", () => {
  const vencida: ProductsInfo = { articulos: { allowed: false, reason: "GRACE_EXPIRED" } };
  assert.deepEqual(evaluatePageGate({ mode: "enforce", scope: "ARTICULOS", products: vencida }), { block: true, product: "ARTICULOS", reason: "GRACE_EXPIRED" });
});

test("las pantallas compartidas y las de administración nunca se bloquean", () => {
  for (const scope of ["COMPARTIDO", "ADMIN"] as const) {
    assert.deepEqual(evaluatePageGate({ mode: "enforce", scope, products }), { block: false });
  }
});

test("ante datos ausentes no bloquea", () => {
  assert.deepEqual(evaluatePageGate({ mode: "enforce", scope: "ARTICULOS", products: null }), { block: false });
  assert.deepEqual(evaluatePageGate({ mode: "enforce", scope: "ARTICULOS", products: {} }), { block: false });
  assert.deepEqual(evaluatePageGate({ mode: "enforce", scope: "ARTICULOS", products: { articulos: null } }), { block: false });
});

test("aviso de gracia: solo en shadow o enforce, solo si vigente y dentro de los 5 días", () => {
  const grace = (days: number) => ({ allowed: true, reason: "GRACE", graceDaysLeft: days, graceUntil: "2026-10-07T00:00:00.000Z" });
  assert.deepEqual(graceNotices({ mode: "off", products: { articulos: grace(3) } }), []);
  assert.equal(graceNotices({ mode: "shadow", products: { articulos: grace(3) } }).length, 1);
  assert.equal(graceNotices({ mode: "enforce", products: { redes: grace(5) } })[0].product, "REDES");
  assert.deepEqual(graceNotices({ mode: "enforce", products: { articulos: grace(6) } }), []); // aún falta mucho
  assert.deepEqual(graceNotices({ mode: "enforce", products: { articulos: grace(0) } }), []); // ya vencida: la puerta, no el aviso
});

test("aviso de gracia: un producto activo normal o bloqueado no avisa", () => {
  assert.deepEqual(graceNotices({ mode: "enforce", products: { articulos: ok, redes: denied } }), []);
  assert.deepEqual(graceNotices({ mode: "enforce", products: null }), []);
});
