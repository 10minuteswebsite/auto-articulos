# AUDITORÍAS — LOTE 1 «SEPARACION SEO TOTAL» (derechos por producto, base invisible)

Fecha: 2026-10-01 · Autor: Claude (control de proyecto) · Rama: `claude/lote1-product-entitlements`
Protocolo: Protocolo de No Destrucción, §3 (tres auditorías completas e independientes antes de producción).
**Estado: PREPARADO PARA REVISIÓN CRUZADA (Codex) Y AUTORIZACIÓN DE MILTON. No se ha desplegado ni aplicado la migración.**

## Qué cambia este lote

- Tablas nuevas `ProductEntitlement` y `ProductEntitlementEvent` (+ 3 enums) con migración **aditiva** `20261002000000_add_product_entitlements` y backfill que refleja lo que cada cuenta tiene hoy.
- Núcleo puro de acceso en `packages/shared/src/product-access-core.ts` (lo comparten web y worker) y lectura con base de datos en `apps/web/src/lib/product-access.ts`.
- Interruptor de aplicación `product_enforcement` (`off` por defecto): **nada bloquea a nadie**.
- API de administración `api/admin/users/[id]/entitlements` y panel «Productos» en la ficha de usuario.
- `GET /api/me` gana un bloque `products` (aditivo y a prueba de fallos).
- Alta de cuentas (admin y `trial-signup`) crea la fila de Artículos «de mejor esfuerzo».
- `PRODUCT_NAMES` en `menu-names.ts` y una frase en el manual de usuario.
- **Ningún guard existente se modificó**: ninguna ruta, menú ni módulo consulta todavía `hasProductAccess`, salvo la API de administración y `/api/me`.

## Auditoría 1 — Funcional (¿hace lo que debe?)

| Prueba | Resultado |
|---|---|
| 21 pruebas unitarias nuevas (matriz de `evaluateProductAccess`, interruptor, nombres) | 21/21 ✔ |
| Migración aplicada sobre el esquema actual de `main` en un Postgres 16 desechable, con 7 usuarios de prueba (admin, normal, red aprobada, solo Mastodon, maestro «Habilitado», maestro «Deshabilitado», `disabledModules` en formato antiguo) | ✔ backfill = 7 filas de Artículos y 3 de Redes; Mastodon **no** cuenta (igual que `SOCIAL_PUBLISHING_PERMISSION_KEYS`) |
| Reaplicar la migración (idempotencia) | ✔ sin error, mismas filas |
| CHECK «GRACE exige fecha» y RLS activado | ✔ |
| `prisma migrate diff` entre la base migrada y `schema.prisma` | ✔ sin desfase en las tablas nuevas |
| `hasProductAccess` contra la base real en 12 situaciones (admin, sin fila, ACTIVE, gracia 5 d, gracia vencida, INACTIVE, Redes con/sin red aprobada, maestro habilitado/deshabilitado, usuario inexistente) | ✔ las 12 como se diseñó |
| API de administración: dar gracia (v1), quitar (v2), activar (v3), validaciones (producto/acción/días 0, 400, 2.5/estado GRACE) = 400, usuario inexistente = 404, bitácora de eventos | ✔ |
| Panel «Productos» en navegador: Activar, Desactivar, Dar gracia, Quitar gracia, validación de días | ✔ |
| Hallazgo corregido durante la auditoría | El panel mostraba «(vencida)» para una gracia vigente cuando Redes la denegaba por falta de redes; ahora calcula los días desde la fecha |
| Hallazgo corregido durante la auditoría | Cada ficha consultaba al cargar (16 peticiones con 8 usuarios); ahora **carga perezosa**: 0 al abrir, 1 al ver el panel |

## Auditoría 2 — Regresión (¿rompe algo que ya funcionaba?)

| Prueba | Resultado |
|---|---|
| Suite web completa (`npm test` en `apps/web`) | 105/105 ✔ (la prueba de integración con base se omite por diseño) |
| `tsc --noEmit` en `apps/web` y en `apps/worker` | sin errores ✔ |
| `git diff --check` | limpio ✔ |
| Archivos existentes tocados, y de qué modo | `me/route.ts` (+bloque aditivo), `admin/users/route.ts` y `trial-signup/route.ts` (+1 llamada «de mejor esfuerzo» tras crear), `usuarios/page.tsx` (+1 sección), `menu-names.ts` (+constante), manual (+1 frase), `schema.prisma` (+modelos y 1 relación) |
| `/api/me` si la tabla no existe todavía (migración pendiente) | devuelve `products: null` y el resto igual (captura de error a propósito) |
| Alta de cuenta si falla la fila por defecto | la cuenta se crea igual; «sin fila = comportamiento actual» le conserva el acceso |
| Cambios en middleware, `vercel.json`, autenticación o secretos | **ninguno** |

## Auditoría 3 — Integración / preproducción (¿aguanta producción?)

| Prueba | Resultado |
|---|---|
| `npm run build` desde `apps/web` (el mismo directorio y comando que usa Vercel: Root Directory `apps/web`, `buildCommand: npm run build`, `outputDirectory: .next`; `vercel.json` sin cambios) | ✔ compila, 84/84 páginas, la ruta nueva `ƒ /api/admin/users/[id]/entitlements` está en el build |
| `prisma generate` y `prisma validate` | ✔ |
| Migración probada sobre una copia del esquema real de `main` | ✔ (ver auditoría 1) |
| **Hallazgo ajeno al lote (no se tocó):** `migrate deploy` desde una base vacía **falla** en `20260823150000_add_tumblr_integration` (`INSERT` en `ProductUpdate` sin `updatedAt`). Es historia ya aplicada en producción; por eso se probó sobre el esquema actual y no reproduciendo la cadena | anotado para Codex (C-014, punto 5) |
| Vercel Preview del PR | pendiente al abrir el PR |

## Orden de despliegue (obligatorio)

1. **Migración antes o junto con el merge** (lección del incidente del 2026-09-08). El código nuevo captura el error si la tabla no existe, pero no debe depender de ello.
2. Capitanía de migración reclamada por quien aplique, con la autorización de Milton.
3. Con el interruptor en `off`, **ningún usuario nota diferencia**. Verificación posterior en producción: `/api/me` incluye `products`, un usuario normal entra a Artículos como siempre, Administración muestra «Productos».
4. **Reversa:** el interruptor ya está en `off`; si algo falla, revertir el PR (la migración es solo aditiva y puede quedarse sin efecto).

## Riesgos residuales

- La migración debe aplicarse con la autorización de Milton (puerta de producción).
- El interruptor de aplicación **no tiene pantalla** todavía (llega con el Lote 3); mientras tanto vale `off` por defecto y no hay forma de encenderlo por accidente.
- La memoización por petición no se implementó (no hace falta hasta el Lote 3).
