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
