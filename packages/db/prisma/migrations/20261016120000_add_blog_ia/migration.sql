-- BLOG IA (2026-10-16). Aditiva e idempotente: ninguna cuenta existente cambia
-- (todas siguen con publishMethod = BROWSER). Sin pérdida de datos.
ALTER TYPE "PublishMethod" ADD VALUE IF NOT EXISTS 'BLOG';

CREATE TABLE IF NOT EXISTS "BlogIaBlog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft_setup',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogIaBlog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlogIaBlog_userId_key" ON "BlogIaBlog" ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "BlogIaBlog_tenantId_key" ON "BlogIaBlog" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "BlogIaBlog_hostname_key" ON "BlogIaBlog" ("hostname");

DO $$
BEGIN
  ALTER TABLE "BlogIaBlog"
    ADD CONSTRAINT "BlogIaBlog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
