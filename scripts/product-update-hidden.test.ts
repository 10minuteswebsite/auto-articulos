import assert from "node:assert/strict";
import { test } from "node:test";
import { hiddenFeatureOf } from "./product-update-hidden";

test("un commit sobre BLOG IA por asunto nunca se anuncia", () => {
  assert.equal(hiddenFeatureOf("feat(blog-ia): wizard", ["apps/web/src/app/dashboard/publicar/page.tsx"]), "BLOG IA");
  assert.equal(hiddenFeatureOf("Fase 2 de BLOG IA", []), "BLOG IA");
});

test("un commit cuyos archivos son solo de BLOG IA nunca se anuncia", () => {
  assert.equal(hiddenFeatureOf("feat: portadas", ["apps/blog/src/app.ts", "apps/web/src/app/dashboard/blog-ia/page.tsx", "apps/worker/src/blogIaQueue.ts"]), "BLOG IA");
  assert.equal(hiddenFeatureOf("db: migración", ["packages/db/prisma/migrations/20261021120000_blog_ia_wizard/migration.sql"]), "BLOG IA");
});

test("cambios normales de SEO Total siguen pudiendo anunciarse", () => {
  assert.equal(hiddenFeatureOf("fix: botón de historial", ["apps/web/src/app/dashboard/historial/page.tsx"]), null);
  assert.equal(hiddenFeatureOf("feat: nueva pantalla", []), null);
  // mezcla: si toca algo que NO es BLOG IA, decide el resto del flujo (no se oculta por tocar un archivo de BLOG IA)
  assert.equal(hiddenFeatureOf("fix: historial", ["apps/web/src/app/dashboard/historial/page.tsx", "apps/web/src/lib/blog-ia-wizard.ts"]), null);
});
