-- REVERSA: devuelve a cada usuario el indicador de prueba que tenía (desde el respaldo).
-- Después puedes borrar el respaldo a mano: DROP TABLE "_dia_cero_prueba_respaldo";
BEGIN;
UPDATE "User" u
   SET "isTrialSignup" = b."isTrialSignup", "trialStartedAt" = b."trialStartedAt", "trialUnlocked" = b."trialUnlocked"
  FROM "_dia_cero_prueba_respaldo" b
 WHERE b."id" = u."id";
COMMIT;
