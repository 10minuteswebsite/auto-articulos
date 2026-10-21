import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnv, send, get, provisionTenant, articleData } from "./test-helpers";

async function setup() {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test", { name: "Uno SA", whatsapp: "+1 (305) 555-0100", accentColor: "#0e7490", nav: [{ label: "Inicio", href: "https://uno.test" }] });
  await provisionTenant(env, "t2", "blog.dos.test", { name: "Dos SL" });
  await send(env, "t1", "category.upsert", { id: "c1", slug: "medicaid", name: "Medicaid", description: "Guías de Medicaid" });
  await send(env, "t1", "category.upsert", { id: "vacia", slug: "vacia", name: "Sin artículos" });
  return env;
}
const text = async (r: Response) => r.text();

test("cada host muestra solo su contenido (aislamiento entre clientes)", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1, { slug: "igual", title: "Título de UNO" }));
  await send(env, "t2", "article.publish", articleData(1, { slug: "igual", title: "Título de DOS" }));
  const a = await text(await get(env, "blog.uno.test", "/igual/"));
  const b = await text(await get(env, "blog.dos.test", "/igual/"));
  assert.match(a, /Título de UNO/); assert.doesNotMatch(a, /DOS/);
  assert.match(b, /Título de DOS/); assert.doesNotMatch(b, /UNO/);
  assert.equal((await get(env, "blog.dos.test", "/articulo-9/")).status, 404);
});

test("un hostname desconocido o sin verificar da 404 neutro", async () => {
  const env = await setup();
  const r = await get(env, "blog.nadie.test", "/");
  assert.equal(r.status, 404);
  assert.equal(await r.text(), "Not found");
  await send(env, "t2", "blog.domain.change", { hostname: "blog.pendiente.test", verification_status: "pending", tls_status: "pending" });
  assert.equal((await get(env, "blog.pendiente.test", "/")).status, 404);
});

test("portada: destacado, categorías con artículos reales, paginación y canonical", async () => {
  const env = await setup();
  for (let n = 1; n <= 12; n++) await send(env, "t1", "article.publish", articleData(n, { category_ids: n === 1 ? ["c1"] : [] }));
  const home = await text(await get(env, "blog.uno.test", "/"));
  assert.match(home, /<link rel="canonical" href="https:\/\/blog\.uno\.test\/">/);
  assert.match(home, /Artículo número 12/);          // el más reciente es el destacado
  assert.match(home, /class="featured"/);
  assert.match(home, /Medicaid/); assert.match(home, /1 artículo/);
  assert.doesNotMatch(home, /Sin artículos/);        // categoría vacía no se muestra
  assert.match(home, /href="\/page\/2\/"/);
  const p2 = await text(await get(env, "blog.uno.test", "/page/2/"));
  assert.match(p2, /<link rel="canonical" href="https:\/\/blog\.uno\.test\/page\/2\/">/);
  assert.doesNotMatch(p2, /class="featured"/);
  assert.equal((await get(env, "blog.uno.test", "/page/3/")).status, 404);
  const one = await get(env, "blog.uno.test", "/page/1/");
  assert.equal(one.status, 301); assert.equal(one.headers.get("location"), "https://blog.uno.test/");
});

test("categoría: H1, descripción, breadcrumb, JSON-LD y noindex si está vacía", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1, { category_ids: ["c1"] }));
  const cat = await text(await get(env, "blog.uno.test", "/categoria/medicaid/"));
  assert.match(cat, /<h1>Medicaid<\/h1>/); assert.match(cat, /Guías de Medicaid/);
  assert.match(cat, /"@type":"CollectionPage"/); assert.match(cat, /"@type":"BreadcrumbList"/);
  assert.match(cat, /index,follow/);
  const empty = await text(await get(env, "blog.uno.test", "/categoria/vacia/"));
  assert.match(empty, /noindex,follow/);
  assert.equal((await get(env, "blog.uno.test", "/categoria/inexistente/")).status, 404);
});

