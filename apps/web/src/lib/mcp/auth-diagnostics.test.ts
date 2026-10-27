import assert from "node:assert/strict";
import test from "node:test";
import { mcpAuthDiagnostic } from "./auth-diagnostics";

test("distinguishes missing, malformed and supported credential families", () => {
  assert.equal(mcpAuthDiagnostic(null, null).credential, "missing");
  assert.equal(mcpAuthDiagnostic("Basic private-value", null).credential, "unsupported_scheme");
  assert.equal(mcpAuthDiagnostic("Bearer", null).credential, "unsupported_scheme");
  assert.equal(mcpAuthDiagnostic("bEaReR sta_private-value", null).credential, "personal");
  assert.equal(mcpAuthDiagnostic("Bearer mcp.private-value", null).credential, "oauth");
  assert.equal(mcpAuthDiagnostic("Bearer surrogate-private-value", null).credential, "other_bearer");
});

test("diagnostic does not include credentials or an injected trace value", () => {
  for (const value of ["Bearer sta_private-value", "Bearer mcp.private-value", "Basic private-value"]) {
    const result = mcpAuthDiagnostic(value, "private-value");
    assert.equal(JSON.stringify(result).includes("private-value"), false);
    assert.deepEqual(Object.keys(result).sort(), ["credential", "ray_id"]);
    assert.equal(result.ray_id, null);
  }
});

test("accepts only the bounded Cloudflare request identifier", () => {
  assert.equal(mcpAuthDiagnostic(null, "a51337823ebe9d92").ray_id, "a51337823ebe9d92");
  assert.equal(mcpAuthDiagnostic(null, "a51337823ebe9d92-ATL").ray_id, "a51337823ebe9d92-ATL");
  assert.equal(mcpAuthDiagnostic(null, "a51337823ebe9d92\nprivate-value").ray_id, null);
});
