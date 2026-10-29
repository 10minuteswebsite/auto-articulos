import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const file of [
  "src/app/api/opportunities/execute-batch/route.ts",
  "src/app/api/opportunities/execute-all/route.ts",
]) {
  test(`${file} hereda la preferencia de no indexar`, () => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.match(source, /SELECT [^`]*disableIndexing[^`]*FROM [^`]*User/);
    assert.match(source, /typeof disableIndexing === "boolean"/);
    assert.match(source, /effectiveDisableIndexing/);
  });
}
