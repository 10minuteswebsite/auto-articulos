# Runbook de aplicación del Lote 1 — derechos por producto

Este documento prepara la aplicación de `20261002000000_add_product_entitlements`.
No ejecuta migraciones, no reclama capitanía y no autoriza producción.

## Precondiciones y control

1. Milton debe aprobar explícitamente el PR del Lote 1 y la ventana de producción.
2. Verificar que el PR contiene `schema.prisma`, la migración y el código compatible.
3. Ejecutar `bash scripts/migration-coordinator.sh status`.
4. Reclamar la capitanía solo cuando el lote esté listo para aplicarse. Nadie más ejecuta Prisma mientras esté activa.
5. Hacer respaldo/verificar el punto de recuperación de la base y confirmar `DATABASE_URL`/`DIRECT_URL` sin imprimir secretos.

## Advertencia sobre el workflow real

`.github/workflows/migrate.yml` se llama «Migración manual de base de datos», pero su ruta normal ejecuta:

```bash
MIGRATION_DATABASE_URL="${DATABASE_URL/:6543/:5432}"
MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL/?pgbouncer=true/}"
DATABASE_URL="$MIGRATION_DATABASE_URL" DIRECT_URL="$MIGRATION_DATABASE_URL" \
  npx prisma db push --schema=packages/db/prisma/schema.prisma
```

No ejecuta `prisma migrate deploy` ni lee automáticamente el SQL versionado. Para este lote, la ruta aprobada del workflow debe ser la segunda alternativa: añadir/usar un input `safe_product_entitlements` que ejecute únicamente `prisma db execute --file packages/db/prisma/migrations/20261002000000_add_product_entitlements/migration.sql`, con Session pooler. **No se debe afirmar que la ruta normal de `db push` aplica esa migración SQL.**

- añadir la ruta `safe_product_entitlements` al workflow, siguiendo el patrón de las rutas `safe_*` existentes, y hacer que ejecute solo el SQL versionado; `migrate deploy` no es viable mientras el historial contenga la migración histórica de Tumblr que falla desde una base vacía.

No activar `force_sync` ni `accept_data_loss` para este lote sin una decisión específica: la migración añade tablas, tipos, índices, FK, RLS y backfill, y el workflow actual tiene otras rutas potencialmente destructivas.

## Orden aprobado cuando la ruta esté decidida

1. Confirmar que la capitanía está reclamada por una sola persona.
2. Aplicar primero schema/migración del Lote 1, antes o en el mismo cambio coordinado que expone el código que consulta las tablas.
3. Generar Prisma en el mismo job (`npx prisma generate --schema=packages/db/prisma/schema.prisma`).
4. Aplicar la migración usando Session pooler (`:5432`, sin `pgbouncer=true`).
5. Ejecutar el paso de RLS del workflow (`npm run enforce-rls --workspace=packages/db`).
6. Verificar el resultado antes de desplegar la aplicación.

## Consultas de verificación posteriores

Ejecutar con una conexión de solo lectura o dentro del canal aprobado, sin pegar secretos:

```sql
SELECT to_regclass('public."ProductEntitlement"') AS entitlement_table,
       to_regclass('public."ProductEntitlementEvent"') AS event_table;

SELECT typname FROM pg_type
WHERE typname IN ('Product', 'EntitlementStatus', 'EntitlementSource')
ORDER BY typname;

SELECT product, status, count(*)
FROM "ProductEntitlement"
GROUP BY product, status
ORDER BY product, status;

SELECT count(*) AS users_without_articles
FROM "User" u
LEFT JOIN "ProductEntitlement" e
  ON e."userId" = u.id AND e.product = 'ARTICULOS'
WHERE e.id IS NULL;

SELECT count(*) AS invalid_grace_rows
FROM "ProductEntitlement"
WHERE status = 'GRACE' AND "graceUntil" IS NULL;

SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('ProductEntitlement', 'ProductEntitlementEvent');
```

Esperado: ambas tablas existen; los tres enums existen; Artículos tiene backfill para usuarios existentes; no hay gracias inválidas; RLS figura activo. La ausencia de una fila de Redes puede ser válida y conserva el comportamiento legacy según el contrato.

## Verificación de aplicación

- `/api/me` responde y conserva todos los campos anteriores; `products` puede ser `null` solo si la tabla aún no está disponible.
- La creación de una cuenta no falla por `ensureDefaultEntitlements`.
- Administración → Usuarios puede leer y editar derechos solo para administradores.
- El interruptor `product_enforcement` permanece en `off`.
- El worker no bloquea publicaciones mientras esté en `off`; `shadow` solo se activa tras una decisión y auditoría separadas.
- Ejecutar checks del PR y revisar logs; no activar `enforce` ni desplegar sin Puerta 2 de Milton.

## Reversa y fallo

Detener el despliegue de código si falla una consulta de verificación. Para este lote, la reversa SQL aprobada es simple: eliminar las dos tablas nuevas (`ProductEntitlementEvent`, `ProductEntitlement`) y los tres tipos nuevos (`EntitlementSource`, `EntitlementStatus`, `Product`), únicamente si la verificación confirma que no contienen datos posteriores que deban conservarse. No usar `db push --accept-data-loss` como reversa. El capitán y Milton deben revisar el orden y el resultado antes de ejecutarlo. Liberar la capitanía solo después de dejar el resultado y el estado de producción documentados.