test("artículo: SEO, JSON-LD, índice de contenidos, WhatsApp y relacionados", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1, { category_ids: ["c1"], seo_title: "Título SEO", meta_description: "Descripción SEO" }));
  await send(env, "t1", "article.publish", articleData(2, { category_ids: ["c1"] }));
  const page = await text(await get(env, "blog.uno.test", "/articulo-1/"));
  assert.match(page, /<title>Título SEO \| Uno SA<\/title>/);
  assert.match(page, /<meta name="description" content="Descripción SEO">/);
  assert.match(page, /<link rel="canonical" href="https:\/\/blog\.uno\.test\/articulo-1\/">/);
  assert.match(page, /"@type":"BlogPosting"/); assert.match(page, /"datePublished"/);
  assert.equal((page.match(/<h1>/g) ?? []).length, 1);
  assert.match(page, /class="toc"/); assert.match(page, /id="primera-parte"/);
  assert.match(page, /https:\/\/wa\.me\/13055550100/);          // número normalizado
  assert.match(page, /Artículos relacionados/); assert.match(page, /Artículo número 2/);
  assert.doesNotMatch(page, /blog\.dos\.test/);
});

test("sin número de WhatsApp válido el módulo se oculta", async () => {
  const env = await setup();
  await send(env, "t2", "article.publish", articleData(1));
  const page = await text(await get(env, "blog.dos.test", "/articulo-1/"));
  assert.doesNotMatch(page, /wa\.me\/\d/);
  assert.doesNotMatch(page, /class="wa"/);
});

test("el contenido del usuario se escapa (sin XSS en título, marca ni búsqueda)", async () => {
  const env = await setup();
  await send(env, "t1", "blog.settings.update", { brand: { name: `<img src=x onerror=alert(1)>` } });
  await send(env, "t1", "article.publish", articleData(1, { title: `A <script>alert(1)</script> B` }));
  const home = await text(await get(env, "blog.uno.test", "/"));
  assert.doesNotMatch(home, /<script>alert/); assert.doesNotMatch(home, /<img src=x/);
  const search = await text(await get(env, "blog.uno.test", `/buscar/?q=${encodeURIComponent(`"><script>alert(1)</script>`)}`));
  assert.doesNotMatch(search, /<script>alert/);
});

test("búsqueda funcional, sin indexar, y sin inyección SQL", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1, { title: "Guía de Medicaid" }));
  await send(env, "t2", "article.publish", articleData(1, { title: "Guía de Medicaid ajena" }));
  const ok = await get(env, "blog.uno.test", "/buscar/?q=medicaid");
  const body = await ok.text();
  assert.match(body, /Guía de Medicaid/); assert.doesNotMatch(body, /ajena/);
  assert.match(body, /noindex,follow/); assert.equal(ok.headers.get("x-robots-tag"), "noindex");
  const evil = await get(env, "blog.uno.test", `/buscar/?q=${encodeURIComponent("' OR 1=1 --")}`);
  assert.equal(evil.status, 200); assert.match(await evil.text(), /No encontramos/);
});

test("sitemap y robots contienen solo URLs del tenant activo", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1, { category_ids: ["c1"] }));
  await send(env, "t1", "article.publish", articleData(2));
  await send(env, "t2", "article.publish", articleData(1, { slug: "de-dos" }));
  await send(env, "t1", "article.unpublish", { source_article_id: "a2" });
  const idx = await text(await get(env, "blog.uno.test", "/sitemap.xml"));
  assert.match(idx, /https:\/\/blog\.uno\.test\/sitemap-articles\.xml/);
  const arts = await text(await get(env, "blog.uno.test", "/sitemap-articles.xml"));
  assert.match(arts, /https:\/\/blog\.uno\.test\/articulo-1\//);
  assert.doesNotMatch(arts, /articulo-2/); assert.doesNotMatch(arts, /de-dos|blog\.dos\.test/);
  const cats = await text(await get(env, "blog.uno.test", "/sitemap-categories.xml"));
  assert.match(cats, /categoria\/medicaid/); assert.doesNotMatch(cats, /vacia/);
  const robots = await text(await get(env, "blog.uno.test", "/robots.txt"));
  assert.match(robots, /Sitemap: https:\/\/blog\.uno\.test\/sitemap\.xml/); assert.doesNotMatch(robots, /dos/);
  assert.equal((await get(env, "blog.uno.test", "/articulo-2/")).status, 404);   // despublicado
});

test("barra final: la URL sin barra redirige 301 a la canónica", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1));
  const r = await get(env, "blog.uno.test", "/articulo-1");
  assert.equal(r.status, 301); assert.equal(r.headers.get("location"), "https://blog.uno.test/articulo-1/");
});

