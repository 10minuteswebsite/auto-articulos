# Auditoría B.2 — router de acceso y layout

Fecha: 2026-10-02
Alcance: revisión estática de `DashboardLayout`, `DashboardNav`, `ProductAccessGuard`, `ModuleGuard`, `product-routes` y `/api/me` en main.

## Aclaración de alcance

La solicitud de C-046 menciona `access-router-adapter.ts` y `access-router.ts`, pero esos archivos **no existen en main** en la revisión realizada. La implementación equivalente actual está repartida entre `apps/web/src/lib/product-routes.ts`, `apps/web/src/components/ProductAccessGuard.tsx`, `apps/web/src/components/ModuleGuard.tsx`, `apps/web/src/components/DashboardNav.tsx` y `apps/web/src/app/dashboard/layout.tsx`. Por eso los resultados de abajo auditan el comportamiento real, no un router con esos nombres.

## Matriz de 15 casos

| # | Estado / dirección | Esperado | Evidencia y resultado estático | Bucle o riesgo |
|---:|---|---|---|---|
| 1 | Solo Artículos → `/dashboard/articulos` | Mostrar Artículos si el derecho está activo; bloquear si `enforce` lo niega | ✅ `productOfPath` clasifica `ARTICULOS`; `ProductAccessGuard` usa `evaluatePageGate`; `DashboardLayout` envuelve ambas guardas | Ninguno observado |
| 2 | Solo Artículos → `/dashboard/redes` | Bloquear Redes | ✅ Clasifica `REDES`; la puerta se evalúa con el producto Redes | Ninguno observado |
| 3 | Solo Artículos → `/dashboard/historial` | Permitir pantalla compartida, con filtrado futuro | ✅ Clasifica `COMPARTIDO`; la pantalla queda accesible | Hoy mezcla datos; el filtrado está pendiente según comentario de `product-routes` |
| 4 | Solo Redes → `/dashboard/articulos` | Bloquear Artículos | ✅ Clasifica `ARTICULOS`; `evaluatePageGate` decide según products | Ninguno observado |
| 5 | Solo Redes → `/dashboard/redes` | Mostrar Redes | ✅ Clasifica `REDES`; gate por products | Ninguno observado |
| 6 | Solo Redes → `/dashboard/publicaciones-en-curso` | Permitir pantalla compartida | ✅ Clasifica `COMPARTIDO` | Hoy mezcla datos; filtrado pendiente |
| 7 | Ambos → `/dashboard/articulos` | Mostrar Artículos | ✅ El resumen de `/api/me` entrega ambos productos y el gate no bloquea | Ninguno observado |
| 8 | Ambos → `/dashboard/redes` | Mostrar Redes | ✅ Mismo comportamiento para Redes | `ModuleGuard` todavía puede bloquear oportunidades-redes si no hay redes aprobadas |
| 9 | Ambos → `/dashboard/configuracion` | Mostrar configuración común | ✅ Clasifica `COMPARTIDO`; no se oculta por producto | Ninguno observado |
| 10 | Ninguno → `/dashboard/articulos` | Bloquear con mensaje simple | ✅ Gate en `enforce`; en `off` deja pasar por contrato actual | En `off` no hay enforcement por diseño |
| 11 | Ninguno → `/dashboard/redes` | Bloquear con mensaje simple | ✅ Igual que #10 para `REDES` | En `off` no hay enforcement por diseño |
| 12 | Admin → `/dashboard/usuarios` | Mostrar Administración | ✅ `DashboardNav` añade `ADMIN_GROUP`; `/api/me` identifica `role=admin` | No depende de products |
| 13 | Admin impersonando → `/dashboard/articulos` | Permitir supervisión | ✅ `isAdmin` considera `isActingAdmin`; `/api/me` da `products` del usuario actuado y `ProductAccessGuard` respeta el contexto | Debe verificarse manualmente con sesión real; no se ejecutó login |
| 14 | Host/ruta desconocidos → `/dashboard/desconocida` | No asumir producto; tratar como compartido | ✅ `productOfPath` devuelve `COMPARTIDO` cuando no hay coincidencia | Si una página nueva requiere producto debe añadirse explícitamente a la tabla |
| 15 | Error de lectura de `/api/me` en enforcement `off` → cualquiera de las 3 direcciones | No romper ni bloquear por fallo de lectura | ✅ `ProductAccessGuard` deja pasar cuando `mode` queda `null`; `ModuleGuard` también marca `checked` y deja pasar | Correcto para disponibilidad; no prueba el caso de fallo con enforcement ya activo porque el modo también llega por `/api/me` |

## Tres direcciones cubiertas

- Producto Artículos: `/dashboard/articulos` y `/dashboard/publicar`.
- Producto Redes: `/dashboard/redes` y `/dashboard/oportunidades-redes`.
- Compartida/desconocida: `/dashboard/configuracion`, `/dashboard/historial` y `/dashboard/desconocida`.

## Conclusión

La separación visual y la puerta de producto están implementadas sin cambiar URLs. El interruptor `product_enforcement` permanece apagado por contrato; en ese estado la interfaz no bloquea por derechos, aunque sí puede existir el bloqueo independiente de Redes por `socialPublishingApproved`. No se encontró un router con los nombres citados por C-046: si Claude esperaba una capa separada, debe decidirse si se crea o si se mantiene esta implementación distribuida.

Comprobaciones ejecutadas: lectura de los archivos anteriores y búsqueda de referencias con `rg`; no se inició sesión ni se ejecutó una prueba de navegador.
