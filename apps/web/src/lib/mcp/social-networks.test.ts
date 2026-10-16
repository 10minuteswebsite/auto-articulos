import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { networkLabel, pickPendingProposal, resolveNetworks, SOCIAL_NETWORKS } from "./social-networks";

test("sin nombres o con «todas» se eligen todas las redes", () => {
  assert.equal(resolveNetworks(undefined).all, true);
  assert.equal(resolveNetworks([]).networks.length, SOCIAL_NETWORKS.length);
  assert.equal(resolveNetworks(["Todas"]).all, true);
});

test("los nombres se entienden con mayúsculas, acentos y alias", () => {
  const { networks, unknown } = resolveNetworks(["Facebook", "LinkedIn", "Google Business", "IG"]);
  assert.deepEqual(networks.map((n) => n.key), ["facebook", "linkedin", "google-business", "instagram"]);
  assert.deepEqual(unknown, []);
  assert.equal(resolveNetworks("Threads, Pinterest").networks.length, 2);
});

test("un nombre inexistente (o X/Twitter, apagada) se reporta y no se ignora en silencio", () => {
  const { networks, unknown } = resolveNetworks(["facebook", "x", "myspace"]);
  assert.deepEqual(networks.map((n) => n.key), ["facebook"]);
  assert.deepEqual(unknown, ["x", "myspace"]);
});

test("cada red usa los identificadores reales que esperan las rutas de Redes", () => {
  const by = Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.key, n]));
  assert.equal(by.facebook.generateId, "facebook-page");
  assert.equal(by.instagram.platform, "instagram-post");
  assert.ok(by.instagram.platforms.includes("instagram-story"));
  assert.equal(by["google-business"].connectedKey, "googleBusiness");
  assert.equal(networkLabel("facebook-story"), "Facebook");
});

test("se publica la propuesta pendiente más reciente del formato principal de cada red", () => {
  const rows = [
    { id: "a", platform: "linkedin", status: "published", createdAt: "2026-10-14T10:00:00Z" },
    { id: "b", platform: "linkedin", status: "pending", createdAt: "2026-10-13T10:00:00Z" },
    { id: "c", platform: "linkedin", status: "pending", createdAt: "2026-10-14T09:00:00Z" },
    { id: "d", platform: "instagram-story", status: "pending", createdAt: "2026-10-14T09:00:00Z" },
  ];
  const linkedin = SOCIAL_NETWORKS.find((n) => n.key === "linkedin")!;
  const instagram = SOCIAL_NETWORKS.find((n) => n.key === "instagram")!;
  assert.equal(pickPendingProposal(rows, linkedin)?.id, "c");
  assert.equal(pickPendingProposal(rows, instagram), null);
});

test("publicar, cancelar y eliminar pasan siempre por comprobante de confirmación", () => {
  const source = readFileSync(join(__dirname, "tools", "social-actions.ts"), "utf8");
  for (const name of ["publicar_propuestas_sociales", "cancelar_propuesta_social", "eliminar_propuestas_sociales"]) {
    const start = source.indexOf(`name: "${name}"`);
    assert.ok(start > 0, `${name} existe`);
    const block = source.slice(start, source.indexOf("\n  {\n", start) > 0 ? source.indexOf("\n  {\n", start) : undefined);
    assert.match(block, /confirmOrPreview\(/, `${name} exige comprobante`);
  }
});

test("para reintentar se elige la propuesta en error más reciente de la red", () => {
  const rows = [
    { id: "a", platform: "blogger", status: "error", createdAt: "2026-10-14T10:00:00Z" },
    { id: "b", platform: "blogger", status: "error", createdAt: "2026-10-15T10:00:00Z" },
    { id: "c", platform: "blogger", status: "pending", createdAt: "2026-10-16T10:00:00Z" },
  ];
  const blogger = SOCIAL_NETWORKS.find((n) => n.key === "blogger")!;
  assert.equal(pickPendingProposal(rows, blogger, "error")?.id, "b");
  assert.equal(pickPendingProposal(rows, blogger)?.id, "c");
});

test("las herramientas sociales documentan sus argumentos, el comprobante, el monitoreo y el reintento", () => {
  const dir = join(__dirname, "tools");
  const social = readFileSync(join(dir, "social.ts"), "utf8");
  const actions = readFileSync(join(dir, "social-actions.ts"), "utf8");
  const single = readFileSync(join(dir, "actions.ts"), "utf8");
  assert.match(social, /ES la herramienta para monitorear una publicación social/);
  assert.match(social, /mismas propuestas que ve la persona en la pantalla «Oportunidades Redes»/);
  assert.match(actions, /Flujo con comprobante/);
  assert.match(actions, /reintentar=true/);
  assert.match(single, /REINTENTAR una que quedó en error/);
  const route = readFileSync(join(__dirname, "..", "..", "app", "api", "mcp", "route.ts"), "utf8");
  assert.match(route, /AUTOMATIZAR corridas diarias/);
  assert.match(route, /SEO TOTAL no tiene programador propio/);
});
