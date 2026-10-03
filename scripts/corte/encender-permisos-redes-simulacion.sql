-- SIMULACIÓN: solo lectura. Pégalo en Supabase para contar cambios y excepciones.
WITH clasificado AS (
  SELECT u.*, CASE
    WHEN pg_input_is_valid(COALESCE(u."disabledModules", ''), 'jsonb') AND left(btrim(COALESCE(u."disabledModules", '')), 1) = '{' AND (u."disabledModules"::jsonb ->> 'oportunidades-redes') = 'disabled' THEN true
    WHEN pg_input_is_valid(COALESCE(u."disabledModules", ''), 'jsonb') AND left(btrim(COALESCE(u."disabledModules", '')), 1) = '[' AND (u."disabledModules"::jsonb ? 'oportunidades-redes') THEN true
    ELSE false END AS modulo_bloqueado
  FROM "User" u
)
SELECT count(*) FILTER (WHERE "role"::text <> 'admin' AND NOT modulo_bloqueado
  AND (NOT "allowInstagramPublishing" OR NOT "allowLinkedInPublishing" OR NOT "allowThreadsPublishing" OR NOT "allowFacebookPublishing" OR NOT "allowPinterestPublishing" OR NOT "allowTumblrPublishing" OR NOT "allowBlueskyPublishing" OR NOT "allowDevToPublishing" OR NOT "allowBloggerPublishing" OR NOT "allowGoogleBusinessPublishing")) AS usuarios_que_cambiarian,
 count(*) FILTER (WHERE "role"::text <> 'admin' AND modulo_bloqueado) AS modulo_desactivado_a_proposito
FROM clasificado;
