import assert from "node:assert/strict";
import { test } from "node:test";
import { syncBlogCategories } from "./blogCategorySync";

process.env.BLOG_IA_API_URL = "https://api.blog.test";
process.env.BLOG_IA_SECRET = "secreto-de-prueba";

type Upsert = { where: { userId_platform_panel_externalId: { userId: string; externalId: string } }; create: Record<string, unknown>; update: Record<string, unknown> };

function fakeDb(opts: { tenantId?: string | null; mine?: string[] }) {
  const upserts: Upsert[] = [];
  const deletes: unknown[] = [];
  const db = {
    blogIaBlog: { findUnique: async () => (opts.tenantId === null ? null : { tenantId: opts.tenantId ?? "t_demo" }) },
    category: { findMany: async () => (opts.mine ?? []).map((id) => ({ id })), upsert: async (a: Upsert) => { upserts.push(a); return {}; }, deleteMany: async (a: unknown) => { deletes.push(a); return { count: 1 }; } },
  };
  return { db: db as never, upserts, deletes };
}

const listResponse = (categories: unknown[]) => (async () => new Response(JSON.stringify({ ok: true, categories }), { status: 200 })) as unknown as typeof fetch;

test("trae las categorías del blog por el canal firmado y las guarda con source «blog»", async () => {
  let seen: { url?: string; body?: string; sig?: string | null } = {};
  const fetchImpl = (async (url: string, init: RequestInit) => {
    seen = { url, body: String(init.body), sig: new Headers(init.headers).get("x-blogia-signature") };
    return new Response(JSON.stringify({ ok: true, categories: [{ id: "cat-cortes", slug: "cortes", name: "Cortes", description: "Estilos" }, { id: "cat-color", slug: "color", name: "Color", description: "" }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const { db, upserts } = fakeDb({});
  const added = await syncBlogCategories("u1", { db, config: { fetchImpl } });
  assert.equal(added, 2);
  assert.equal(seen.url, "https://api.blog.test/api/categories/list");
  assert.deepEqual(JSON.parse(seen.body!), { tenant_id: "t_demo" });
  assert.match(seen.sig ?? "", /^[0-9a-f]{64}$/);
  assert.equal(upserts[0].where.userId_platform_panel_externalId.externalId, "cat-cortes");
  assert.equal(upserts[0].create.source, "blog");
  assert.equal(upserts[0].create.panel, "");
  assert.equal(upserts[0].create.userId, "u1");
});

test("no duplica categorías que el publicador ya creó antes en el blog (su id es el de nuestra Category)", async () => {
  const { db, upserts } = fakeDb({ mine: ["cuid-ya-existe"] });
  const added = await syncBlogCategories("u1", { db, config: { fetchImpl: listResponse([{ id: "cuid-ya-existe", slug: "x", name: "X", description: "" }, { id: "cat-nueva", slug: "nueva", name: "Nueva", description: "" }]) } });
  assert.equal(added, 1);
  assert.deepEqual(upserts.map((u) => u.where.userId_platform_panel_externalId.externalId), ["cat-nueva"]);
});

test("sin blog todavía: error claro; sin configuración del servidor: error claro; si el blog falla, el error sube", async () => {
  await assert.rejects(() => syncBlogCategories("u1", { db: fakeDb({ tenantId: null }).db }), /todavía no está listo/);
  const saved = process.env.BLOG_IA_SECRET; delete process.env.BLOG_IA_SECRET;
  await assert.rejects(() => syncBlogCategories("u1", { db: fakeDb({}).db }), /no está configurado/);
  process.env.BLOG_IA_SECRET = saved;
  const down = (async () => new Response(JSON.stringify({ ok: false, error: "boom" }), { status: 500 })) as unknown as typeof fetch;
  await assert.rejects(() => syncBlogCategories("u1", { db: fakeDb({}).db, config: { fetchImpl: down } }), /boom/);
});

test("retira del selector las categorías que ya no están en el blog, solo si ninguna publicación u oportunidad las usó", async () => {
  const { db, deletes } = fakeDb({});
  await syncBlogCategories("u1", { db, config: { fetchImpl: listResponse([{ id: "cat-queda", slug: "queda", name: "Queda", description: "" }]) } });
  assert.equal(deletes.length, 1);
  const where = (deletes[0] as { where: Record<string, unknown> }).where;
  assert.equal(where.userId, "u1");
  assert.equal(where.source, "blog", "solo las creadas desde el blog; las de 10minutesWebsite no se tocan");
  assert.deepEqual(where.externalId, { notIn: ["cat-queda"] });
  assert.deepEqual(where.runs, { none: {} });
  assert.deepEqual(where.opportunityGroups, { none: {} });
});

test("con una lista vacía del blog NO se borra nada (protección contra una respuesta incompleta)", async () => {
  const { db, deletes } = fakeDb({});
  await syncBlogCategories("u1", { db, config: { fetchImpl: listResponse([]) } });
  assert.equal(deletes.length, 0);
});
