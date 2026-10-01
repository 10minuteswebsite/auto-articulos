-- Derechos por producto (SEO Total Artículos / SEO Total Redes). Lote 1.
-- Seguro para producción: solo AÑADE tablas y filas. No modifica ni borra datos
-- existentes. Se escribe con IF NOT EXISTS / duplicate_object para que se
-- pueda reaplicar sin error (lección del incidente del 2026-09-08).

DO $$
BEGIN
  CREATE TYPE "Product" AS ENUM ('ARTICULOS', 'REDES');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'GRACE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "EntitlementSource" AS ENUM ('LEGACY', 'ADMIN', 'HUB');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProductEntitlement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "product" "Product" NOT NULL,
  "status" "EntitlementStatus" NOT NULL,
  "graceUntil" TIMESTAMP(3),
  "source" "EntitlementSource" NOT NULL DEFAULT 'LEGACY',
  "version" INTEGER NOT NULL DEFAULT 1,
  "externalRef" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,
  CONSTRAINT "ProductEntitlement_pkey" PRIMARY KEY ("id"),
  -- Una gracia sin fecha de fin es un dato incoherente: se impide desde la base.
  CONSTRAINT "ProductEntitlement_grace_requires_date"
    CHECK ("status" <> 'GRACE' OR "graceUntil" IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductEntitlement_userId_product_key"
  ON "ProductEntitlement" ("userId", "product");
CREATE INDEX IF NOT EXISTS "ProductEntitlement_product_status_idx"
  ON "ProductEntitlement" ("product", "status");
CREATE INDEX IF NOT EXISTS "ProductEntitlement_graceUntil_idx"
  ON "ProductEntitlement" ("graceUntil");

DO $$
BEGIN
  ALTER TABLE "ProductEntitlement"
    ADD CONSTRAINT "ProductEntitlement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProductEntitlementEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "product" "Product" NOT NULL,
  "fromStatus" "EntitlementStatus",
  "toStatus" "EntitlementStatus" NOT NULL,
  "fromGraceUntil" TIMESTAMP(3),
  "toGraceUntil" TIMESTAMP(3),
  "source" "EntitlementSource" NOT NULL,
  "actorUserId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductEntitlementEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductEntitlementEvent_userId_createdAt_idx"
  ON "ProductEntitlementEvent" ("userId", "createdAt");

ALTER TABLE "ProductEntitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductEntitlementEvent" ENABLE ROW LEVEL SECURITY;

-- Backfill: refleja EXACTAMENTE lo que cada cuenta tiene hoy, sin cambiar nada.
-- ARTICULOS: hoy lo tiene todo usuario existente.
INSERT INTO "ProductEntitlement"
  ("id", "userId", "product", "status", "graceUntil", "source", "version", "note", "createdAt", "updatedAt", "updatedBy")
SELECT
  'pe_' || replace(gen_random_uuid()::text, '-', ''),
  u."id", 'ARTICULOS', 'ACTIVE', NULL, 'LEGACY', 1,
  'backfill inicial (Lote 1)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'migration'
FROM "User" u
ON CONFLICT ("userId", "product") DO NOTHING;

-- REDES: hoy lo tienen los administradores y quien tenga al menos una red o blog
-- aprobado, con la MISMA lista que SOCIAL_PUBLISHING_PERMISSION_KEYS (social-access.ts;
-- Mastodon existe en el schema pero hoy no cuenta para esta regla). Las cuentas con el interruptor maestro «Habilitado» y sin redes no
-- reciben fila: la ausencia de fila ya conserva su acceso actual en el código.
INSERT INTO "ProductEntitlement"
  ("id", "userId", "product", "status", "graceUntil", "source", "version", "note", "createdAt", "updatedAt", "updatedBy")
SELECT
  'pe_' || replace(gen_random_uuid()::text, '-', ''),
  u."id", 'REDES', 'ACTIVE', NULL, 'LEGACY', 1,
  'backfill inicial (Lote 1)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'migration'
FROM "User" u
WHERE u."role"::text = 'admin'
   OR u."allowInstagramPublishing" = TRUE
   OR u."allowFacebookPublishing" = TRUE
   OR u."allowLinkedInPublishing" = TRUE
   OR u."allowThreadsPublishing" = TRUE
   OR u."allowPinterestPublishing" = TRUE
   OR u."allowTumblrPublishing" = TRUE
   OR u."allowBlueskyPublishing" = TRUE
   OR u."allowDevToPublishing" = TRUE
   OR u."allowBloggerPublishing" = TRUE
   OR u."allowGoogleBusinessPublishing" = TRUE
ON CONFLICT ("userId", "product") DO NOTHING;
