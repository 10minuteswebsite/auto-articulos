import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Guardia de CUIDADO_DE_TOKENS.md: toda llamada a una API de pago debe estar registrada allí.
const PAID_HOSTS = /api\.openai\.com|fal\.run|backend\.composio\.dev|api\.postpeer\.dev/;
const PAID_API_FILES = new Set([
  "apps/web/src/app/api/assistant/chat/route.ts",
  "apps/web/src/app/api/social-opportunities/generate/route.ts",
  "apps/web/src/lib/composio.ts",
  "apps/web/src/lib/opportunity-analysis.ts",
  "apps/web/src/lib/title-generation.ts",
  "apps/worker/src/aiImageGenerator.ts",
  "apps/worker/src/automation/generateCustomArticle.ts",
  "apps/worker/src/businessProfilePublish.ts",
  "apps/worker/src/faqPrompt.ts",
  "apps/worker/src/imagePrompt.ts",
  "apps/worker/src/socialPublish.ts",
  "apps/worker/src/threadsIndexing.ts",
  "apps/worker/src/translateText.ts",
  "packages/shared/src/composio.ts",
  "packages/shared/src/postpeer-api.ts",
  "packages/shared/src/social-image.ts",
]);

test("toda llamada a una API de pago está registrada en CUIDADO_DE_TOKENS.md", () => {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const files = execFileSync("git", ["ls-files", "apps", "packages"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));
  const found = files.filter((file) => PAID_HOSTS.test(readFileSync(path.join(root, file), "utf8")));
  const unregistered = found.filter((file) => !PAID_API_FILES.has(file));
  assert.deepEqual(
    unregistered,
    [],
    `Llamada de pago sin registrar. Lee CUIDADO_DE_TOKENS.md, agrega el archivo al inventario y a PAID_API_FILES: ${unregistered.join(", ")}`,
  );
  const doc = readFileSync(path.join(root, "CUIDADO_DE_TOKENS.md"), "utf8");
  for (const file of PAID_API_FILES) assert.ok(doc.includes(file), `${file} falta en el inventario`);
});
