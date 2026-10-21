import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activate, deactivate, reactivate, authorize, authorizeRead, ensureBlog, getState, saveConfig, saveDomain, validateHostname, verifyDomain,
  SendError, tenantIdFor,
  type BlogPatch, type BlogRecord, type BlogIaEventOut, type WizardDeps, type WizardStore,
} from "./blog-ia-wizard";

function memStore(): WizardStore & { rows: Map<string, BlogRecord>; publishMethod: Map<string, string> } {
  const rows = new Map<string, BlogRecord>();
  const publishMethod = new Map<string, string>();
  return {
    rows, publishMethod,
    async get(u) { return rows.get(u) ?? null; },
    async create(u, t) {
      const ex = rows.get(u); if (ex) return ex;
      const r: BlogRecord = { userId: u, tenantId: t, hostname: null, status: "draft_setup", config: null, provisionedAt: null, dnsVerified: false, tlsReady: false, activatedAt: null, lastError: null };
      rows.set(u, r); return r;
    },
    async update(u, p: BlogPatch) { const r = { ...rows.get(u)!, ...p }; rows.set(u, r); return r; },
    async hostnameOwner(h) { for (const r of rows.values()) if (r.hostname === h) return r.userId; return null; },
    async activate(u, at) { const r = { ...rows.get(u)!, status: "active" as const, activatedAt: at }; rows.set(u, r); publishMethod.set(u, "BLOG"); return r; },
  };
}

function mk(over: Partial<WizardDeps> = {}) {
  const store = memStore();
  const sent: BlogIaEventOut[] = [];
  const seen = new Set<string>();
  const deps: WizardDeps = {
    store,
    send: async (e) => { sent.push(e); seen.add(e.eventId); },
    resolveCname: async () => [],
    probeTls: async () => false,
    cnameTarget: "edge.blogia.example.net",
    apiConfigured: true,
    now: () => new Date("2026-10-21T12:00:00Z"),
    hash: (t) => String(t.length),
    ...over,
  };
  return { deps, store, sent };
}

const brand = { siteUrl: "https://cliente.com", name: "Cliente SA", accentColor: "#112233", language: "es", whatsapp: "+57 300 123 4567", confirm: true };

async function until(deps: WizardDeps, user = "u1") {
  const c = await saveConfig(deps, user, brand);
  assert.ok(c.ok);
  const d = await saveDomain(deps, user, "blog.cliente.com");
  assert.ok(d.ok);
}

// ---- permisos
test("sin sesión → 401", () => {
  const r = authorize({ userId: null, articulosAllowed: true });
  assert.ok(!r.ok && r.status === 401);
});
test("sin módulo blog-ia → 403; con módulo habilitado → ok; admin → ok", () => {
  assert.ok(!authorize({ userId: "u1", disabledModules: null, articulosAllowed: true }).ok);
  assert.ok(!authorize({ userId: "u1", disabledModules: JSON.stringify({ "blog-ia": "inherit" }), articulosAllowed: true }).ok);
  assert.ok(authorize({ userId: "u1", disabledModules: JSON.stringify({ "blog-ia": "enabled" }), articulosAllowed: true }).ok);
  assert.ok(authorize({ userId: "a", role: "admin", articulosAllowed: false }).ok);
});
test("sin acceso a Artículos → 403", () => {
  const r = authorize({ userId: "u1", disabledModules: JSON.stringify({ "blog-ia": "enabled" }), articulosAllowed: false });
  assert.ok(!r.ok && r.status === 403);
});
test("tenant ajeno: usuario normal no lee otra cuenta; admin sí lee, y escribir siempre usa la sesión", () => {
  const user = { userId: "u1", disabledModules: JSON.stringify({ "blog-ia": "enabled" }), articulosAllowed: true };
  const r = authorizeRead(user, "u2");
  assert.ok(!r.ok && r.status === 403);
  const a = authorizeRead({ userId: "adm", role: "admin", articulosAllowed: true }, "u2");
  assert.ok(a.ok && a.value === "u2");
  const own = authorize({ ...user });
  assert.ok(own.ok && own.value === "u1");
});

// ---- creación
test("cuenta sin registro → estado not_configured; ensureBlog es idempotente", async () => {
  const { deps, store } = mk();
  assert.equal((await getState(deps, "u1")).stage, "not_started");
  const a = await ensureBlog(deps, "u1");
  const b = await ensureBlog(deps, "u1");
  assert.equal(a.tenantId, tenantIdFor("u1"));
  assert.deepEqual(a, b);
  assert.equal(store.rows.size, 1);
});

