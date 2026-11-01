-- Historial forense de Artículos (Fases 2 y 3). SOLO tablas nuevas, aditivo:
-- no toca ninguna tabla ni columna existente. Idempotente (se puede repetir).
-- Nada del código existente depende de estas tablas: si faltan, todo funciona igual.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- Títulos descartados o borrados (solo inserciones, nunca se edita).
CREATE TABLE IF NOT EXISTS "ArticleTitleDiscard" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "siteDomain" TEXT NOT NULL DEFAULT '',
  "categoryId" TEXT,
  "categoryName" TEXT NOT NULL DEFAULT '',
  "titleText" TEXT NOT NULL,
  "titleKey" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL,
  "titleRationale" TEXT,
  "groupRationale" TEXT,
  "impressions" DOUBLE PRECISION,
  "clicks" DOUBLE PRECISION,
  "originCreatedAt" TIMESTAMP(3),
  "actor" TEXT NOT NULL DEFAULT 'user',
  "discardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleTitleDiscard_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ArticleTitleDiscard_userId_discardedAt_idx" ON "ArticleTitleDiscard"("userId", "discardedAt");
CREATE INDEX IF NOT EXISTS "ArticleTitleDiscard_userId_titleKey_idx" ON "ArticleTitleDiscard"("userId", "titleKey");

-- Razonamiento de origen de un título (se llena al convertir una oportunidad).
CREATE TABLE IF NOT EXISTS "TitleOrigin" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "titleId" TEXT NOT NULL,
  "groupRationale" TEXT,
  "titleRationale" TEXT,
  "impressions" DOUBLE PRECISION,
  "clicks" DOUBLE PRECISION,
  "evidenceSnapshot" JSONB,
  "guardResult" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TitleOrigin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TitleOrigin_titleId_key" ON "TitleOrigin"("titleId");
CREATE INDEX IF NOT EXISTS "TitleOrigin_userId_idx" ON "TitleOrigin"("userId");

-- Explicaciones ejecutivas pedidas por el usuario (una fila por solicitud).
CREATE TABLE IF NOT EXISTS "TitleExplanation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "titleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "summary" TEXT NOT NULL DEFAULT '',
  "evidenceUsed" JSONB,
  "model" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ok',
  "errorMessage" TEXT,
  CONSTRAINT "TitleExplanation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TitleExplanation_userId_runId_requestedAt_idx" ON "TitleExplanation"("userId", "runId", "requestedAt");

DO $$ BEGIN
  ALTER TABLE "ArticleTitleDiscard" ADD CONSTRAINT "ArticleTitleDiscard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TitleOrigin" ADD CONSTRAINT "TitleOrigin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TitleExplanation" ADD CONSTRAINT "TitleExplanation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mismo criterio que el resto del proyecto: tablas nuevas con RLS activo.
ALTER TABLE "ArticleTitleDiscard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TitleOrigin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TitleExplanation" ENABLE ROW LEVEL SECURITY;
