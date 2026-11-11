import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseCategory, deriveView, disconnectBlog, previewPending, resumePausedRuns, useBlog, useWebsite, PAUSED_MARK, NEEDS_CATEGORY_MARK } from "./destination-switch";
import { destinationRevision } from "./hub-blog-destination";
import { parseBlogState } from "./hub-blog-state";
import { contract } from "./hub-blog-state.test";

const HUB = "11111111-1111-4111-8111-111111111111";
const IDS = { requestId: "22222222-2222-4222-8222-222222222222", correlationId: "33333333-3333-4333-8333-333333333333" };
const readyState = () => parseBlogState({ data: { state: "blog_ready", hostname: "blog.cliente.com", destination: contract } }, HUB, IDS);

/** Base falsa en memoria con transacciones que revierten si algo falla. Nunca toca cuentas reales. */
function fake(init: { method?: string; credential?: boolean; blog?: any; runs?: any[]; running?: boolean; failHistory?: boolean } = {}) {
  let st: any = {
    user: { id: "u1", hubUserId: HUB, publishMethod: init.method ?? "BROWSER" },
    credential: init.credential ?? true, blog: init.blog ?? null, settings: {} as any,
    runs: init.runs ?? [], categories: { c10: { id: "c10", source: "sync" }, cblog: { id: "cblog", source: "blog" } } as any,
  };
  const tx: any = {
    user: {
      findUnique: async () => ({ ...st.user }),
      updateMany: async ({ where, data }: any) => { if (where.publishMethod && where.publishMethod !== st.user.publishMethod) return { count: 0 }; Object.assign(st.user, data); return { count: 1 }; },
    },
    blogIaBlog: {
      findUnique: async ({ where }: any) => (where.userId ? st.blog : (where.tenantId && st.blog?.tenantId === where.tenantId) || (where.hostname && st.blog?.hostname === where.hostname) ? st.blog : null),
      upsert: async ({ create, update }: any) => { st.blog = st.blog ? { ...st.blog, ...update } : { userId: "u1", ...create }; return st.blog; },
    },
    credential: { findUnique: async () => (st.credential ? { userId: "u1" } : null) },
    mcpConnection: { findFirst: async () => null },
    run: {
      count: async () => (init.running ? 1 : 0),
      findMany: async () => st.runs.filter((r: any) => ["pending", "halted"].includes(r.status)).map((r: any) => ({ id: r.id, status: r.status, category: { source: st.categories[r.categoryId].source }, titles: r.titles.filter((t: any) => t.status === "pending").map((t: any) => ({ id: t.id, errorMessage: t.errorMessage ?? null })) })),
      update: async ({ where, data }: any) => { Object.assign(st.runs.find((r: any) => r.id === where.id), data); },
    },
    title: { updateMany: async ({ where, data }: any) => { for (const t of st.runs.find((r: any) => r.id === where.runId).titles) if (t.status === "pending") Object.assign(t, data); return { count: 1 }; } },
    category: { findFirst: async ({ where }: any) => st.categories[where.id] ?? null },
    systemSetting: {
      findUnique: async ({ where }: any) => (st.settings[where.key] ? { encryptedValue: st.settings[where.key] } : null),
      upsert: async ({ where, create, update }: any) => { if (init.failHistory) throw new Error("fallo al guardar historial"); st.settings[where.key] = (create ?? update).encryptedValue; },
    },
  };
  const db = { ...tx, $transaction: async (fn: any) => { const snap = structuredClone(st); try { return await fn(tx); } catch (e) { st = snap; throw e; } } };
  return { db, get: () => st };
}
const run = (id: string, categoryId: string, status = "pending", n = 2) => ({ id, categoryId, status, titles: Array.from({ length: n }, (_, i) => ({ id: `${id}-${i}`, status: "pending", errorMessage: null as string | null })) });
const rev = (s: any) => destinationRevision(s.user.publishMethod, s.blog);