// ---- hostname
test("hostname inválido", () => {
  for (const h of ["", "cliente.com", "https://blog.cliente.com", "blog.cliente.com/x", "blog.cliente.com:8080", "1.2.3.4", "a b.cliente.com", "-x.cliente.com", "blog.cliente.123", "blog.lasolucionweb.com", "x.localhost", "blog.10minuteswebsite.net"]) {
    assert.ok(!validateHostname(h).ok, h);
  }
  assert.ok(validateHostname(" Blog.Cliente.com ").ok);
});
test("hostname duplicado de otra cuenta → 409", async () => {
  const { deps } = mk();
  await until(deps, "u1");
  await saveConfig(deps, "u2", brand);
  const r = await saveDomain(deps, "u2", "blog.cliente.com");
  assert.ok(!r.ok && r.status === 409);
});
test("el dominio exige marca confirmada", async () => {
  const { deps } = mk();
  const r = await saveDomain(deps, "u1", "blog.cliente.com");
  assert.ok(!r.ok && r.status === 409);
});

// ---- configuración
test("validaciones de marca", async () => {
  const { deps } = mk();
  for (const bad of [{ accentColor: "rojo" }, { language: "español" }, { whatsapp: "3001234567" }, { siteUrl: "http://x.com" }, { name: "x".repeat(81) }, { confirm: true }]) {
    const r = await saveConfig(deps, "u1", bad);
    assert.ok(!r.ok && r.status === 400, JSON.stringify(bad));
  }
});
test("WhatsApp se guarda solo con dígitos", async () => {
  const { deps } = mk();
  const r = await saveConfig(deps, "u1", brand);
  assert.ok(r.ok && r.value.config.whatsapp === "573001234567");
});

// ---- estados
test("pending_dns: sin CNAME", async () => {
  const { deps } = mk();
  await until(deps);
  const r = await verifyDomain(deps, "u1");
  assert.ok(r.ok && r.value.stage === "dns" && r.value.status === "pending_dns");
});
test("pending_tls: CNAME correcto sin HTTPS", async () => {
  const { deps, sent } = mk({ resolveCname: async () => ["edge.blogia.example.net."] });
  await until(deps);
  const r = await verifyDomain(deps, "u1");
  assert.ok(r.ok && r.value.stage === "tls" && r.value.status === "pending_tls");
  assert.equal(sent.at(-1)!.data.verification_status, "verified");
  assert.equal(sent.at(-1)!.data.tls_status, "pending");
});
test("domain_error: CNAME a otro destino", async () => {
  const { deps } = mk({ resolveCname: async () => ["otro.com"] });
  await until(deps);
  const r = await verifyDomain(deps, "u1");
  assert.ok(r.ok && r.value.stage === "error" && r.value.status === "domain_error" && /otro\.com/.test(r.value.lastError!));
});
test("active solo tras DNS + TLS + Activar; publishMethod pasa a BLOG", async () => {
  const { deps, store } = mk({ resolveCname: async () => ["edge.blogia.example.net"], probeTls: async () => true });
  await until(deps);
  const v = await verifyDomain(deps, "u1");
  assert.ok(v.ok && v.value.stage === "ready_to_activate" && v.value.status === "pending_tls");
  assert.equal(store.publishMethod.get("u1"), undefined);
  const a = await activate(deps, "u1", true);
  assert.ok(a.ok && a.value.status === "active" && a.value.publicUrl === "https://blog.cliente.com");
  assert.equal(store.publishMethod.get("u1"), "BLOG");
  const again = await activate(deps, "u1", true);
  assert.ok(again.ok && again.value.status === "active");
});
test("activar bloqueado sin dominio listo o sin acceso", async () => {
  const { deps } = mk();
  await until(deps);
  const r = await activate(deps, "u1", true);
  assert.ok(!r.ok && r.status === 409);
  const { deps: d2 } = mk({ resolveCname: async () => ["edge.blogia.example.net"], probeTls: async () => true });
  await until(d2);
  await verifyDomain(d2, "u1");
  const r2 = await activate(d2, "u1", false);
  assert.ok(!r2.ok && r2.status === 403);
});
test("suspended: no se puede editar ni activar", async () => {
  const { deps, store } = mk();
  await until(deps);
  await store.update("u1", { status: "suspended" });
  assert.equal((await getState(deps, "u1")).stage, "suspended");
  for (const r of [await saveConfig(deps, "u1", { name: "Otro" }), await saveDomain(deps, "u1", "blog.otro.com"), await activate(deps, "u1", true)]) {
    assert.ok(!r.ok && r.status === 409);
  }
});

