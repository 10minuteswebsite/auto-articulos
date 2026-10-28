import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("Redes verifica que la URL pública del artículo siga disponible", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/social-opportunities/generate/route.ts"), "utf8");
  assert.match(source, /async function isPublicArticleUrl/);
  assert.match(source, /response\.status >= 200 && response\.status < 300/);
  assert.match(source, /isPublicArticleUrl\(article\.articleUrl!/);
});
