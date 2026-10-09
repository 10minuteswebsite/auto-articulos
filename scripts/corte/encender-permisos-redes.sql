-- DÍA CERO REDES — seguro por defecto. Simula; aplicar solo con -v apply=yes.
-- Producción: pegar este SQL en Supabase. El script TS es para staging/local.
-- Reversa: SELECT ... desde "_dia_cero_redes_respaldo" y UPDATE "User".
\set ON_ERROR_STOP on
\if :{?apply}
\else
  \set apply no
\endif
SELECT (:'apply' = 'yes') AS apply_ok \gset

SELECT count(*) FILTER (WHERE u."role"::text <> 'admin' AND COALESCE((u."disabledModules"::jsonb ->> 'oportunidades-redes'), '') = 'disabled') AS modulo_desactivado_expresamente,
       count(*) FILTER (WHERE u."role"::text <> 'admin' AND COALESCE((u."disabledModules"::jsonb ->> 'oportunidades-redes'), '') <> 'disabled') AS usuarios_que_cambiarian
FROM "User" u;

\if :apply_ok
BEGIN;
CREATE TABLE IF NOT EXISTS "_dia_cero_redes_respaldo" AS
SELECT u."id", u."disabledModules", u."allowInstagramPublishing", u."allowLinkedInPublishing",
 u."allowThreadsPublishing", u."allowFacebookPublishing", u."allowPinterestPublishing",
 u."allowTumblrPublishing", u."allowBlueskyPublishing", u."allowDevToPublishing",
 u."allowBloggerPublishing", u."allowGoogleBusinessPublishing", CURRENT_TIMESTAMP AS "savedAt"
FROM "User" u WHERE false;
INSERT INTO "_dia_cero_redes_respaldo"
SELECT u."id", u."disabledModules", u."allowInstagramPublishing", u."allowLinkedInPublishing",
 u."allowThreadsPublishing", u."allowFacebookPublishing", u."allowPinterestPublishing",
 u."allowTumblrPublishing", u."allowBlueskyPublishing", u."allowDevToPublishing",
 u."allowBloggerPublishing", u."allowGoogleBusinessPublishing", CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role"::text <> 'admin'
  AND COALESCE((u."disabledModules"::jsonb ->> 'oportunidades-redes'), '') <> 'disabled';
UPDATE "User" u SET "allowInstagramPublishing"=true, "allowLinkedInPublishing"=true,
 "allowThreadsPublishing"=true, "allowFacebookPublishing"=true, "allowPinterestPublishing"=true,
 "allowTumblrPublishing"=true, "allowBlueskyPublishing"=true, "allowDevToPublishing"=true,
 "allowBloggerPublishing"=true, "allowGoogleBusinessPublishing"=true
WHERE u."role"::text <> 'admin'
  AND COALESCE((u."disabledModules"::jsonb ->> 'oportunidades-redes'), '') <> 'disabled';
COMMIT;
\else
\echo 'SIMULACIÓN: no se cambió nada. Para aplicar añade -v apply=yes.'
\endif
