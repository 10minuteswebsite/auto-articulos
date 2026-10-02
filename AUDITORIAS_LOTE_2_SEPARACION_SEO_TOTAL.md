# AUDITORÍAS — LOTE 2 «SEPARACION SEO TOTAL» (separación visual por producto) — EN CURSO

Fecha: 2026-10-01 · Autor: Claude · Rama: `claude/lote2-separacion-visual` (PR borrador, apilado sobre el Lote 1)
**Estado: PARCIAL. Las auditorías completas se cierran cuando terminen los pasos de Codex (conexiones e historial/progreso por producto).**

## Hecho por Claude en este lote

| Pieza | Archivo |
|---|---|
| Mapa de rutas por producto + lectura del interruptor | `apps/web/src/lib/product-routes.ts` (+ pruebas) |
| Interruptor: módulo opt-in `vista-productos` | `apps/web/src/lib/modules.ts` |
| Menú por producto (dos grupos en lugar de «Publicaciones») | `apps/web/src/components/DashboardNav.tsx` |
| Inicio con dos tarjetas de producto | `apps/web/src/app/dashboard/page.tsx` |
| Portadas `/dashboard/articulos` y `/dashboard/redes` | `components/ProductHome.tsx` + 2 páginas |
| Manual de usuario | `apps/web/src/content/manual-usuario.ts` |

## Principio de seguridad: la vista nace APAGADA

La vista por productos es un **módulo opt-in**: la ven los administradores (vista previa) y solo las cuentas con «Habilitado» en Administración. **Ninguna otra cuenta nota diferencia.** Abrirla a todos es quitar `optIn` del módulo (regla ya documentada en `modules.ts`). **Ninguna URL cambia.**

## Auditoría 1 — Funcional (verificado en navegador, base desechable)

| Situación | Resultado |
|---|---|
| Administrador | Menú **Inicio · SEO Total Artículos · SEO Total Redes · Configuración · Administración**; desplegables con las pantallas correctas |
| Usuario normal sin «Habilitado» | Menú **idéntico al de hoy**: Inicio · Publicaciones (1, 2, 3, Progreso, Historial, Estadísticas) · Configuración |
| Usuario normal CON «Habilitado» | Ve la vista por productos (sin Administración) |
| Usuario normal que escribe `/dashboard/redes` | «Esta vista aún no está disponible» + enlace a Inicio |
| Inicio del administrador | «Elige un producto» con dos tarjetas |
| Portada de Redes | Índice de 5 pantallas, grupo resaltado |
| Enlace `…/historial?producto=redes` | Resalta el grupo **SEO Total Redes** y su enlace |

## Auditoría 2 — Regresión

- Suite web: **118/118** (13 pruebas nuevas, entre ellas: la tabla de rutas por segmento, ruta desconocida = compartida, interruptor apagado ante la duda, y que un usuario normal NO ve la vista y un administrador SÍ).
- Se modificó **un test existente** a propósito: «no hay módulos opt-in por ahora» pasó a «el único módulo opt-in es la vista por productos» (es una foto del estado, no una regla; ahora fija que no se cuele otro).
- `tsc --noEmit` limpio. Sin cambios en middleware, `vercel.json`, autenticación ni secretos. Sin migración.

## Auditoría 3 — Integración (pendiente)

- Pendiente: `npm run build` del lote completo y Vercel Preview, al cerrar los pasos de Codex.

## Hallazgos durante la verificación

- El menú tarda un instante en pasar del estado inicial al de productos (carga de `/api/me`), igual que ya ocurre con el grupo de Administración. Es aceptable; se revisará cuando se abra a todos.
- El hook de commit intenta registrar una «novedad» con IA; en esta máquina falla de forma inofensiva (sin clave). No escribió nada.