test("suspender → 503 con marca y sin caché; el contenido persiste; reactivar → 200", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1));
  await send(env, "t1", "blog.subscription.suspend", {});
  for (const path of ["/", "/articulo-1/", "/robots.txt", "/sitemap.xml"]) {
    const r = await get(env, "blog.uno.test", path);
    assert.equal(r.status, 503, path);
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(r.headers.get("retry-after"), null);
  }
  const page = await text(await get(env, "blog.uno.test", "/"));
  assert.match(page, /Este blog se encuentra temporalmente fuera de servicio/);
  assert.match(page, /Uno SA/);
  assert.doesNotMatch(page, /uno\.test\/"|Inicio/);               // sin menú ni enlaces a la web
  assert.equal((await env.db.first<{ n: number }>("SELECT COUNT(*) AS n FROM articles"))?.n, 1); // contenido intacto
  assert.equal((await get(env, "blog.dos.test", "/")).status, 200);  // el otro cliente no se ve afectado
  await send(env, "t1", "blog.subscription.resume", {});
  assert.equal((await get(env, "blog.uno.test", "/articulo-1/")).status, 200);
});

test("cambio de subdominio: conserva contenido, canonical nuevo y 301 desde el host viejo", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1));
  await send(env, "t1", "blog.domain.change", { hostname: "noticias.uno.test", verification_status: "verified", tls_status: "ready", make_primary: true });
  const nuevo = await text(await get(env, "noticias.uno.test", "/articulo-1/"));
  assert.match(nuevo, /<link rel="canonical" href="https:\/\/noticias\.uno\.test\/articulo-1\/">/);
  const viejo = await get(env, "blog.uno.test", "/articulo-1/");
  assert.equal(viejo.status, 301);
  assert.equal(viejo.headers.get("location"), "https://noticias.uno.test/articulo-1/");
});

test("404 con marca en un blog válido y métodos no permitidos", async () => {
  const env = await setup();
  const r = await get(env, "blog.uno.test", "/no-existe/");
  assert.equal(r.status, 404); assert.match(await r.text(), /Uno SA/);
  const post = await get(env, "blog.uno.test", "/", { method: "POST" });
  assert.equal(post.status, 405);
});

test("el acento se oscurece hasta cumplir contraste AA", async () => {
  const env = await setup();
  await send(env, "t2", "blog.settings.update", { brand: { accentColor: "#ffff00" } });
  const css = await text(await get(env, "blog.dos.test", "/"));
  const m = /--accent:(#[0-9a-f]{6})\}<\/style>/.exec(css);
  assert.ok(m && m[1] !== "#ffff00");
});

test("cambio de slug: la URL anterior responde 301 a la nueva, sin cruzar clientes", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1, { slug: "viejo", title: "Guía" }));
  await send(env, "t2", "article.publish", articleData(1, { slug: "otro", title: "Otro cliente" }));
  assert.equal((await get(env, "blog.uno.test", "/viejo/")).status, 200);

  const up = await send(env, "t1", "article.update", articleData(1, { slug: "nuevo", title: "Guía", revision: 2 }));
  assert.equal(up.json.result, "applied");
  const moved = await get(env, "blog.uno.test", "/viejo/");
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get("location"), "https://blog.uno.test/nuevo/");
  assert.equal((await get(env, "blog.uno.test", "/nuevo/")).status, 200);

  // Otro cliente con el mismo slug viejo no hereda la redirección.
  assert.equal((await get(env, "blog.dos.test", "/viejo/")).status, 404);
});

test("redirecciones en cadena y artículo despublicado: no redirigen a un artículo caído", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1, { slug: "a", title: "Guía" }));
  await send(env, "t1", "article.update", articleData(1, { slug: "b", title: "Guía", revision: 2 }));
  await send(env, "t1", "article.update", articleData(1, { slug: "c", title: "Guía", revision: 3 }));
  assert.equal((await get(env, "blog.uno.test", "/a/")).headers.get("location"), "https://blog.uno.test/c/");
  assert.equal((await get(env, "blog.uno.test", "/b/")).headers.get("location"), "https://blog.uno.test/c/");
  await send(env, "t1", "article.unpublish", { source_article_id: articleData(1).source_article_id });
  assert.equal((await get(env, "blog.uno.test", "/a/")).status, 404);
});

