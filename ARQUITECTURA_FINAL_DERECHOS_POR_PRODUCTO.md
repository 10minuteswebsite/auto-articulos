# Arquitectura final — derechos por producto (as built)

Documento de mantenimiento. Describe lo que existe en `main` y las rutas
verificadas, no una propuesta futura.

## Fuente de datos y modelo

- `packages/db/prisma/schema.prisma`: `User.productEntitlements` relaciona la
  cuenta con `ProductEntitlement`; `ProductEntitlementEvent` conserva la
  bitácora. Los enums `Product`, `EntitlementStatus` y `EntitlementSource`
  distinguen Artículos/Redes, estado y origen.
- `packages/db/prisma/migrations/20261002000000_add_product_entitlements/migration.sql`:
  crea enums, tablas, índices, CHECK de gracia y RLS; hace backfill idempotente.
  En producción se aplicó manualmente en Supabase. No usar `db push` sobre la
  base real porque allí existen columnas HUB que el schema actual no declara.
- `packages/shared/src/product-access-core.ts`: reglas puras compartidas:
  `PRODUCTS`, tipos, `parseEnforcementMode`, `evaluateProductAccess` y la
  extracción legacy de acceso a Redes. No consulta base ni cookies.

## Lectura y decisión en la web

- `apps/web/src/lib/product-access.ts`: consulta la cuenta y sus derechos,
  combina entitlements con la regla legacy de Redes y devuelve
  `ProductAccess`. `getProductsSummary` es tolerante a fallo para `/api/me`.
- `apps/web/src/lib/product-enforcement.ts`: lee/escribe el setting
  `product_enforcement`, con modos `off`, `shadow` y `enforce`; cachea solo el
  modo durante 30 segundos; fallos de lectura vuelven a `off`.
- `apps/web/src/lib/product-enforcement-transition.ts`: regla pura para
  permitir transiciones del interruptor. La pantalla exige pasar por Sombra y
  la palabra de confirmación para Activar.
- `apps/web/src/lib/require-product-access.ts`: frontera API. En `off` no
  bloquea; en `shadow` registra `[product-access] product access denied`; en
  `enforce` devuelve 403; un error técnico permite la operación y se registra.
  Está aplicada a 24 rutas de Artículos y Redes.
- `apps/web/src/app/api/me/route.ts`: expone `products` y
  `productEnforcement` como información de sesión, sin permitir cambios.

## Worker

- `apps/worker/src/product-access.ts`: lee el modo y usa el núcleo compartido;
  no duplica la evaluación.
- `apps/worker/src/socialPublish.ts`: comprueba REDES justo antes de iniciar
  cada destino social. En `off` no cambia comportamiento; en `shadow` registra
  lo que habría bloqueado; `enforce` queda apagado y nunca se activa por el
  worker.

## Administración

- `apps/web/src/app/api/admin/users/[id]/entitlements/route.ts`: solo
  administradores; GET devuelve derechos, acceso efectivo y los últimos 20
  eventos; PUT cambia estado/gracia y registra cada transición.
- `apps/web/src/app/dashboard/usuarios/UserProductsPanel.tsx`: botones de
  activar/desactivar/gracia y el historial plegable de eventos.
- `apps/web/src/app/api/admin/product-enforcement/route.ts`: GET/PUT solo para
  administradores, valida los tres modos y deja audit log.
- `apps/web/src/app/dashboard/usuarios/ProductEnforcementPanel.tsx`: control
  visual con advertencia; «Activo» requiere salvaguardas y revisión previa.

## Vista por productos

- `apps/web/src/lib/product-routes.ts`: asigna rutas a Artículos, Redes,
  Compartido o Administración y define el módulo opt-in `vista-productos`.
- `apps/web/src/components/ProductHome.tsx` y
  `apps/web/src/components/ProductAccessGuard.tsx`: índices y avisos de acceso
  sin cambiar URLs existentes.
- `apps/web/src/app/dashboard/mi-acceso/page.tsx`: vista solo lectura de los
  dos productos, disponible solo con la vista por productos activa.
- `apps/web/src/lib/mi-acceso-status.ts`: traducción pura de estados para la
  interfaz; sus pruebas cubren Activo, Gracia, Sin acceso y Sin registro.

## Límites deliberados

OAuth, MCP, OAuth2, `.well-known`, autenticación, webhooks y callbacks quedan
fuera de `requireProductAccess`. El interruptor está apagado en producción.
Nadie debe activar `enforce`, ejecutar `accept_data_loss`/`force_sync` ni aplicar
el schema por defecto contra producción sin autorización y runbook aprobado.
