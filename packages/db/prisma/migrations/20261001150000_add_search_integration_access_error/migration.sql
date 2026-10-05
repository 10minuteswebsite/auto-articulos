-- Registra el último error real al USAR una conexión de SearchIntegration
-- (no solo al enviar el sitemap, mismo patrón ya usado por
-- lastSitemapSyncError). Null = sin error reciente.
ALTER TABLE "SearchIntegration" ADD COLUMN "lastAccessErrorAt" TIMESTAMP(3);
ALTER TABLE "SearchIntegration" ADD COLUMN "lastAccessError" TEXT;
