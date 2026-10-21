import { test } from "node:test";
import assert from "node:assert/strict";
import { FixedWindowRateLimit } from "./security";
import { get, makeEnv, provisionTenant, send } from "./test-helpers";

test("el límite de ingestión bloquea por origen y libera la ventana", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  env.ingestRateLimit = new FixedWindowRateLimit(2, 60_000);
  assert.equal((await send(env, "t1", "blog.settings.update", { brand: { tagline: "uno" } })).status, 200);
  assert.equal((await send(env, "t1", "blog.settings.update", { brand: { tagline: "dos" } })).status, 200);
  assert.equal((await send(env, "t1", "blog.settings.update", { brand: { tagline: "tres" } })).status, 429);
  const limiter = new FixedWindowRateLimit(1, 1000);
  assert.equal(limiter.allow("x", 0), true);
  assert.equal(limiter.allow("x", 1), false);
  assert.ok(limiter.retryAfterSeconds(1) >= 1);
  assert.equal(limiter.allow("x", 1001), true);
});

test("las respuestas HTML llevan CSP y cabeceras anti-clickjacking", async () => {
  const env = makeEnv();
  await provisionTenant(env, "t1", "blog.uno.test");
  await send(env, "t1", "article.publish", { source_article_id: "a1", slug: "uno", title: "Uno", body_html: "<p>Contenido</p>", published_at: "2026-01-01T00:00:00Z" });
  const response = await get(env, "blog.uno.test", "/uno/");
  assert.equal(response.headers.get("content-security-policy")?.includes("script-src 'none'"), true);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});
