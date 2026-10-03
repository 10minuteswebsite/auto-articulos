-- APLICAR: crea un respaldo nuevo y actualiza usuarios no-admin sin bloqueo explícito.
-- Si el respaldo ya existe, detente y revisa la corrida anterior antes de continuar.
DO $$ BEGIN
  IF to_regclass('_dia_cero_redes_respaldo') IS NOT NULL THEN RAISE EXCEPTION 'Ya existe _dia_cero_redes_respaldo; no se mezclan corridas'; END IF;
END $$;
BEGIN;
CREATE TABLE "_dia_cero_redes_respaldo" AS
WITH elegibles AS (SELECT u.* FROM "User" u WHERE u."role"::text <> 'admin' AND NOT (pg_input_is_valid(COALESCE(u."disabledModules", ''), 'jsonb') AND left(btrim(COALESCE(u."disabledModules", '')), 1) = '{' AND (u."disabledModules"::jsonb ->> 'oportunidades-redes') = 'disabled') AND NOT (pg_input_is_valid(COALESCE(u."disabledModules", ''), 'jsonb') AND left(btrim(COALESCE(u."disabledModules", '')), 1) = '[' AND (u."disabledModules"::jsonb ? 'oportunidades-redes')))
SELECT "id", "disabledModules", "allowInstagramPublishing", "allowLinkedInPublishing", "allowThreadsPublishing", "allowFacebookPublishing", "allowPinterestPublishing", "allowTumblrPublishing", "allowBlueskyPublishing", "allowDevToPublishing", "allowBloggerPublishing", "allowGoogleBusinessPublishing" FROM elegibles;
UPDATE "User" u SET "allowInstagramPublishing"=true, "allowLinkedInPublishing"=true, "allowThreadsPublishing"=true, "allowFacebookPublishing"=true, "allowPinterestPublishing"=true, "allowTumblrPublishing"=true, "allowBlueskyPublishing"=true, "allowDevToPublishing"=true, "allowBloggerPublishing"=true, "allowGoogleBusinessPublishing"=true WHERE u."id" IN (SELECT "id" FROM "_dia_cero_redes_respaldo");
COMMIT;