test("volver a un slug antiguo retira su redirección y el artículo se sirve normal", async () => {
  const env = await setup();
  await send(env, "t1", "article.publish", articleData(1, { slug: "a", title: "Guía" }));
  await send(env, "t1", "article.update", articleData(1, { slug: "b", title: "Guía", revision: 2 }));
  await send(env, "t1", "article.update", articleData(1, { slug: "a", title: "Guía", revision: 3 }));
  assert.equal((await get(env, "blog.uno.test", "/a/")).status, 200);
  assert.equal((await get(env, "blog.uno.test", "/b/")).status, 301);
});

// ---- imágenes (media.upload + /media/<id>)
import { memoryMediaStore } from "./media";
const PNG_B64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]).toString("base64");

test("media.upload guarda la imagen y se sirve solo en el host de su cliente", async () => {
  const env = makeEnv({ media: memoryMediaStore() });
  await provisionTenant(env, "t1", "blog.uno.test", { name: "Uno" });
  await provisionTenant(env, "t2", "blog.dos.test", { name: "Dos" });
  const up = await send(env, "t1", "media.upload", { id: "cover-abc123", mime: "image/png", data_base64: PNG_B64, alt: "Portada" });
  assert.equal(up.status, 200);
  const ok = await get(env, "blog.uno.test", "/media/cover-abc123");
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/png");
  assert.match(ok.headers.get("cache-control") ?? "", /immutable/);
  assert.equal(ok.headers.get("x-content-type-options"), "nosniff");
  assert.equal(new Uint8Array(await ok.arrayBuffer()).length, 12);
  // Otro cliente no la ve ni puede reclamar el mismo id.
  assert.equal((await get(env, "blog.dos.test", "/media/cover-abc123")).status, 404);
  const steal = await send(env, "t2", "media.upload", { id: "cover-abc123", mime: "image/png", data_base64: PNG_B64 });
  assert.equal(steal.status, 409);
});

test("media.upload es idempotente y rechaza tipos no permitidos, base64 roto y falta de almacén", async () => {
  const env = makeEnv({ media: memoryMediaStore() });
  await provisionTenant(env, "t1", "blog.uno.test", { name: "Uno" });
  const a = await send(env, "t1", "media.upload", { id: "cover-x", mime: "image/png", data_base64: PNG_B64 }, "evt-fijo");
  const b = await send(env, "t1", "media.upload", { id: "cover-x", mime: "image/png", data_base64: PNG_B64 }, "evt-fijo");
  const c = await send(env, "t1", "media.upload", { id: "cover-x", mime: "image/png", data_base64: PNG_B64 }, "otro-evento");
  assert.deepEqual([a.json.result, b.json.result, c.status], ["applied", "duplicate", 200]);
  assert.equal((await send(env, "t1", "media.upload", { id: "cover-y", mime: "text/html", data_base64: PNG_B64 })).status, 400);
  assert.equal((await send(env, "t1", "media.upload", { id: "cover-z", mime: "image/png", data_base64: "%%%" })).status, 400);
  assert.equal((await send(env, "t1", "media.upload", { id: "Cover_Z", mime: "image/png", data_base64: PNG_B64 })).status, 400);
  const sinAlmacen = makeEnv();
  await provisionTenant(sinAlmacen, "t1", "blog.uno.test", { name: "Uno" });
  assert.equal((await send(sinAlmacen, "t1", "media.upload", { id: "cover-w", mime: "image/png", data_base64: PNG_B64 })).status, 503);
});

test("la portada subida aparece en el artículo", async () => {
  const env = makeEnv({ media: memoryMediaStore() });
  await provisionTenant(env, "t1", "blog.uno.test", { name: "Uno" });
  await send(env, "t1", "media.upload", { id: "cover-art1", mime: "image/png", data_base64: PNG_B64 });
  await send(env, "t1", "article.publish", articleData(1, { slug: "con-portada", cover_image_url: "https://blog.uno.test/media/cover-art1" }));
  const html = await (await get(env, "blog.uno.test", "/con-portada/")).text();
  assert.match(html, /\/media\/cover-art1/);
});
