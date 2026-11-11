import { test } from "node:test";
import assert from "node:assert/strict";
import { blogChoiceView } from "./blog-ia-choice";

const none = { exists: false, publishable: false, hostname: null };

test("blog listo del Hub y publicable aquí", () => {
  assert.deepEqual(blogChoiceView({ state: "blog_ready", hostname: "a.com", reason: null }, { exists: true, publishable: true, hostname: "a.com" }), { kind: "ready", hostname: "a.com", detail: null });
});
test("listo en el Hub pero aún no vinculado aquí: pendiente", () => {
  assert.equal(blogChoiceView({ state: "blog_ready", hostname: "a.com", reason: null }, none).kind, "pending");
});
test("pendiente explica qué falta en español", () => {
  const v = blogChoiceView({ state: "blog_pending", hostname: null, reason: "dns_not_confirmed" }, none);
  assert.equal(v.kind, "pending");
  assert.match(v.detail ?? "", /dominio/);
});
test("sin blog y sin comprar", () => {
  assert.equal(blogChoiceView({ state: "no_blog", hostname: null, reason: null }, none).kind, "none");
  assert.equal(blogChoiceView({ state: "not_purchased", hostname: null, reason: null }, none).kind, "not_purchased");
});
test("sin respuesta del Hub se apoya en lo local", () => {
  assert.equal(blogChoiceView(null, none).kind, "unknown");
  assert.equal(blogChoiceView(null, { exists: true, publishable: false, hostname: "b.com" }).kind, "pending");
  assert.equal(blogChoiceView(null, { exists: true, publishable: true, hostname: "b.com" }).kind, "ready");
});
