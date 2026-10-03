-- APLICAR: quita el indicador de «prueba de 7 días» a todos los usuarios que lo tienen y los deja gratis
-- (decisión de Milton). Guarda un respaldo para poder revertir. Pégalo UNA vez; si el respaldo ya existe, se detiene.
-- No toca a los administradores ni borra ningún dato de usuario.
DO $$
BEGIN
  IF to_regclass('public."_dia_cero_prueba_respaldo"') IS NOT NULL THEN
    RAISE EXCEPTION 'Ya existe el respaldo _dia_cero_prueba_respaldo: no se mezclan corridas. Revisa la corrida anterior.';
  END IF;
END $$;

BEGIN;
CREATE TABLE "_dia_cero_prueba_respaldo" AS
  SELECT "id", "isTrialSignup", "trialStartedAt", "trialUnlocked", CURRENT_TIMESTAMP AS "guardadoEn"
  FROM "User"
  WHERE "role"::text <> 'admin' AND ("isTrialSignup" = true OR "trialStartedAt" IS NOT NULL);

UPDATE "User" u
   SET "isTrialSignup" = false, "trialStartedAt" = NULL, "trialUnlocked" = true
 WHERE u."id" IN (SELECT "id" FROM "_dia_cero_prueba_respaldo");

-- Comprobación: debe dar 0 (nadie no-admin conserva el indicador).
SELECT count(*) AS usuarios_que_aun_conservan_el_indicador
  FROM "User" WHERE "role"::text <> 'admin' AND ("isTrialSignup" = true OR "trialStartedAt" IS NOT NULL);
COMMIT;