test("10MWS → BLOG IA: valida contrato, usa expected_revision, mueve pendientes y es idempotente", async () => {
  const f = fake({ runs: [run("r1", "cblog"), run("r2", "c10")] });
  const expected = rev(f.get());
  const out = await useBlog(f.db, { userId: "u1", state: readyState(), expectedRevision: expected, requestId: "x" });
  assert.equal(out.changed, true); assert.equal(out.moved, 2); assert.equal(out.needsCategory, 2);
  assert.equal(f.get().user.publishMethod, "BLOG"); assert.equal(f.get().blog.config.hubLink.previous_method, "BROWSER");
  assert.equal(f.get().runs[0].status, "pending");
  assert.equal(f.get().runs[1].status, "halted"); assert.equal(f.get().runs[1].titles[0].errorMessage, NEEDS_CATEGORY_MARK);
  assert.equal(f.get().runs[1].titles.length, 2); // nada se pierde
  const before = JSON.stringify(f.get().runs);
  const again = await useBlog(f.db, { userId: "u1", state: readyState(), expectedRevision: expected });
  assert.equal(again.changed, false); assert.equal(JSON.stringify(f.get().runs), before);
  assert.equal(JSON.parse(f.get().settings["destination-history:u1"]).length, 1);
});
test("cambio concurrente: revisión vieja devuelve conflicto y no cambia nada", async () => {
  const f = fake({ runs: [run("r1", "cblog")] });
  await assert.rejects(() => useBlog(f.db, { userId: "u1", state: readyState(), expectedRevision: "b".repeat(64) }), (e: any) => e.code === "destination_changed" && e.status === 409);
  assert.equal(f.get().user.publishMethod, "BROWSER"); assert.equal(f.get().blog, null);
});
test("atómico: si falla a mitad (historial) se revierte destino y pendientes", async () => {
  const f = fake({ runs: [run("r1", "c10")], failHistory: true });
  await assert.rejects(() => useBlog(f.db, { userId: "u1", state: readyState(), expectedRevision: rev(f.get()) }));
  assert.equal(f.get().user.publishMethod, "BROWSER"); assert.equal(f.get().runs[0].status, "pending"); assert.equal(f.get().blog, null);
});
test("con un lote en curso no se cambia", async () => {
  const f = fake({ running: true });
  await assert.rejects(() => useBlog(f.db, { userId: "u1", state: readyState(), expectedRevision: rev(f.get()) }), (e: any) => e.code === "runs_in_progress");
});
test("solo se puede elegir BLOG IA con blog_ready", async () => {
  const f = fake();
  const s = parseBlogState({ data: { state: "blog_pending", reason: "tls_not_ready" } }, HUB, IDS);
  await assert.rejects(() => useBlog(f.db, { userId: "u1", state: s, expectedRevision: rev(f.get()) }), (e: any) => e.code === "blog_not_ready");
});
test("BLOG IA → 10MWS: restaura el destino anterior sin borrar el blog ni los artículos", async () => {
  const f = fake({ runs: [run("r1", "cblog")] });
  await useBlog(f.db, { userId: "u1", state: readyState(), expectedRevision: rev(f.get()) });
  const blogBefore = JSON.stringify(f.get().blog);
  const out = await useWebsite(f.db, { userId: "u1" });
  assert.equal(out.changed, true); assert.equal(f.get().user.publishMethod, "BROWSER");
  assert.equal(JSON.stringify(f.get().blog), blogBefore); assert.equal(f.get().blog.status, "active"); // sin suspend
  assert.equal(f.get().runs[0].status, "halted"); assert.equal(f.get().runs[0].titles.length, 2); // categoría de blog en 10MWS: espera
  assert.equal((await useWebsite(f.db, { userId: "u1" })).changed, false); // idempotente
});
test("volver a 10MWS sin sitio conectado se rechaza", async () => {
  const f = fake({ method: "BLOG", credential: false, blog: { userId: "u1", status: "active", config: {} } });
  await assert.rejects(() => useWebsite(f.db, { userId: "u1" }), (e: any) => e.code === "website_not_connected");
});
test("desconectar sin 10MWS: pausa sin perder; conectar un destino reanuda", async () => {
  const f = fake({ method: "BLOG", credential: false, blog: { userId: "u1", status: "active", config: {} }, runs: [run("r1", "cblog", "pending", 3)] });
  const out = await disconnectBlog(f.db, { userId: "u1" });
  assert.equal(out.paused, 3); assert.equal(f.get().user.publishMethod, "BROWSER");
  assert.equal(f.get().runs[0].status, "halted"); assert.equal(f.get().runs[0].titles[0].errorMessage, PAUSED_MARK); assert.equal(f.get().runs[0].titles.length, 3);
  assert.equal((await resumePausedRuns(f.db, "u1")).moved, 0); // sigue sin destino
  f.get().credential = true; // la persona conecta su sitio 10MWS
  const back = await resumePausedRuns(f.db, "u1");
  assert.equal(back.needsCategory, 3); // la categoría era de BLOG IA: no se pierde, pide categoría
  f.get().runs[0].categoryId = "c10";
  await resumePausedRuns(f.db, "u1");
  assert.equal(f.get().runs[0].status, "pending");
});
test("desconectar con 10MWS conectado se rechaza (debe usar «Volver»)", async () => {
  const f = fake({ method: "BLOG", credential: true, blog: { userId: "u1", status: "active", config: {} } });
  await assert.rejects(() => disconnectBlog(f.db, { userId: "u1" }), (e: any) => e.code === "use_website_instead");
});
test("elegir categoría reanuda el lote; una categoría del otro destino se rechaza", async () => {
  const f = fake({ runs: [run("r1", "cblog")] });
  await resumePausedRuns(f.db, "u1");
  f.get().runs[0].status = "halted"; f.get().runs[0].titles.forEach((t: any) => (t.errorMessage = NEEDS_CATEGORY_MARK));
  await assert.rejects(() => chooseCategory(f.db, { userId: "u1", runId: "r1", categoryId: "cblog" }), (e: any) => e.code === "invalid_category");
  await chooseCategory(f.db, { userId: "u1", runId: "r1", categoryId: "c10" });
  assert.equal(f.get().runs[0].status, "pending"); assert.equal(f.get().runs[0].categoryId, "c10");
});
test("previsualizar cuenta cuántos se moverán", async () => {
  const f = fake({ runs: [run("r1", "cblog", "pending", 4), run("r2", "c10", "pending", 1)] });
  assert.deepEqual(await previewPending(f.db, "u1", "blog"), { toMove: 4, needCategory: 1 });
});

