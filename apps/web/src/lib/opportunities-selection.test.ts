import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("la publicación por selección no completa el lote con otros títulos", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/opportunities/execute-batch/route.ts"), "utf8");
  assert.match(source, /titleIds\?: string\[\]/);
  assert.match(source, /id: \{ in: titleIds \}/);
  assert.match(source, /selectedTitles\.length/);
  assert.match(source, /titles\.map\(\(title, order\)/);
});
