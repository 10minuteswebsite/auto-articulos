-- Retira DEV.to de la configuración y publicación. Los datos históricos de la
-- integración dejan de estar disponibles junto con la funcionalidad.
DROP TABLE IF EXISTS "DevToIntegration";
ALTER TABLE "User" DROP COLUMN IF EXISTS "allowDevToPublishing";
