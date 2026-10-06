import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowStaticConnectionSuccess } from "./connection-return-state";

test("LinkedIn y Threads conservan la tarjeta con acciones después del OAuth", () => {
  for (const conexion of ["linkedin", "threads"]) {
    assert.equal(
      shouldShowStaticConnectionSuccess({ conexion, resultado: "connected", choice: null }),
      false,
      `${conexion} no debe mostrar el retorno estático`,
    );
  }
});

test("las conexiones con destino pendiente conservan el retorno estático", () => {
  assert.equal(
    shouldShowStaticConnectionSuccess({ conexion: "business-profile", resultado: "connected", choice: null }),
    true,
  );
  assert.equal(
    shouldShowStaticConnectionSuccess({ conexion: "tumblr", resultado: "connected", choice: "el blog" }),
    false,
  );
});

test("errores y pantallas sin resultado nunca fuerzan el éxito estático", () => {
  assert.equal(shouldShowStaticConnectionSuccess({ conexion: "linkedin", resultado: "error", choice: null }), false);
  assert.equal(shouldShowStaticConnectionSuccess({ conexion: null, resultado: "connected", choice: null }), false);
});
