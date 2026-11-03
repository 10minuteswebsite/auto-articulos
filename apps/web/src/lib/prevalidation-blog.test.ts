import { test } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// tsx compila el JSX de los componentes con React.createElement.
(globalThis as unknown as { React: typeof React }).React = React;

async function render(props: Record<string, unknown>) {
  const Guard = (await import("../components/PreValidationGuard")).default;
  return renderToStaticMarkup(React.createElement(Guard as never, { type: "publicar", hasLanguage: true, hasImageCredits: true, ...props } as never, React.createElement("p", null, "CONTENIDO-LISTO")));
}

test("destino BLOG IA incompleto: el Paso 1 NO pide 10minutesWebsite y dice qué hacer con el blog", async () => {
  const html = await render({ credentialsConfigured: false, hasCategories: true, categoriesCount: 3, blogDestination: "blog.demo.com" });
  assert.match(html, /Destino: tu BLOG IA/);
  assert.match(html, /Tus artículos se publican en tu blog \(blog\.demo\.com\)/);
  assert.match(html, /Abrir BLOG IA/);
  assert.doesNotMatch(html, /Falta conectar/);
  assert.doesNotMatch(html, /Tus credenciales para publicar artículos en tu sitio web/);
});

test("destino BLOG IA sin categorías: dice que se traen de su blog (no «sincronizar» el sitio)", async () => {
  const html = await render({ credentialsConfigured: true, hasCategories: false, categoriesCount: 0, blogDestination: "" });
  assert.match(html, /Los temas de tu blog, que eliges en el asistente de BLOG IA/);
  assert.match(html, /Falta traerlas de tu blog/);
  assert.match(html, /Traer categorías/);
  assert.doesNotMatch(html, /Cuenta de 10minutesWebsite/);
});

test("destino BLOG IA completo: se ve el contenido de Publicar", async () => {
  const html = await render({ credentialsConfigured: true, hasCategories: true, categoriesCount: 5, blogDestination: "blog.demo.com" });
  assert.match(html, /CONTENIDO-LISTO/);
});

test("destino 10minutesWebsite: todo sigue igual que antes", async () => {
  const html = await render({ credentialsConfigured: false, hasCategories: true, categoriesCount: 3 });
  assert.match(html, /Falta conectar/);
  assert.match(html, /Tus credenciales para publicar artículos en tu sitio web/);
  assert.doesNotMatch(html, /BLOG IA/);
});
