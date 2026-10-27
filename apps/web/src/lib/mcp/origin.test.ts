import assert from "node:assert/strict";
import test from "node:test";
import { isMcpOriginAllowed } from "./origin";

const own = "https://redes.lasolucionweb.net";

test("sin Origin o con el propio Origin se permite", () => {
  assert.equal(isMcpOriginAllowed(null, own, null), true);
  assert.equal(isMcpOriginAllowed(own, own, null), true);
});

test("Origin ajeno sin Bearer se rechaza", () => {
  assert.equal(isMcpOriginAllowed("https://evil.example", own, null), false);
  assert.equal(isMcpOriginAllowed("https://evil.example", own, "Basic abc"), false);
});

test("Origin ajeno con Bearer pasa a la verificación del token (caso Meta MUSE)", () => {
  assert.equal(isMcpOriginAllowed("https://www.meta.ai", own, "Bearer sta_abc"), true);
});