/* ---- Casos A–G y permisos ---- */
const hubOf = (data: any) => ({ ok: true as const, state: parseBlogState({ data }, HUB, IDS) });
const base = { publishMethod: "BROWSER", hasWebsite: true, siteName: "mi-sitio", blog: null, isOwner: true, revision: "r", pending: { toMove: 4, needCategory: 0 } };
const kinds = (v: any) => v.actions.map((a: any) => a.kind);
test("estados A–G", () => {
  const A = deriveView({ ...base, hub: hubOf({ state: "blog_ready", hostname: "blog.cliente.com", destination: contract }) });
  assert.equal(A.caseId, "A"); assert.deepEqual(kinds(A), ["switch_to_blog"]); assert.match(A.actions[0].confirm!, /Se moverán 4 artículos programados/); assert.match(A.current.label, /10MWS: mi-sitio/);
  const B = deriveView({ ...base, hub: hubOf({ state: "no_blog" }) }); assert.equal(B.caseId, "B"); assert.deepEqual(kinds(B), ["open_launch"]);
  const C = deriveView({ ...base, hub: hubOf({ state: "blog_pending", reason: "domain_not_confirmed" }) }); assert.equal(C.caseId, "C"); assert.match(C.notice!, /casi listo/); assert.ok(!kinds(C).includes("switch_to_blog"));
  const D = deriveView({ ...base, hub: hubOf({ state: "not_purchased" }) }); assert.equal(D.caseId, "D"); assert.deepEqual(kinds(D), ["open_landing"]);
  const blog = { status: "active", hostname: "blog.cliente.com" } as any;
  const E1 = deriveView({ ...base, publishMethod: "BLOG", blog, hub: { ok: false } }); assert.equal(E1.caseId, "E"); assert.match(E1.notice!, /^Conectado con BLOG IA · /); assert.deepEqual(kinds(E1), ["switch_to_website"]);
  const E2 = deriveView({ ...base, publishMethod: "BLOG", blog, hasWebsite: false, hub: { ok: false } }); assert.deepEqual(kinds(E2), ["disconnect"]); assert.match(E2.actions[0].confirm!, /no se publicarán hasta que conectes/);
  const F = deriveView({ ...base, hasWebsite: false, hub: hubOf({ state: "no_blog" }) }); assert.equal(F.caseId, "F"); assert.match(F.pausedNotice!, /no se publicarán/);
  const F2 = deriveView({ ...base, publishMethod: "BROWSER", hasWebsite: true, blog: null, hub: hubOf({ state: "no_blog" }) }); assert.equal(F2.caseId, "B");
  const G = deriveView({ ...base, hub: { ok: false } }); assert.equal(G.caseId, "G"); assert.deepEqual(kinds(G), ["retry"]);
  const S = deriveView({ ...base, publishMethod: "BLOG", blog: { status: "suspended", hostname: "blog.cliente.com" } as any, hub: hubOf({ state: "no_blog" }) }); assert.equal(S.current.kind, "none"); assert.match(S.notice!, /suspendido/);
});
test("acceso delegado ve el estado pero los botones de cambio quedan desactivados", () => {
  const v = deriveView({ ...base, isOwner: false, hub: hubOf({ state: "blog_ready", hostname: "blog.cliente.com", destination: contract }) });
  assert.equal(v.actions[0].disabled, true); assert.equal(v.actions[0].reason, "Solo el dueño de la cuenta puede cambiar el destino.");
});
