# CURRENT_STATE — Punto cero real

Fecha de auditoría: 2026-10-16 (America/New_York)

## Identidad del sistema

- Repositorio canónico: `https://github.com/10minuteswebsite/auto-articulos`.
- Rama única autorizada: `main`.
- Commit actual de `main`: `c73e7b9445e05d2fef8774fec4b9cc158978ba69`.
- Producción: Vercel, proyecto `la-solucion-web/auto-articulos-web`.
- Deployment observado: `dpl_BcZSYWxq6LeXet6owNzFk53Qf63X`.
- Estado: `READY`, objetivo `production`.
- Alias: `seototal`, `articulos` y `redes`, en `.lasolucionweb.com` y `.lasolucionweb.net`.

## Comprobación funcional pública

Comprobado directamente contra los seis dominios:

- `/login`: HTTP 200.
- `/`: HTTP 307 hacia `/login` del mismo dominio.
- `/dashboard`: HTTP 307 hacia `/login` del mismo dominio.
- Endpoints OAuth protegidos sin sesión: HTTP 401; no se ejecutó ninguna autorización real.

## Estado funcional relevante

- El retorno OAuth canónico actual usa `https://seototal.lasolucionweb.com`.
- La allowlist OAuth actual contiene los hosts `.com`, no los `.net`.
- La cookie compartida actual es `.lasolucionweb.com`; no puede compartirse con `.net`.
- `/auth/hub` crea actualmente la cookie de sesión con `response.cookies.set`, no con `applyCookie`.
- Instagram directo todavía construye sus redirecciones finales con `request.url`.
- `/api/*` sigue siendo técnico y no debe convertirse en redirección al HUB.

## Confirmado y no confirmado

Confirmado: estado HTTP, aliases, deployment, commit actual de `main` y hallazgos estáticos del código.

No confirmado: Vercel no expone en la inspección consultada el commit exacto que produjo el deployment; tampoco se han verificado desde este repositorio las URLs registradas en las consolas OAuth externas.

No se inició ninguna conexión OAuth real ni se modificaron cuentas, proveedores, variables o datos.

## Resultado del Punto 1 — 2026-10-16

- Código publicado: `19f8ff5`.
- Deployment productivo verificado: `dpl_6bzjEAAUEQGwtwkUaR2mWAyDgcRP`, estado `READY`.
- Sin sesión, `seototal.lasolucionweb.com/`, `/login` y `/dashboard` redirigen a `https://hub.lasolucionweb.net/`.
- `seototal.lasolucionweb.com/api/*` continúa respondiendo como API protegida; la prueba OAuth sin sesión devolvió HTTP 401 JSON.
- `/auth/hub` no fue capturado por la redirección; sin código devolvió el error controlado `hub_code`.
- `articulos` y `redes`, en `.com` y `.net`, conservaron su redirección normal a `/login`.
- Usuarios con sesión no se redirigen en esta fase, para evitar que el retorno de `/auth/hub` a `/dashboard` cree un bucle. La sesión HUB se corregirá en el Punto 2.

## Incidente operativo de despliegue

El primer comando de Vercel se ejecutó desde un checkout sin vínculo local y creó el proyecto `la-solucion-web/web`; el proceso fue cancelado antes de completarse y no recibió aliases de producción. El despliegue válido se hizo después en `la-solucion-web/auto-articulos-web`. El proyecto accidental queda pendiente de eliminación con autorización explícita.
