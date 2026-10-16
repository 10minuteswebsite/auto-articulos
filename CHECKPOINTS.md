# CHECKPOINTS

## Checkpoint 0 — Estado previo a la reparación HUB/OAuth

- Fecha: 2026-10-16 (America/New_York).
- Repositorio: `miltondavila-ux/auto-articulos`.
- `main`: `c73e7b9445e05d2fef8774fec4b9cc158978ba69`.
- Deployment productivo observado: `dpl_BcZSYWxq6LeXet6owNzFk53Qf63X`.
- Estado: `READY`.
- Alias: seis dominios de `seototal`, `articulos` y `redes`, en `.com` y `.net`.
- Evidencia: los seis `/login` responden 200; `/` y `/dashboard` responden 307 a `/login` del mismo host; APIs OAuth sin sesión responden 401.
- Huella: Vercel no entregó `gitSource` ni commit en la inspección. Se conserva el ID del deployment sin afirmar que corresponda exactamente al SHA de `main`.
- Cambios realizados: ninguno.

## Regla para el siguiente checkpoint

El siguiente checkpoint solo se cerrará después de publicar desde `main`, comprobar el deployment resultante y repetir las pruebas funcionales. Registrará por separado el SHA que produjo el artefacto y el commit documental más reciente.

## Checkpoint 1 — `seototal.com` humano al HUB

- Commit de código: `19f8ff5`.
- Deployment que produjo el cambio: `dpl_6bzjEAAUEQGwtwkUaR2mWAyDgcRP` (`READY`).
- Verificado: `/`, `/login` y `/dashboard` de `seototal.com` van al HUB sin sesión; `/api/*` y `/auth/hub` no van al HUB; los demás cinco dominios conservan su comportamiento anterior.
- Tests: typecheck y build de producción OK; pruebas aisladas de helper/OAuth 11/11 OK. El conjunto web tuvo 220 pruebas correctas y un fallo preexistente de expectativas MCP.
- Estado: PUNTO 1 CERRADO; pendiente Punto 2 (`applyCookie` en `/auth/hub`).

## Checkpoint 2 — sesión emitida por el HUB

- Commit de código: `b7ce44c`.
- Deployment: `dpl_9P62g85S79rBK8sfUN1HCocdoUnw` (`READY`).
- Cambio: `/auth/hub` usa `applyCookie`; `DIA_CERO=on` confirma el dominio compartido `.lasolucionweb.com`.
- Tests: pruebas dirigidas 18/18, typecheck y build de producción OK. Suite completa: 221 correctas, 1 fallo preexistente de expectativas MCP y 1 integración omitida por falta de `TITLE_GENERATION_TEST_DATABASE_URL`.
- Producción: entradas al HUB, APIs sin sesión y error controlado de `/auth/hub` verificados por HTTP.
- Estado: PUNTO 2 CERRADO; pendiente prueba real autorizada del intercambio HUB.

## Checkpoint 3 — reparación del lanzamiento HUB → Redes `.net`

- Punto cero verificado antes de editar: repositorio `miltondavila-ux/auto-articulos`, `main`, SHA productivo `fae041b976ad54721992fa198dfe43d0dabb8681`, Vercel `auto-articulos-web`, deployment `dpl_FEgVvQXhJ7iDfxXsYn5TFYWCDuAR` (`READY`), árbol limpio y un único worktree.
- Hallazgo: el callback `redes.lasolucionweb.net/auth/hub` heredaba `Domain=.lasolucionweb.com` por `DIA_CERO=on`; el navegador rechazaba la cookie y el dashboard volvía a `/login`.
- Cambio: `cookieEnvForHost()` selecciona `.lasolucionweb.net` o `.lasolucionweb.com` según el host del callback; se añadió prueba dirigida.
- Validación local: build y typecheck correctos; suite web `222` correctas, `1` fallo preexistente de expectativas MCP; la prueba de integración de generación de títulos quedó omitida por no existir `TITLE_GENERATION_TEST_DATABASE_URL`.
- Publicado en Vercel: deployment `dpl_kzmJfxq2E2fS41QWAVKx76Jkgv8V` (`READY`), commit servido `7112c1ac0a3c840640027cd93b094243ceebd980`, aliases `.com` y `.net` activos.
- Verificación E2E: desde la tarjeta del HUB se llegó a `https://redes.lasolucionweb.net/dashboard/oportunidades-redes`; sesión activa de Mario Davila y encabezado `SEO TOTAL REDES`; no volvió a `/login`.
- Estado: CERRADO.
