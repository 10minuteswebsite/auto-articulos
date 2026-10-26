-- Decisión de Milton (2026-10-26): las redes nacen aprobadas. Un usuario nuevo del Hub ya no
-- queda con «No tienes permiso para publicar» (caso Juan Carvajal). Blogger y X quedan fuera.
ALTER TABLE "User"
  ALTER COLUMN "allowInstagramPublishing" SET DEFAULT true,
  ALTER COLUMN "allowFacebookPublishing" SET DEFAULT true,
  ALTER COLUMN "allowLinkedInPublishing" SET DEFAULT true,
  ALTER COLUMN "allowThreadsPublishing" SET DEFAULT true,
  ALTER COLUMN "allowPinterestPublishing" SET DEFAULT true,
  ALTER COLUMN "allowTumblrPublishing" SET DEFAULT true,
  ALTER COLUMN "allowBlueskyPublishing" SET DEFAULT true,
  ALTER COLUMN "allowGoogleBusinessPublishing" SET DEFAULT true;

-- Relleno de las cuentas que ya existen.
UPDATE "User"
SET "allowInstagramPublishing" = true,
    "allowFacebookPublishing" = true,
    "allowLinkedInPublishing" = true,
    "allowThreadsPublishing" = true,
    "allowPinterestPublishing" = true,
    "allowTumblrPublishing" = true,
    "allowBlueskyPublishing" = true,
    "allowGoogleBusinessPublishing" = true
WHERE NOT ("allowInstagramPublishing" AND "allowFacebookPublishing" AND "allowLinkedInPublishing"
  AND "allowThreadsPublishing" AND "allowPinterestPublishing" AND "allowTumblrPublishing"
  AND "allowBlueskyPublishing" AND "allowGoogleBusinessPublishing");
