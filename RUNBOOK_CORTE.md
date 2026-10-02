# RUNBOOK — CORTE DE DERECHOS Y SEPARACIÓN SEO TOTAL

Este runbook es operativo y exige una aprobación explícita de Milton antes de
cualquier cambio en producción. No ejecutarlo automáticamente.

## 0. Bloqueo previo obligatorio

Producción contiene columnas del HUB en `User` que no están declaradas en el
`schema.prisma` actual: `hubUserId`, `hubAuth0Sub`, `hubSyncedAt`,
`hubSyncAttemptedAt` y `hubSyncError`. El workflow normal usa `prisma db push`
y puede intentar borrarlas. **No usar `accept_data_loss`, `force_sync` ni el
workflow por defecto contra producción.** Confirmar primero que los datos HUB
siguen presentes y que la capitanía de migración está autorizada.

## 1. Preflight local

Desde el commit exacto que se pretende publicar:

```bash
git status --short
git diff --check
npm run typecheck --workspace=apps/web
npm run build --workspace=apps/web
npm run test --workspace=apps/web
npm run build --workspace=apps/worker
npm run test --workspace=apps/worker
```

Si el entorno no permite IPC de `tsx`, registrar el bloqueo y ejecutar las
pruebas equivalentes en el entorno de verificación de Claude; no declarar una
prueba como aprobada sin evidencia.

## 2. Verificaciones de producción antes del corte

Con credenciales de solo lectura y una conexión aprobada a Supabase, comprobar:

```sql
SELECT count(*) FROM "User";
SELECT count(*) FROM "ProductEntitlement" WHERE "product" = 'ARTICULOS';
SELECT count(*) FROM "ProductEntitlement" WHERE "product" = 'REDES';
SELECT column_name FROM information_schema.columns
WHERE table_name = 'User' AND column_name IN
('hubUserId','hubAuth0Sub','hubSyncedAt','hubSyncAttemptedAt','hubSyncError');
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('ProductEntitlement','ProductEntitlementEvent');
```

Los resultados esperados documentados son 106 usuarios, 106 derechos de
Artículos, 9 de Redes, las cinco columnas HUB intactas y RLS activo en las dos
tablas nuevas.

## 3. Aplicación del SQL del Lote 1

La migración histórica completa no es reproducible desde cero por el incidente
de Tumblr. **No usar `prisma migrate deploy` ni `prisma db push` para este
corte.** La aplicación aprobada es manual, en Supabase, mediante el SQL
versionado exacto:

```bash
cat packages/db/prisma/migrations/20261002000000_add_product_entitlements/migration.sql
```

Milton debe pegar/revisar ese SQL en el editor SQL de Supabase, dentro de la
ventana aprobada, y conservar el resultado. Es aditivo e idempotente; no debe
editarse para eliminar columnas del HUB ni incluir `db push`.

## 4. Interruptor de aplicación

1. Mantener `product_enforcement = off` durante el despliegue.
2. Tras verificar logs y derechos reales, Milton puede cambiarlo a `shadow`.
3. Mantener Sombra al menos una semana y revisar falsos positivos.
4. Solo Milton puede decidir `enforce`; la pantalla administrativa muestra una
   advertencia y no debe activarse como parte de este runbook.

## 5. Reversión segura del Lote 1

Solo si Milton la aprueba y tras confirmar que ningún código depende de las
tablas nuevas:

```sql
DROP TABLE IF EXISTS "ProductEntitlementEvent";
DROP TABLE IF EXISTS "ProductEntitlement";
DROP TYPE IF EXISTS "EntitlementSource";
DROP TYPE IF EXISTS "EntitlementStatus";
DROP TYPE IF EXISTS "Product";
```

No usar `db push --accept-data-loss` como reversa. Después, comprobar que las
columnas HUB siguen intactas y que el login y `/api/me` responden normalmente.

## 6. Smoke test posterior

Ejecutar desde una máquina autorizada, sin secretos:

```bash
./scripts/smoke-production.sh https://DOMINIO-APROBADO
```

Guardar la salida junto con el commit, la hora, el operador y la aprobación.
