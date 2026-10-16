# CURRENT_STATE — Punto cero real

Fecha de auditoría: 2026-10-16 (America/New_York)

## Identidad del sistema

- Repositorio canónico: `https://github.com/10minuteswebsite/auto-articulos`.
- Rama única autorizada: `main`.
- Commit productivo actual de `main`: `55fa3876b85eba0c6902c3ba82126f3ff9daea8c`.
- Producción: Vercel, proyecto `la-solucion-web/auto-articulos-web`.
- Deployment observado: `dpl_8fRv54Y6o9DBgxA1AMCk2ahqvmAx`.
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
- La cookie compartida se emite dentro de la familia del host actual: `.lasolucionweb.com` o `.lasolucionweb.net`.
- `/auth/hub` usa `applyCookie` y selecciona la familia correcta para no intentar fijar una cookie `.com` desde `.net`.
- Instagram directo todavía construye sus redirecciones finales con `request.url`.
- `/api/*` sigue siendo técnico y no debe convertirse en redirección al HUB.

## Confirmado y no confirmado

Confirmado: estado HTTP, aliases, deployment, commit productivo exacto de `main` y hallazgos estáticos del código.

No confirmado: tampoco se han verificado desde este repositorio las URLs registradas en las consolas OAuth externas.

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

## Resultado del Punto 2 — 2026-10-16

- Código publicado: `b7ce44c`.
- `/auth/hub` ahora usa `applyCookie` para emitir `auto_articulos_session`.
- Producción tiene `DIA_CERO=on`; por tanto, la cookie se fija con `Domain=.lasolucionweb.com` y se borra también la variante ligada al host.
- Deployment productivo verificado: `dpl_9P62g85S79rBK8sfUN1HCocdoUnw`, estado `READY`.
- Verificación HTTP: entradas humanas siguen al HUB, `/api/*` sigue en 401 sin sesión y `/auth/hub` sin código devuelve `hub_code` sin ser capturado.
- No se probaron cuentas reales del HUB ni se tocaron proveedores externos.

## Incidente — lanzamiento HUB → Redes en `.net` — 2026-10-16

- Reproducción real: la tarjeta `AUTOMATIZA TUS REDES SOCIALES` generó el enlace correcto con `app=auto-redes`, pero terminó en `https://redes.lasolucionweb.net/login`.
- Causa: producción tenía `DIA_CERO=on` y el callback `/auth/hub` emitía `Domain=.lasolucionweb.com` aunque la respuesta salía de `redes.lasolucionweb.net`; el navegador rechaza ese dominio de cookie desde `.net`.
- Corrección: `cookieEnvForHost()` selecciona `.lasolucionweb.net` para Redes `.net` y conserva `.lasolucionweb.com` para hosts `.com`; se añadió prueba para ambas familias.
- Publicado en Vercel: commit `7112c1ac0a3c840640027cd93b094243ceebd980`, deployment `dpl_kzmJfxq2E2fS41QWAVKx76Jkgv8V` (`READY`).
- Verificación E2E posterior: el clic del HUB terminó en `https://redes.lasolucionweb.net/dashboard/oportunidades-redes`, con sesión activa y encabezado `SEO TOTAL REDES`.
- No se modificaron secretos, datos, proveedores ni la configuración DNS.

## Punto cero UI — shell Hub y Admin Artículos — 2026-10-16

- Producción auditada directamente: `articulos.lasolucionweb.net/dashboard/usuarios` mostraba solo el menú interno (`Inicio`, `Publicaciones`, `Configuración`, `Volver al HUB`) y no mostraba el shell global del Hub.
- Referencia funcional auditada: `superlinks.lasolucionweb.net` separa el shell global (`Aplicaciones`, `Facturación`, `Perfil`, `Admin Hub`, `Salir`) del menú interno de la aplicación.
- Causa en `main` productivo: el shell compartido y la propagación verificable del origen de sesión Hub habían sido retirados; el menú interno seguía dependiendo del rol local y conservaba `Volver al HUB` como duplicado.
- Regla de seguridad: `Admin Artículos` solo se renderiza para `role === "admin"` o una sesión de administración activa; las APIs de administración mantienen su guardia independiente.
- Cambio preparado: contexto Hub firmado, shell global condicionado a ese contexto, eliminación del enlace Hub duplicado en sesiones Hub, renombrado del grupo a `Admin Artículos` y rol administrativo inicial entregado desde el servidor para evitar una carrera de hidratación.
