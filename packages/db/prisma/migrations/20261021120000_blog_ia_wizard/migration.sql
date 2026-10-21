-- BLOG IA · Fase 2 (wizard), 2026-10-21. Aditiva e idempotente: solo relaja
-- "hostname" a opcional (el registro se crea antes de elegir dominio) y añade
-- columnas con valor por defecto. Sin pérdida de datos. Aplicar ANTES o junto
-- con el código que las usa (incidente 2026-09), y siempre después de
-- 20261016120000_add_blog_ia.
ALTER TABLE "BlogIaBlog" ALTER COLUMN "hostname" DROP NOT NULL;
ALTER TABLE "BlogIaBlog" ADD COLUMN IF NOT EXISTS "config" JSONB;
ALTER TABLE "BlogIaBlog" ADD COLUMN IF NOT EXISTS "provisionedAt" TIMESTAMP(3);
ALTER TABLE "BlogIaBlog" ADD COLUMN IF NOT EXISTS "dnsVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BlogIaBlog" ADD COLUMN IF NOT EXISTS "tlsReady" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BlogIaBlog" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);
ALTER TABLE "BlogIaBlog" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