// ---- red y reintentos
test("error de red al provisionar: se guarda lo local y el reintento usa el mismo eventId", async () => {
  let fail = true;
  const ids: string[] = [];
  const { deps, store } = mk({ send: async (e) => { ids.push(e.eventId); if (fail) throw new SendError("sin red", true); } });
  await saveConfig(deps, "u1", brand);
  const r1 = await saveDomain(deps, "u1", "blog.cliente.com");
  assert.ok(!r1.ok && r1.status === 502 && r1.retryable);
  assert.equal(store.rows.get("u1")!.hostname, "blog.cliente.com");
  assert.equal(store.rows.get("u1")!.provisionedAt, null);
  assert.ok(store.rows.get("u1")!.lastError);
  fail = false;
  const r2 = await saveDomain(deps, "u1", "blog.cliente.com");
  assert.ok(r2.ok);
  assert.ok(store.rows.get("u1")!.provisionedAt);
  assert.deepEqual([...new Set(ids)], ["provision:u1"]);
});
test("error 409 del Worker no es reintentable", async () => {
  const { deps } = mk({ send: async () => { throw new SendError("Ese hostname ya está en uso", false, 409); } });
  await saveConfig(deps, "u1", brand);
  const r = await saveDomain(deps, "u1", "blog.cliente.com");
  assert.ok(!r.ok && r.status === 409 && !r.retryable);
});
test("fallo de consulta DNS no cambia el estado", async () => {
  const { deps, store } = mk({ resolveCname: async () => { throw new Error("timeout"); } });
  await until(deps);
  const before = store.rows.get("u1")!.status;
  const r = await verifyDomain(deps, "u1");
  assert.ok(!r.ok && r.status === 502 && r.retryable);
  assert.equal(store.rows.get("u1")!.status, before);
});
test("sin API configurada: guarda borrador, no inventa conexión", async () => {
  const { deps, sent } = mk({ apiConfigured: false });
  await saveConfig(deps, "u1", brand);
  const r = await saveDomain(deps, "u1", "blog.cliente.com");
  assert.ok(!r.ok && r.status === 503);
  assert.equal(sent.length, 0);
});
test("cambiar la marca ya aprovisionado envía settings.update; repetir lo mismo reutiliza el eventId", async () => {
  const { deps, sent } = mk();
  await until(deps);
  await saveConfig(deps, "u1", { name: "Nuevo Nombre" });
  await saveConfig(deps, "u1", { name: "Nuevo Nombre" });
  const s = sent.filter((e) => e.type === "blog.settings.update");
  assert.equal(s.length, 2);
  assert.equal(s[0].eventId, s[1].eventId);
});
test("cambiar de hostname reinicia verificación y envía domain.change", async () => {
  const { deps, sent, store } = mk({ resolveCname: async () => ["edge.blogia.example.net"], probeTls: async () => true });
  await until(deps);
  await verifyDomain(deps, "u1");
  const r = await saveDomain(deps, "u1", "noticias.cliente.com");
  assert.ok(r.ok && r.value.stage === "dns");
  assert.equal(store.rows.get("u1")!.dnsVerified, false);
  assert.equal(sent.at(-1)!.type, "blog.domain.change");
  assert.equal(sent.at(-1)!.data.hostname, "noticias.cliente.com");
});

// ---- menú y pie
test("menú y pie: se validan y viajan al blog como marca", async () => {
  const { deps, sent } = mk();
  await until(deps);
  const ok = await saveConfig(deps, "u1", {
    nav: [{ label: "Inicio", href: "https://cliente.com" }, { label: "Servicios", href: "https://cliente.com/servicios" }],
    footerLinks: [{ label: "Privacidad", href: "https://cliente.com/privacidad" }],
  });
  assert.ok(ok.ok && ok.value.config.nav?.length === 2);
  const brand = sent.filter((e) => e.type === "blog.settings.update").at(-1)!.data.brand as { nav: unknown[]; footer: { links: unknown[] }[] };
  assert.equal(brand.nav.length, 2);
  assert.equal(brand.footer[0].links.length, 1);
  assert.equal((sent.find((e) => e.type === "blog.provision")!.data.brand as { nav: unknown[] }).nav.length, 0);
});
test("menú y pie: rechaza enlaces inseguros, sin texto o en exceso", async () => {
  const { deps } = mk();
  for (const bad of [
    { nav: [{ label: "X", href: "javascript:alert(1)" }] },
    { nav: [{ label: "X", href: "http://inseguro.com" }] },
    { nav: [{ label: "", href: "https://a.com" }] },
    { nav: [{ label: "x".repeat(41), href: "https://a.com" }] },
    { nav: "no-es-lista" },
    { nav: Array.from({ length: 9 }, (_, n) => ({ label: `L${n}`, href: "https://a.com" })) },
    { footerLinks: Array.from({ length: 11 }, (_, n) => ({ label: `L${n}`, href: "https://a.com" })) },
  ]) {
    const r = await saveConfig(deps, "u1", bad);
    assert.ok(!r.ok && r.status === 400, JSON.stringify(bad).slice(0, 60));
  }
});

