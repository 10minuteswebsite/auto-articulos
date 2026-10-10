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
