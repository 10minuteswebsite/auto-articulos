-- Solo tablas nuevas (aditivo, sin tocar datos existentes).
SET lock_timeout = '5s';
SET statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS "SiteArticleTitle" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "siteDomain" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL,
  "titleKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'sitemap',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteArticleTitle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SiteTitleSeed" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "siteDomain" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL,
  "titlesFound" INTEGER NOT NULL DEFAULT 0,
  "sitemapUrl" TEXT,
  "errorMessage" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteTitleSeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SiteArticleTitle_userId_siteDomain_titleKey_key" ON "SiteArticleTitle"("userId", "siteDomain", "titleKey");
CREATE INDEX IF NOT EXISTS "SiteArticleTitle_userId_siteDomain_idx" ON "SiteArticleTitle"("userId", "siteDomain");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteTitleSeed_userId_siteDomain_key" ON "SiteTitleSeed"("userId", "siteDomain");

DO $$ BEGIN
  ALTER TABLE "SiteArticleTitle" ADD CONSTRAINT "SiteArticleTitle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SiteTitleSeed" ADD CONSTRAINT "SiteTitleSeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
