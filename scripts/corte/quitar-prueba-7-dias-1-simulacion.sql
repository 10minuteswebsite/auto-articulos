-- SIMULACIÓN (solo lectura). Pégalo en el editor SQL de Supabase.
-- Cuenta cuántos usuarios hoy tienen el indicador de «prueba de 7 días» y quedarían gratis.
SELECT
  count(*) FILTER (WHERE "role"::text <> 'admin' AND ("isTrialSignup" = true OR "trialStartedAt" IS NOT NULL))  AS usuarios_con_indicador_de_prueba,
  count(*) FILTER (WHERE "role"::text <> 'admin' AND "isTrialSignup" = true AND "trialUnlocked" = false)        AS de_ellos_aun_sin_desbloquear,
  count(*) FILTER (WHERE "role"::text <> 'admin')                                                                AS usuarios_no_admin_en_total
FROM "User";
