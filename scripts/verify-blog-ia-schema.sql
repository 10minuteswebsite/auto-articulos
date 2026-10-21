-- Verificación de SOLO LECTURA tras aplicar las migraciones de BLOG IA.
-- Falla (con mensaje claro) si falta algo; no modifica nada.
DO $$
DECLARE
  missing text := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'PublishMethod' AND e.enumlabel = 'BLOG') THEN
    missing := missing || ' PublishMethod.BLOG;';
  END IF;
  IF to_regclass('"BlogIaBlog"') IS NULL THEN
    missing := missing || ' tabla BlogIaBlog;';
  ELSE
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BlogIaBlog' AND column_name = 'hostname' AND is_nullable = 'NO') THEN
      missing := missing || ' hostname sigue NOT NULL;';
    END IF;
    IF (SELECT count(*) FROM information_schema.columns WHERE table_name = 'BlogIaBlog'
          AND column_name IN ('config','provisionedAt','dnsVerified','tlsReady','activatedAt','lastError')) <> 6 THEN
      missing := missing || ' columnas del wizard incompletas;';
    END IF;
  END IF;
  IF missing <> '' THEN
    RAISE EXCEPTION 'BLOG IA: migración incompleta:%', missing;
  END IF;
END $$;
