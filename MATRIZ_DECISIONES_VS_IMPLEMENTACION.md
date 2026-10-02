# Matriz de decisiones vs. implementación

Cruce de las decisiones del traspaso, blueprint y Fase 0 con el código actual de `main`.

| Decisión | Implementación comprobada | Estado |
|---|---|---|
| Login `legacy`, `dual`, `hub`; hoy `legacy` | `apps/web/src/middleware.ts` y sesión existente | Hecho / legacy activo |
| No redirigir todo el dominio viejo al HUB | Hosts y rutas de máquina separados; callbacks por host | Hecho |
| Derechos desde base local, no token | `product-access.ts`, `product-access-core.ts`, `/api/me` | Hecho |
| Dos productos Artículos/Redes | schema, `PRODUCT_NAMES`, `PRODUCT_ROUTES`, paneles | Hecho |
| Gracia inicial de 5 días | migración/backfill, panel y SQL de corte | Hecho; corte pendiente |
| `off/shadow/enforce`, apagado por defecto | `product-enforcement.ts`, API/panel admin | Hecho; `off` activo |
| Sombra antes de Activo | `product-enforcement-transition.ts` y salvaguardas | Hecho |
| Worker antes de cada destino social | `apps/worker/src/product-access.ts`, `socialPublish.ts` | Hecho en sombra |
| APIs protegidas por producto | `require-product-access.ts` en rutas objetivo | Hecho en sombra |
| Vista por productos opt-in | `product-routes.ts`, `ProductHome.tsx`, guardas/menú | Hecho |
| Search Console visible bajo Redes sin duplicar | `product-view-filter.ts`, `ConexionesView.tsx` | Hecho |
| Historial/Progreso por producto | páginas `historial` y `publicaciones-en-curso` | Hecho |
| Mi acceso solo lectura | `dashboard/mi-acceso/page.tsx`, `/api/me` | Hecho |
| Administración y eventos | endpoint de entitlements, `UserProductsPanel.tsx` | Hecho |
| Callbacks OAuth por host de origen | helpers OAuth y pruebas hostiles | Hecho; consolas pendientes |
| Host estable solo MCP/OAuth2/.well-known | `middleware.ts` y rutas de máquina | Hecho |
| Contrato externo con versión/jti/idempotencia | documento de Lote 4 | Documentado; receptor fuera de alcance |
| Capitanía única y no destrucción | runbook/control/coordinación | Hecho como protocolo |
| Schema HUB alineado con main | `schema.prisma` omite cinco columnas existentes | **Pendiente / alerta crítica** |

## Desviaciones y pendientes

1. La integración real con HUB sigue fuera de alcance; no hay que inventar un receptor local.
2. El registro real de callbacks en consolas sigue pendiente de Milton.
3. El paso de `off` a `shadow`/`enforce` no está autorizado automáticamente.
4. La divergencia de schema HUB requiere decisión explícita.
