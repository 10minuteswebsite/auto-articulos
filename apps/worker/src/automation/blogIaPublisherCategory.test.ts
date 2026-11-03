import assert from "node:assert/strict";
import { test } from "node:test";
import { createBlogIaPublisher } from "./blogIaPublisher";

const generated = { title: "Guía completa de cortes", summary: "Un resumen claro del artículo para el lector.", contentHtml: "<h2>Hola</h2><p>Texto del artículo.</p>" };

async function publish(category: { id: string; name: string; description?: string; existing?: boolean }) {
  const sent: { type: string; data: Record<string, unknown> }[] = [];
  const publisher = createBlogIaPublisher({
    tenantId: "t_demo",
    blogBaseUrl: "https://blog.demo.test",
    send: async (event) => { sent.push({ type: event.type, data: event.data }); return { ok: true, result: "applied" }; },
    promptText: "Escribe {title}",
    contentLanguage: "es",
    category,
    generate: async () => generated,
  });
  await publisher.publishArticle({ title: "Cortes de cabello", categoryExternalId: category.id, disableIndexing: false, onStep: async () => {} });
  return sent;
}

test("categoría creada por Artículos (flujo de siempre): se envía category.upsert y el artículo la usa", async () => {
  const sent = await publish({ id: "cuid-123", name: "Cortes de cabello" });
  assert.equal(sent.filter((e) => e.type === "category.upsert").length, 1);
  const article = sent.find((e) => e.type === "article.publish")!;
  assert.deepEqual(article.data.category_ids, ["cuid-123"]);
});

test("categoría que ya existe en el blog (asistente de BLOG IA): NO se reenvía (no se pisa su descripción) y el artículo la usa", async () => {
  const sent = await publish({ id: "cat-cortes-de-cabello", name: "Cortes de cabello", existing: true });
  assert.equal(sent.filter((e) => e.type === "category.upsert").length, 0);
  const article = sent.find((e) => e.type === "article.publish")!;
  assert.deepEqual(article.data.category_ids, ["cat-cortes-de-cabello"]);
});
