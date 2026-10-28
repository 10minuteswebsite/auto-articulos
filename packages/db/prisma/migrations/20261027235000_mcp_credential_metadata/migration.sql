-- Solo metadatos nullable. No backfill, rotación ni modificación de hashes.
SET lock_timeout = '5s';
SET statement_timeout = '30s';
ALTER TABLE "McpApiToken"
  ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "credentialVersion" TEXT;
