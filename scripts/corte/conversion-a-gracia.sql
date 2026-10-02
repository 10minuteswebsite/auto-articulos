-- CONVERSIÓN DE DERECHOS A GRACIA — SOLO REVISIÓN
--
-- NO EJECUTAR AUTOMÁTICAMENTE. Revisar la fecha, la selección y el resultado
-- de simulación con Milton antes de usarlo en una base desechable autorizada.
-- Uso con psql:
--   psql "$DATABASE_URL" -v cutoff_date="2026-10-15" \
--     -f scripts/corte/conversion-a-gracia.sql
--
-- La selección deliberadamente solo incluye filas ACTIVE de origen LEGACY,
-- sin graceUntil y de usuarios no administradores. Una concesión manual del
-- administrador debe tener source=ADMIN y queda fuera. No se toca ninguna
-- gracia existente ni ningún administrador.

\set ON_ERROR_STOP on

-- SIMULACIÓN PREVIA: revisar este número y las primeras filas antes de seguir.
WITH candidates AS (
  SELECT pe."id", pe."userId", pe."product", u."email", pe."source", pe."status"
  FROM "ProductEntitlement" pe
  JOIN "User" u ON u."id" = pe."userId"
  WHERE pe."status" = 'ACTIVE'
    AND pe."source" = 'LEGACY'
    AND pe."graceUntil" IS NULL
    AND u."role"::text <> 'admin'
)
SELECT count(*) AS rows_that_would_change FROM candidates;

WITH candidates AS (
  SELECT pe."id", pe."userId", pe."product", u."email"
  FROM "ProductEntitlement" pe
  JOIN "User" u ON u."id" = pe."userId"
  WHERE pe."status" = 'ACTIVE'
    AND pe."source" = 'LEGACY'
    AND pe."graceUntil" IS NULL
    AND u."role"::text <> 'admin'
)
SELECT * FROM candidates ORDER BY "email", "product" LIMIT 100;

-- CAMBIO ATÓMICO: si cualquier fila falla, no queda una conversión parcial.
BEGIN;

-- La tabla temporal captura exactamente las filas de ESTA transacción, evitando
-- contar cambios concurrentes o insertar eventos duplicados.
CREATE TEMP TABLE _converted_entitlements ON COMMIT DROP AS
WITH changed AS (
  UPDATE "ProductEntitlement" pe
  SET "status" = 'GRACE',
      "graceUntil" = (:'cutoff_date'::date + INTERVAL '5 days'),
      "updatedAt" = CURRENT_TIMESTAMP,
      "updatedBy" = 'cutover'
  FROM "User" u
  WHERE pe."userId" = u."id"
    AND pe."status" = 'ACTIVE'
    AND pe."source" = 'LEGACY'
    AND pe."graceUntil" IS NULL
    AND u."role"::text <> 'admin'
  RETURNING pe."userId", pe."product", pe."source", pe."graceUntil"
)
SELECT * FROM changed;

SELECT count(*) AS changed_rows FROM _converted_entitlements;

-- Un evento por cada fila convertida, dentro de la misma transacción.
INSERT INTO "ProductEntitlementEvent"
  ("id", "userId", "product", "fromStatus", "toStatus", "fromGraceUntil", "toGraceUntil", "source", "actorUserId", "reason")
SELECT
  'pee_' || replace(gen_random_uuid()::text, '-', ''),
  pe."userId", pe."product", 'ACTIVE', 'GRACE', NULL, pe."graceUntil",
  pe."source", NULL,
  'corte: gracia de 5 días desde ' || :'cutoff_date'
FROM _converted_entitlements pe;

COMMIT;

-- VERIFICACIÓN POSTERIOR (solo lectura).
SELECT "status", "source", count(*)
FROM "ProductEntitlement"
WHERE "updatedBy" = 'cutover'
GROUP BY "status", "source";
