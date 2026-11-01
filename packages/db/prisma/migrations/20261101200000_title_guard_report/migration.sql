-- Guardia de ángulos, Fase 2: registro de lo que la guardia decidiría o decidió.
-- SOLO una tabla nueva (aditivo, no toca nada existente). Idempotente: se puede repetir.
-- Si la tabla falta, la guardia lo ignora y todo funciona igual que hoy.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS "TitleGuardReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestId" TEXT,
  "categoryId" TEXT,
  "categoryName" TEXT NOT NULL DEFAULT '',
  "siteDomain" TEXT NOT NULL DEFAULT '',
  "mode" TEXT NOT NULL,
  "candidates" INTEGER NOT NULL DEFAULT 0,
  "legacyTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "deliveredTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "hardDropped" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "nClean" INTEGER NOT NULL DEFAULT 0,
  "nSimilar" INTEGER NOT NULL DEFAULT 0,
  "completedWithNotes" INTEGER NOT NULL DEFAULT 0,
  "judgeUsed" BOOLEAN NOT NULL DEFAULT false,
  "judgeModel" TEXT,
  "judgePairs" INTEGER NOT NULL DEFAULT 0,
  "judgeMs" INTEGER,
  "details" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TitleGuardReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TitleGuardReport_userId_createdAt_idx" ON "TitleGuardReport"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TitleGuardReport_createdAt_idx" ON "TitleGuardReport"("createdAt");

DO $$ BEGIN
  ALTER TABLE "TitleGuardReport" ADD CONSTRAINT "TitleGuardReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mismo criterio que el resto del proyecto: tablas nuevas con RLS activo.
ALTER TABLE "TitleGuardReport" ENABLE ROW LEVEL SECURITY;
