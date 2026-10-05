# Integración reproducible de derechos contra una base local

Este procedimiento verifica el acceso por producto contra un Postgres local
desechable. **No usarlo con una URL de Supabase ni con una base compartida.**

## 1. Crear la base temporal

Requiere Docker y Node/npm:

```bash
export LC_ALL=en_US.UTF-8
docker run --rm --name seo-total-entitlements-test \
  -e POSTGRES_PASSWORD=local \
  -e POSTGRES_DB=seo_total_test \
  -p 55432:5432 -d postgres:16

export DATABASE_URL='postgresql://postgres:local@127.0.0.1:55432/seo_total_test'
export DIRECT_URL="$DATABASE_URL"
npm install
```

Esperar a que Postgres acepte conexiones antes del siguiente paso:

```bash
until pg_isready -h 127.0.0.1 -p 55432 -U postgres; do sleep 1; done
```

## 2. Montar el esquema de `main`

En esta base efímera sí se permite aceptar pérdidas, porque se destruye al
terminar y no contiene datos reales:

```bash
npx prisma db push --schema=packages/db/prisma/schema.prisma --accept-data-loss
npx prisma generate --schema=packages/db/prisma/schema.prisma
```

No usar estos flags fuera de la base desechable. En producción el schema no
declara columnas del HUB existentes en `User` y `db push` podría borrarlas.

## 3. Aplicar el SQL del Lote 1

```bash
npx prisma db execute \
  --schema=packages/db/prisma/schema.prisma \
  --file=packages/db/prisma/migrations/20261002000000_add_product_entitlements/migration.sql
```

Comprobar las tablas, enums, CHECK y RLS:

```bash
psql "$DATABASE_URL" -c '\dt "ProductEntitlement"*'
psql "$DATABASE_URL" -c '\dT "Product"'
psql "$DATABASE_URL" -c "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('ProductEntitlement','ProductEntitlementEvent');"
```

## 4. Matriz de derechos

Crear en la base temporal usuarios que cubran, como mínimo, estos casos y
ejecutar `hasProductAccess(userId, product)` para ambos productos:

| Caso | Artículos | Redes |
|---|---|---|
| administrador | permitido por `ADMIN` | permitido por `ADMIN` |
| entitlement `ACTIVE` | permitido | según aprobaciones de redes |
| entitlement `GRACE` con fecha futura | permitido | permitido si aplica la regla de redes |
| `GRACE` vencida | denegado | denegado si no hay regla legacy válida |
| `INACTIVE` | denegado | denegado |
| sin fila | conserva comportamiento legacy | depende de módulo maestro/aprobaciones |
| sin redes aprobadas | no aplica | denegado |
| usuario inexistente | denegado | denegado |

La llamada debe ejecutarse dentro del contexto de la app para usar el Prisma
generado y la misma implementación:

```bash
node --import tsx --input-type=module <<'EOF'
import { hasProductAccess } from './apps/web/src/lib/product-access.ts';
const userId = process.env.TEST_USER_ID;
if (!userId) throw new Error('Define TEST_USER_ID con un usuario creado solo en la base temporal');
for (const product of ['ARTICULOS', 'REDES']) {
  console.log(product, await hasProductAccess(userId, product));
}
EOF
```

Registrar cada resultado junto con el estado de la fila, aprobaciones legacy,
fecha usada y producto. Para probar gracia vencida de forma determinista, pasar
un `now` explícito a `hasProductAccess` después de preparar la fila.

## 5. Limpieza

No borrar nada de una base compartida. Al terminar la prueba local:

```bash
docker stop seo-total-entitlements-test
unset DATABASE_URL DIRECT_URL TEST_USER_ID
```

La integración de producción se hace manualmente en Supabase con el SQL
versionado y aprobación de Milton; este procedimiento local no autoriza ni
ejecuta ese cambio.
