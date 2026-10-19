# Plan actual — Pendientes de sesión y OAuth

Fecha: 2026-10-19
Repositorio: 10minuteswebsite/auto-articulos
Rama: main
Base funcional: producción verificada en el deployment READY vigente.

Este plan reemplaza el plan anterior para esta incidencia. Solo contiene trabajo pendiente; no reabre correcciones ya verificadas.

## Decisión operativa vigente

Mantener una arquitectura mixta:

- `.com`: dominio canónico del HUB y de la sesión.
- `.net`: aplicación independiente por producto, con su propia sesión.
- No compartir cookies entre `.com` y `.net`.
- No añadir `.net` globalmente a la allowlist OAuth.

## Pendientes

### 1. Corregir limpieza de estado OAuth en errores

Auditar los callbacks que dejan la cookie temporal de estado cuando el proveedor devuelve error o el usuario cancela.

Alcance inicial:

- Tumblr
- LinkedIn
- Pinterest
- Blogger
- Bing
- Threads
- Instagram/Facebook
- Google Search Console
- Google Analytics
- Google Business Profile

Resultado esperado:

- La cookie temporal se elimina tanto en éxito como en error/cancelación.
- Se agregan pruebas de regresión.
- Se verifica el flujo publicado en producción.

### 2. Verificar reconexiones OAuth reales

Probar en producción, empezando por Bing, una cuenta real o de prueba controlada:

1. Iniciar conexión.
2. Completar autorización.
3. Confirmar retorno al producto correcto.
4. Confirmar sesión y conexión guardadas.
5. Probar cancelación/error.
6. Confirmar que no queda estado OAuth temporal.

Después repetir con los proveedores prioritarios.

### 3. Verificar las consolas externas

Comparar las URLs registradas en cada proveedor contra las URLs que usa el código publicado.

Proveedores:

- Google Search Console
- Google Analytics
- Google Business Profile
- Bing
- Threads
- LinkedIn
- Pinterest
- X
- Blogger
- Instagram/Facebook

No se cambiarán URLs en las consolas sin evidencia de una discrepancia.

### 4. Confirmar el logout iniciado exclusivamente desde el HUB

El logout del dashboard de producto ya fue probado. Falta comprobar si el botón de logout del HUB también invalida la sesión de `auto-articulos`.

Si no lo hace, habrá que integrar el HUB con:

`POST https://seototal.lasolucionweb.com/api/auth/logout`

Este punto requiere revisar el repositorio/aplicación del HUB; no se modificará a ciegas desde `auto-articulos`.

### 5. Reconciliar la documentación

Actualizar:

- `CEREBRO.md`: retirar afirmaciones antiguas sobre normalizar automáticamente `.net` a `.com`.
- `CURRENT_STATE.md`
- `CHECKPOINTS.md`
- `COORDINACION_CLAUDE_CODEX.md`

Registrar resultados reales de los puntos 1–4, incluyendo pruebas fallidas o no ejecutables.

## Orden de ejecución

1. Limpieza OAuth en errores.
2. Publicación y verificación de producción.
3. Reconexión real de Bing y proveedores prioritarios.
4. Verificación de consolas externas.
5. Auditoría del logout independiente del HUB.
6. Cierre documental.

## Fuera de este plan

No forman parte de esta incidencia los pendientes de MCP, tokens, nuevas funcionalidades ni la limpieza administrativa de PRs antiguos.
