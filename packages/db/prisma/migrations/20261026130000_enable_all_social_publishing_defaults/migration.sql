-- Todas las redes publicables nacen activadas. La conexión OAuth/API sigue
-- siendo necesaria y Administración puede apagar una red explícitamente.
ALTER TABLE "User"
  ALTER COLUMN "allowMastodonPublishing" SET DEFAULT true,
  ALTER COLUMN "allowBloggerPublishing" SET DEFAULT true;

UPDATE "User"
SET "allowMastodonPublishing" = true,
    "allowBloggerPublishing" = true
WHERE NOT ("allowMastodonPublishing" AND "allowBloggerPublishing");
