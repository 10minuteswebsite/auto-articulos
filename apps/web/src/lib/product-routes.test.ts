import { test } from "node:test";
import assert from "node:assert/strict";
import { isProductViewEnabled, isVisibleInProduct, productOfPath, PRODUCT_ROUTES } from "./product-routes";

test("«oportunidades-redes» es Redes y «oportunidades» es Artículos (no se confunden por prefijo)", () => {
  assert.equal(productOfPath("/dashboard/oportunidades-redes"), "REDES");
  assert.equal(productOfPath("/dashboard/oportunidades"), "ARTICULOS");
  assert.equal(productOfPath("/dashboard/oportunidades/algo"), "ARTICULOS");
});

test("las pantallas de cada producto se reconocen", () => {
  assert.equal(productOfPath("/dashboard/publicar"), "ARTICULOS");
  assert.equal(productOfPath("/dashboard/estadisticas"), "ARTICULOS");
  assert.equal(productOfPath("/dashboard/configuracion/contenido"), "ARTICULOS");
  assert.equal(productOfPath("/dashboard/configuracion/redes-sociales"), "REDES");
  assert.equal(productOfPath("/dashboard/articulos"), "ARTICULOS");
  assert.equal(productOfPath("/dashboard/redes"), "REDES");
});

test("la coincidencia más específica gana dentro de Configuración", () => {
  assert.equal(productOfPath("/dashboard/configuracion"), "COMPARTIDO");
  assert.equal(productOfPath("/dashboard/configuracion/conexiones"), "COMPARTIDO");
  assert.equal(productOfPath("/dashboard/configuracion/cuenta"), "COMPARTIDO");
  assert.equal(productOfPath("/dashboard/configuracion/inicial"), "ARTICULOS");
});

test("historial y progreso siguen siendo compartidos (hoy mezclan ambos productos)", () => {
  assert.equal(productOfPath("/dashboard/historial"), "COMPARTIDO");
  assert.equal(productOfPath("/dashboard/publicaciones-en-curso"), "COMPARTIDO");
});

test("el inicio y cualquier ruta desconocida son compartidos: nunca se esconde una pantalla por duda", () => {
  assert.equal(productOfPath("/dashboard"), "COMPARTIDO");
  assert.equal(productOfPath("/dashboard/lo-que-sea-nuevo"), "COMPARTIDO");
  assert.equal(productOfPath(""), "COMPARTIDO");
  assert.equal(productOfPath(null), "COMPARTIDO");
  assert.equal(productOfPath(undefined), "COMPARTIDO");
});

test("Administración queda fuera de ambos productos", () => {
  for (const p of ["/dashboard/usuarios", "/dashboard/composio", "/dashboard/postpeer"]) {
    assert.equal(productOfPath(p), "ADMIN");
  }
});

test("barra final, query y hash no cambian el resultado", () => {
  assert.equal(productOfPath("/dashboard/publicar/"), "ARTICULOS");
  assert.equal(productOfPath("/dashboard/oportunidades-redes?x=1"), "REDES");
  assert.equal(productOfPath("/dashboard/publicar#arriba"), "ARTICULOS");
});

test("un prefijo pegado no coincide: «/dashboard/publicarX» no es Artículos", () => {
  assert.equal(productOfPath("/dashboard/publicarX"), "COMPARTIDO");
});

test("visibilidad: lo compartido va en ambos productos; lo propio solo en el suyo; admin en ninguno", () => {
  assert.equal(isVisibleInProduct("COMPARTIDO", "ARTICULOS"), true);
  assert.equal(isVisibleInProduct("COMPARTIDO", "REDES"), true);
  assert.equal(isVisibleInProduct("ARTICULOS", "ARTICULOS"), true);
  assert.equal(isVisibleInProduct("ARTICULOS", "REDES"), false);
  assert.equal(isVisibleInProduct("REDES", "REDES"), true);
  assert.equal(isVisibleInProduct("REDES", "ARTICULOS"), false);
  assert.equal(isVisibleInProduct("ADMIN", "ARTICULOS"), false);
});

test("la tabla no tiene prefijos duplicados", () => {
  const prefixes = PRODUCT_ROUTES.map(([p]) => p);
  assert.equal(new Set(prefixes).size, prefixes.length);
});

test("la vista por productos solo se activa si /api/me ya llegó y el módulo no está deshabilitado", () => {
  assert.equal(isProductViewEnabled(undefined), false); // aún sin cargar: como hoy
  assert.equal(isProductViewEnabled(null), false);
  assert.equal(isProductViewEnabled(["vista-productos"]), false); // opt-in sin «Habilitado»
  assert.equal(isProductViewEnabled(["historial"]), true); // administrador o cuenta con «Habilitado»
  assert.equal(isProductViewEnabled([]), true);
});
