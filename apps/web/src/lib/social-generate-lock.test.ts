import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Regresión (2026-10-10): `SELECT pg_advisory_xact_lock(...)` devuelve `void`;
// con $queryRawUnsafe Prisma lanza «Failed to deserialize column of type 'void'»
// y «Generar propuestas» respondía 500. Debe ejecutarse con $executeRawUnsafe.
test("generar propuestas: el bloqueo advisory no se lee con $queryRaw", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/social-opportunities/generate/route.ts"), "utf8");
  assert.ok(source.includes('$executeRawUnsafe("SELECT pg_advisory_xact_lock'));
  assert.equal(/\$queryRaw(Unsafe)?\(\s*["`]SELECT pg_advisory/.test(source), false);
});

test("generar propuestas: conserva descartes como memoria editorial", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/social-opportunities/generate/route.ts"), "utf8");
  assert.match(source, /const previousOpportunities = await prisma\.socialOpportunity\.findMany\(\{\s*where:/s);
  assert.doesNotMatch(source, /status:\s*\{\s*not:\s*"skipped"\s*\}/);
});

test("generar propuestas: no serializa una llamada de IA por red", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/social-opportunities/generate/route.ts"), "utf8");
  assert.match(source, /const generatedCopies = await Promise\.all\(copyJobs\)/);
  assert.match(source, /AbortSignal\.timeout\(OPENAI_TIMEOUT_MS\)/);
  assert.match(source, /export const maxDuration = 60/);
});

test("borrar pendientes: los marca descartados en vez de eliminarlos", () => {
  const source = readFileSync(join(process.cwd(), "src/app/api/social-opportunities/route.ts"), "utf8");
  assert.match(source, /if \(scope === "pending"\)[\s\S]*?socialOpportunity\.updateMany/s);
  assert.match(source, /Borrado por el usuario; no volver a ofrecer esta propuesta/);
});
