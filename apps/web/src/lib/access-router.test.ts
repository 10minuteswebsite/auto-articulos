import assert from "node:assert/strict";
import test from "node:test";
import { routeAfterLogin } from "./access-router";

const config = { articulosHost: "articulos.lasolucionweb.com", redesHost: "redes.lasolucionweb.com", canonicalHost: "seototal.lasolucionweb.com", hubUrl: "https://hub.example.test" };
const active = (product: "ARTICULOS" | "REDES") => ({ product, status: "ACTIVE" as const });

test("canonical with one product redirects to its host; both stay", () => {
  assert.deepEqual(routeAfterLogin({ entitlements: [active("ARTICULOS")], host: config.canonicalHost, role: "user", now: new Date(), config }), { kind: "redirect", url: config.articulosHost });
  assert.deepEqual(routeAfterLogin({ entitlements: [active("ARTICULOS"), active("REDES")], host: config.canonicalHost, role: "user", now: new Date(), config }), { kind: "stay" });
});

test("expired grace goes to HUB; current product absence goes to other product", () => {
  assert.deepEqual(routeAfterLogin({ entitlements: [{ product: "REDES", status: "GRACE", graceUntil: new Date(Date.now() - 1) }], host: config.canonicalHost, role: "user", now: new Date(), config }), { kind: "redirect", url: config.hubUrl });
  assert.deepEqual(routeAfterLogin({ entitlements: [active("REDES")], host: config.articulosHost, role: "user", now: new Date(), config }), { kind: "redirect", url: config.redesHost });
});

test("admins, unknown hosts, and empty legacy records never loop", () => {
  for (const role of ["admin", "user"]) {
    const host = role === "admin" ? config.redesHost : "preview.vercel.app";
    assert.deepEqual(routeAfterLogin({ entitlements: [], host, role, now: new Date(), config }), { kind: "stay" });
  }
});