test("logo: solo https, se puede quitar y viaja al blog", async () => {
  const { deps, sent } = mk();
  await until(deps);
  assert.ok(!(await saveConfig(deps, "u1", { logoUrl: "http://x.com/l.png" })).ok);
  assert.ok(!(await saveConfig(deps, "u1", { logoUrl: "javascript:alert(1)" })).ok);
  const ok = await saveConfig(deps, "u1", { logoUrl: "https://cliente.com/logo.svg" });
  assert.ok(ok.ok && ok.value.config.logoUrl === "https://cliente.com/logo.svg");
  assert.equal((sent.filter((e) => e.type === "blog.settings.update").at(-1)!.data.brand as { logoUrl: string }).logoUrl, "https://cliente.com/logo.svg");
  const del = await saveConfig(deps, "u1", { logoUrl: "" });
  assert.ok(del.ok && del.value.config.logoUrl === undefined);
});

// ---- desactivar / reactivar
async function activo(over: Partial<WizardDeps> = {}) {
  const ctx = mk({ resolveCname: async () => ["edge.blogia.example.net"], probeTls: async () => true, ...over });
  await until(ctx.deps);
  await verifyDomain(ctx.deps, "u1");
  await activate(ctx.deps, "u1", true);
  return ctx;
}
test("desactivar: suspende el blog, conserva todo y NO cambia el método de publicación", async () => {
  const { deps, store, sent } = await activo();
  assert.equal(store.publishMethod.get("u1"), "BLOG");
  const r = await deactivate(deps, "u1");
  assert.ok(r.ok && r.value.stage === "deactivated" && r.value.status === "deactivated");
  assert.equal(sent.at(-1)!.type, "blog.subscription.suspend");
  assert.equal(store.publishMethod.get("u1"), "BLOG"); // sin tocar
  const rec = store.rows.get("u1")!;
  assert.ok(rec.hostname && rec.config?.name && rec.activatedAt); // contenido de configuración conservado
  assert.ok(!(await saveDomain(deps, "u1", "blog.otro.com")).ok); // no se cambia el dominio mientras está apagado
});
test("desactivar es idempotente y solo aplica a un blog activo", async () => {
  const { deps, sent } = await activo();
  await deactivate(deps, "u1");
  const again = await deactivate(deps, "u1");
  assert.ok(again.ok);
  const ids = sent.filter((e) => e.type === "blog.subscription.suspend").map((e) => e.eventId);
  assert.equal(ids.length, 2);
  assert.equal(ids[0], ids[1]); // mismo id: el Worker lo trata como duplicado
  const fresh = mk();
  const none = await deactivate(fresh.deps, "u1");
  assert.ok(!none.ok && none.status === 409);
});
test("desactivar con fallo de red: queda desactivado localmente y el reintento reenvía", async () => {
  let fail = false;
  const { deps, store } = await activo({ send: async () => { if (fail) throw new SendError("sin red", true); } });
  fail = true;
  const r1 = await deactivate(deps, "u1");
  assert.ok(!r1.ok && r1.status === 502 && r1.retryable);
  assert.equal(store.rows.get("u1")!.status, "deactivated");
  fail = false;
  assert.ok((await deactivate(deps, "u1")).ok);
});
test("reactivar: vuelve a active, reanuda en el blog y exige acceso y dominio vigentes", async () => {
  const { deps, store, sent } = await activo();
  await deactivate(deps, "u1");
  const sinAcceso = await reactivate(deps, "u1", false);
  assert.ok(!sinAcceso.ok && sinAcceso.status === 403);
  await store.update("u1", { tlsReady: false });
  const sinDominio = await reactivate(deps, "u1", true);
  assert.ok(!sinDominio.ok && sinDominio.status === 409);
  await store.update("u1", { tlsReady: true });
  const ok = await reactivate(deps, "u1", true);
  assert.ok(ok.ok && ok.value.status === "active" && ok.value.publicUrl === "https://blog.cliente.com");
  assert.equal(sent.at(-1)!.type, "blog.subscription.resume");
  assert.ok(!(await reactivate(deps, "u1", true)).ok); // ya no está desactivado
});
