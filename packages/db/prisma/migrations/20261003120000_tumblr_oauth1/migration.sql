-- Tumblr's existing application is OAuth1. Store the token secret required
-- to sign API requests and make blog selection explicit after authorization.
ALTER TABLE "TumblrIntegration"
  ADD COLUMN IF NOT EXISTS "accessTokenSecretEncrypted" TEXT;

ALTER TABLE "TumblrIntegration"
  ADD COLUMN IF NOT EXISTS "blogSelectionPending" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "ProductUpdate" ("id", "date", "title", "category", "summary", "example", "modulePath", "sourceCommit")
VALUES (
  'tumblr-oauth1-20261003',
  '2026-10-03T00:00:00.000Z',
  'Tumblr conectado con OAuth1',
  'nuevas-herramientas',
  'La conexión de Tumblr utiliza el protocolo OAuth1 compatible con la aplicación existente y exige elegir el blog antes de publicar.',
  'En Configuración → Conexiones → Tumblr se autoriza la cuenta, se elige el blog y se prueba la conexión.',
  '/dashboard/configuracion/conexiones',
  'tumblr-oauth1-20261003'
)
ON CONFLICT ("sourceCommit") DO NOTHING;
