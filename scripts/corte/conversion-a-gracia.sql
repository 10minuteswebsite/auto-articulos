-- CONVERSIÓN DE DERECHOS A GRACIA — PASO 5 DEL GUION DEL CORTE (B5)
--
-- Convierte los derechos ACTIVE de los usuarios que NO han comprado a GRACE con
-- una gracia de 5 días a partir de la fecha de corte. Pensado para ejecutarse
-- UNA vez, a mano, por Milton, con la ventana de corte aprobada.
--
-- POR DEFECTO SOLO SIMULA: no cambia nada. Para aplicar hay que pedirlo
-- explícitamente con -v apply=yes, después de revisar la simulación.
--
--   Simulación (no cambia nada):
--     psql "$DATABASE_URL" -v cutoff_date="2026-10-15" \
--       -f scripts/corte/conversion-a-gracia.sql
--   Aplicar de verdad:
--     psql "$DATABASE_URL" -v cutoff_date="2026-10-15" -v apply=yes \
--       -f scripts/corte/conversion-a-gracia.sql
--
-- QUÉ SE CONVIERTE: solo filas ACTIVE de origen LEGACY (las del backfill), sin
-- graceUntil, de usuarios que NO son administradores. Quedan FUERA: los
-- administradores, toda concesión manual (source=ADMIN), cualquier gracia ya
-- existente y las filas INACTIVE. Es idempotente: ejecutarlo otra vez no cambia
-- nada porque lo ya convertido deja de ser ACTIVE.
--
-- Cada cambio sube `version` en 1 (contrato de ProductEntitlement) y deja una
-- fila en ProductEntitlementEvent, todo dentro de UNA transacción: si algo
-- falla no queda una conversión parcial.
--
-- Revisado y probado por Claude en una base desechable (2026-10-02): 8 filas de
-- prueba de todos los tipos, convierte exactamente las 3 que corresponden y
-- una segunda ejecución cambia 0. Autor original: Codex; correcciones: Claude
-- (incremento de version y compuerta apply).

\set ON_ERROR_STOP on

\if :{?cutoff_date}
\else
  \echo 'ERROR: falta -v cutoff_date=AAAA-MM-DD (fecha del corte).'
  \quit
\endif

-- ¿Se pidió aplicar? Solo con apply=yes exacto.
\if :{?apply}
\else
  \set apply no
\endif
SELECT (:'apply' = 'yes') AS apply_ok \gset

\echo '=== SIMULACIÓN (esto es lo que cambiaría) ==='
SELECT count(*) AS filas_que_cambiarian
FROM "ProductEntitlement" pe
JOIN "User" u ON u."id" = pe."userId"
WHERE pe."status" = 'ACTIVE'
  AND pe."source" = 'LEGACY'
  AND pe."graceUntil" IS NULL
  AND u."role"::text <> 'admin';

SELECT u."email", pe."product", pe."status", pe."source"
FROM "ProductEntitlement" pe
JOIN "User" u ON u."id" = pe."userId"
WHERE pe."status" = 'ACTIVE'
  AND pe."source" = 'LEGACY'
  AND pe."graceUntil" IS NULL
  AND u."role"::text <> 'admin'
ORDER BY u."email", pe."product"
LIMIT 100;

SELECT (:'cutoff_date'::date + INTERVAL '5 days') AS gracia_hasta_para_todos;

\if :apply_ok
  \echo '=== APLICANDO (apply=yes) ==='
  BEGIN;

  -- Captura exactamente las filas de ESTA transacción (sin contar cambios
  -- concurrentes ni insertar eventos duplicados).
  CREATE TEMP TABLE _converted_entitlements ON COMMIT DROP AS
  WITH changed AS (
    UPDATE "ProductEntitlement" pe
    SET "status" = 'GRACE',
        "graceUntil" = (:'cutoff_date'::date + INTERVAL '5 days'),
        "version" = pe."version" + 1,
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

  SELECT count(*) AS filas_convertidas FROM _converted_entitlements;

  INSERT INTO "ProductEntitlementEvent"
    ("id", "userId", "product", "fromStatus", "toStatus", "fromGraceUntil", "toGraceUntil", "source", "actorUserId", "reason")
  SELECT
    'pee_' || replace(gen_random_uuid()::text, '-', ''),
    c."userId", c."product", 'ACTIVE', 'GRACE', NULL, c."graceUntil",
    c."source", NULL,
    'corte: gracia de 5 días desde ' || :'cutoff_date'
  FROM _converted_entitlements c;

  COMMIT;

  \echo '=== VERIFICACIÓN POSTERIOR (solo lectura) ==='
  SELECT "status", "source", count(*) AS filas, max("version") AS version_max
  FROM "ProductEntitlement"
  WHERE "updatedBy" = 'cutover'
  GROUP BY "status", "source";
\else
  \echo '=== SOLO SIMULACIÓN: no se cambió nada. Para aplicar: añade -v apply=yes ==='
\endif
