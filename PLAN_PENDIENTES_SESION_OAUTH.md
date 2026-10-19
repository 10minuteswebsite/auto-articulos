# Plan actual — Pendientes de sesión y OAuth

Fecha de actualización: 2026-10-19
Repositorio: 10minuteswebsite/auto-articulos
Rama: main
Base funcional: producción verificada.

## Decisión operativa vigente

Mantener arquitectura mixta:

- `.com`: dominio canónico del HUB y de la sesión.
- `.net`: aplicación independiente por producto, con su propia sesión.
- No compartir cookies entre `.com` y `.net`.
- No añadir `.net` globalmente a la allowlist OAuth.

## Estado

### 1. Limpieza de estado OAuth en errores — COMPLETADO

- Corregidos Twitter/X, LinkedIn, Pinterest, Blogger y Bing.
- Tumblr usa pending server-side y no necesitaba cookie state.
- Threads, Instagram, Search Console, Analytics y Business Profile no tienen en este repo un callback con esa cookie.
- Código: `849ba35bd4bb7f77d3f79063d12495a37075f44d`.
- Producción: `dpl_AWAZPEAmvnZgoVUN5yxJUox6bDhQ`, `READY`.
- Vercel confirmó compilación y typecheck.
- La autorización real con una cuenta sigue sin ejecutarse.

## Pendientes restantes

### 2. Verificar reconexiones OAuth reales

Empezar por Bing y después los proveedores prioritarios:

1. Iniciar conexión con una sesión autorizada.
2. Completar autorización.
3. Confirmar retorno al producto correcto.
4. Confirmar conexión guardada.
5. Probar cancelación/error.
6. Confirmar que no queda state temporal.

### 3. Verificar las consolas externas

Comparar las URLs registradas en Google, Bing, Threads, LinkedIn, Pinterest, X, Blogger e Instagram/Facebook con las URLs que usa el código publicado. No cambiar nada sin evidencia de discrepancia.

### 4. Confirmar logout iniciado exclusivamente desde el HUB

Comprobar si el botón de logout del HUB también invalida la sesión de `auto-articulos`. Si no, revisar el repositorio del HUB e integrar su llamada a:

`POST https://seototal.lasolucionweb.com/api/auth/logout`

### 5. Mantener documentación sincronizada

Registrar en los documentos Harness los resultados de los puntos 2–4 y cualquier limitación real de verificación.

## Orden restante

1. Reconexión real de Bing y proveedores prioritarios.
2. Verificación de consolas externas.
3. Auditoría del logout independiente del HUB.
4. Cierre documental.

## Fuera de este plan

MCP, tokens, nuevas funcionalidades y limpieza administrativa de PRs antiguos.
