# Auditoría B.2 v2 — router de acceso del Día Cero

Fecha: 2026-10-02
Árbol auditado: rama `origin/claude/dia-cero`, commit `fd2395e8` (PR #412). Se revisaron `access-router.ts`, `access-router-adapter.ts`, `access-router-setting.ts` y `app/dashboard/layout.tsx` con `git show`, no main.

## Matriz de 15 casos

| # | Estado / dirección actual | Resultado esperado | ¿Cumple? / evidencia | Bucle |
|---:|---|---|---|---|
| 1 | Solo Artículos / `seototal.lasolucionweb.com` | Ir a `articulos.lasolucionweb.com` | ✅ `routeAfterLogin` líneas 39–41; adaptador 58–68 | No |
| 2 | Solo Artículos / `articulos.lasolucionweb.com` | Quedarse | ✅ router línea 46 y anti-bucle adaptador 34–43 | No |
| 3 | Solo Artículos / `redes.lasolucionweb.com` | Ir a Artículos | ✅ router líneas 44–46 | No |
| 4 | Solo Redes / `seototal.lasolucionweb.com` | Ir a `redes.lasolucionweb.com` | ✅ router líneas 39–42 | No |
| 5 | Solo Redes / `redes.lasolucionweb.com` | Quedarse | ✅ router línea 46 y anti-bucle adaptador 34–43 | No |
| 6 | Solo Redes / `articulos.lasolucionweb.com` | Ir a Redes | ✅ router líneas 44–45 | No |
| 7 | Ambos / canónico | Quedarse | ✅ router líneas 39–42 | No |
| 8 | Ambos / Artículos | Quedarse | ✅ router línea 46 | No |
| 9 | Ambos / Redes | Quedarse | ✅ router línea 46 | No |
| 10 | Ninguno / cualquiera de los tres hosts | Ir a `https://hub.lasolucionweb.net` | ✅ router línea 38; destino configurado en adapter 21 y 66 | No |
| 11 | Administrador / cualquier host permitido | Quedarse | ✅ router línea 27 | No |
| 12 | «Acceder como» / cualquier host permitido | Quedarse | ✅ layout líneas 27–32 excluye `actingAdmin`; nunca llama al redirect | No |
| 13 | Host desconocido, preview o localhost | Quedarse | ✅ router líneas 28–34 devuelve `stay` | No |
| 14 | `access_router_enabled` apagado | No redirigir | ✅ setting líneas 14–34; adapter 52 devuelve `null` | No |
| 15 | Error leyendo interruptor o derechos | No redirigir | ✅ adapter líneas 50–52 y 69–72 devuelve `null` y registra `[access-router]` | No |

## Verificación técnica

- `finalRedirectUrl` no devuelve una URL si el destino tiene el mismo host actual: adapter líneas 34–43. Esto evita el bucle de redirección.
- Las rutas permitidas son exactamente los tres hosts normalizados; cualquier otro host se queda donde está.
- El interruptor usa `access_router_enabled`, apagado por defecto; un error de lectura también equivale a apagado.
- El adaptador calcula ambos derechos con `hasProductAccess` y no toma la decisión del token.
- El layout excluye administradores y sesiones «Acceder como» antes de ejecutar el router.

## Nota de alcance

La auditoría anterior de este archivo revisó por error la puerta visual ya existente en main. Esta versión corrige el alcance y audita el árbol real de #412, tal como pidió C-048.
