ALTER TABLE "Title"
  ADD COLUMN IF NOT EXISTS "publishedDestination" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedPublisherId" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedTenantId" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedHostname" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedCanonicalUrl" TEXT;
