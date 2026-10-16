# CURRENT_STATE — Punto cero real

Fecha de auditoría: 2026-10-16 (America/New_York)

## Identidad del sistema

- Repositorio canónico: `https://github.com/10minuteswebsite/auto-articulos`.
- Rama única autorizada: `main`.
- Commit funcional productivo verificado: `57ac8e28346c6f8823f80338660745cd9a3a24b9`.
- Producción: Vercel, proyecto `la-solucion-web/auto-articulos-web`.
- Deployment funcional observado: `dpl_LnWjSCLfamnVPssaRcyCFk87jVdi`.
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
- Cambio publicado: contexto Hub firmado, shell global condicionado a ese contexto, eliminación del enlace Hub duplicado en sesiones Hub, renombrado del grupo a `Admin Artículos`, rol administrativo inicial entregado desde el servidor y excepción explícita para que las rutas `ADMIN` no sean ocultadas por el filtro visual de Artículos/Redes.

## Cierre productivo — menú Admin Artículos — 2026-10-16

- Causa raíz confirmada: `DashboardNav` sí recibía el rol administrativo, pero `isVisibleInProduct()` clasifica las rutas administrativas como `ADMIN`; al ejecutarse el filtro en `articulos.lasolucionweb.net`, las tres entradas quedaban ocultas y el grupo desaparecía por estar vacío.
- Corrección: las rutas `ADMIN` se mantienen visibles para administradores o sesiones de administración activa; no se cambió la regla general que mantiene Administración fuera de los módulos de producto para cuentas normales.
- Commit funcional: `02861df21487a0704268b30946e8021f866972c9`.
- Deployment productivo: `dpl_3J97U2QwYPx2r5MhaU6snsfd8hLG`, `READY`, `main`, aliases de Artículos activos.
- Evidencia E2E: en `https://articulos.lasolucionweb.net/dashboard`, tras recarga completa, se observaron `Admin Artículos` y su menú expandido con `Usuarios`, `Composio` y `PostPeer`; el shell global mostró `Aplicaciones`, `Facturación`, `Perfil`, `Admin Hub`, identidad y `Salir`.
- Validación: typecheck OK; build previo del lote OK; suite amplia `224 pass / 1 fail` por expectativa MCP preexistente y no relacionada (`mcp.test.ts` espera tres prompts, el catálogo actual expone seis).

## Cierre visual — shell de Artículos alineado con Superlinks — 2026-10-16

- Cambio: la navegación de aplicación dejó de vivir dentro del contenido y pasó a una barra `app-subbar` de ancho completo, separada del encabezado global.
- Baseline visual aplicada: identidad del producto a la izquierda (`SEO Total Artículos` / `Artículos con IA`), navegación a la derecha, enlaces neutros con estado activo gris claro, botón administrativo delineado y submenú con bordes/sombra del patrón Superlinks.
- Se conservaron las rutas, agrupaciones, permisos, menú móvil y guardas administrativas; el cambio es estructural/visual.
- Commit de código: `29d0c7b1689b2082c0939c87c075a2e50685fe37`.
- Deployment productivo verificado: `dpl_32q6Rg5dppMPZXfwrep8qnWXdcWi`, `READY`.
- Evidencia visual E2E: producción mostró ambas barras separadas y el submenú `Admin Artículos` abierto con `Usuarios`, `Composio` y `PostPeer`, sin regresión de la pantalla de Administración.

## Paridad visual final contra Superlinks — histórico, supersedido por la verificación vigente — 2026-10-16

- Referencia comparada en vivo: `https://superlinks.lasolucionweb.net/app/` y `https://articulos.lasolucionweb.net/dashboard/usuarios`, en el mismo navegador y viewport.
- Ajuste global: `EcosystemHeader` usa las métricas del shell productivo de Superlinks: barra sticky de 64px, contenedor máximo de 1280px, paddings responsive 16/24/32px, enlaces globales 14px/400, estado activo `#f3f4f6`, `Admin Hub` plano y `Salir` delineado.
- Ajuste de aplicación: `DashboardNav` usa `app-subbar` de 52px, ancho `min(100% - 40px, 1160px)`, fondo `#ffffff`, línea `#e7e7eb`, contexto `#86868b` y enlaces `11px/650` con estado activo `#f2f2f4`.
- Submenú: superficie blanca, borde `#d8e4f2`, radio 10px, sombra discreta, enlaces 12px y anclaje derecho para que `Admin Artículos` no se recorte en el viewport.
- El distintivo `L` y el contorno de `Admin Hub` se eliminaron porque no aparecen en el shell actualmente servido por Superlinks.
- Código final publicado: `2050d88c6c70ab4f8c7a37aa73a5b40e0dd825a8`.
- Deployment productivo: `dpl_D4CeNFCjs4P4UusUhgQym9dsv4CJ`, estado `READY`, aliases de Artículos activos.
- Evidencia E2E: recarga con caché nueva, comparación visual lado a lado y apertura real de `Admin Artículos`; AX confirmó `Usuarios`, `Composio` y `PostPeer`, sin regresión funcional.
- Verificación local: typecheck y build de producción OK; `git diff --check` OK; árbol final limpio en `main`.
- Incidente de control: se detectó una edición local concurrente que intentó devolver la subbarra a blanco/gris; se re-aplicó el estado canónico sin `reset` destructivo y se dejó registrado aquí.

## Corrección de regresión concurrente — 2026-10-16

- Después del cierre documental apareció en `main` el commit concurrente `babd61c1`, que cambió la `app-subbar` de `#eef5ff/#d8e4f2` a blanco/gris y redujo los estados activos al estilo antiguo.
- Ese commit produjo el deployment `dpl_G5w46PMjrfE5Eyt2g472jUP2cFEF`; no se acepta como punto cero porque contradice la comparación viva con Superlinks.
- Corrección posterior publicada en `main`: `82d33d878efabacce5b2af68eb4277c81ae18f0f`.
- Deployment productivo corregido: `dpl_6FBpAqVmxU39LjiTZGquBcwT9Fq7`, `READY`, aliases de Artículos activos.
- Verificación final: barra azul clara, contexto azul, `Admin Artículos` delineado, submenu completo dentro del viewport y AX con `Usuarios`, `Composio`, `PostPeer`.

## Estado final después de segunda interferencia — 2026-10-16

- Se detectó una segunda escritura concurrente, `0f7288dc`, que repitió la regresión blanco/gris después de `82d33d87`.
- Corrección definitiva de código: `964444a576b9f1e49bcf568981370f03b6769064`.
- Deployment productivo verificado: `dpl_Ehik784nNKkRoTsaoMUH9FBG7gsL`, `READY`, aliases productivos activos.
- Verificación final en vivo: barra global y `app-subbar` comparadas con Superlinks; `Admin Artículos` abierto sin recorte; AX confirma `Usuarios`, `Composio` y `PostPeer`.
- Regla operativa: ningún proceso paralelo puede modificar `DashboardNav` durante una tarea; cualquier commit que reintroduzca blanco/gris se considera regresión y no punto cero.

## Verdad funcional vigente — corrección final contra producción — actualización posterior — 2026-10-16

- La referencia vigente es la URL viva `https://superlinks.lasolucionweb.net/app/`; allí la `app-subbar` es blanca, con línea gris clara, contexto gris y estados activos gris claro. Las secciones azules anteriores de este documento quedan supersedidas por esta comprobación visual.
- `DashboardNav` quedó alineado con esa referencia: fondo `#ffffff`, borde `#e7e7eb`, contexto `#86868b`, enlaces `#6e6e73`, estado activo `#f2f2f4`, submenú con borde `#e7e7eb` y sombra tenue.
- Código vigente en `main`: `57ac8e28346c6f8823f80338660745cd9a3a24b9`.
- Deployment productivo: `dpl_LnWjSCLfamnVPssaRcyCFk87jVdi`, `READY`.
- Verificación fresca en `https://articulos.lasolucionweb.net/dashboard`: barra blanca/gris visible y `Admin Artículos` expandido con `Usuarios`, `Composio` y `PostPeer` en AX; no se cambiaron rutas, permisos ni datos.
- Validación local: typecheck y build de producción OK; `git diff --check` OK. `npm test` queda en `224 pass / 1 fail` por expectativa MCP preexistente y no relacionada. `npm run verify` requiere `DATABASE_URL` y Docker, ausentes en este entorno.

## Propagación documental del punto cero — 2026-10-16

- Este archivo y los otros seis documentos activos del Harness quedan alineados con el código productivo `57ac8e28` y el deployment `dpl_LnWjSCLfamnVPssaRcyCFk87jVdi`.
- Las referencias anteriores permanecen únicamente como historial de cambios, regresiones y correcciones; no son base para trabajo nuevo.

## Corrección vigente del submenú — 2026-10-16

- Se confirmó contra producción que la discrepancia restante era tipográfica: el submenú estaba servido en `12px` con pesos `650/600`.
- Se corrigió únicamente la tipografía a `13px`, con activo `600` y no activos `500`; no se tocaron márgenes, padding, colores, líneas, radios, sombra, rutas ni permisos.
- Código productivo: `3f5c953fbbf5b5269ee325f60a45c84f0c371c46`.
- Deployment: `dpl_FsQ7hFKRRL195c3qEHBRv7EwPbF2`, `READY`.
- Evidencia real: `articulos.lasolucionweb.net/dashboard/usuarios` recargado; DOM calculado `Usuarios` `13px/600`, `Composio` y `PostPeer` `13px/500`, filas `31px`; captura visual con el submenú abierto.

## Tipografía vigente del menú de aplicación — 2026-10-16

- Menú horizontal de Artículos: pila San Francisco, `14px`, peso `400`.
- Identidad izquierda: `SEO Total Artículos` `15px`; contexto `Artículos con IA` `14px/400`.
- Código productivo: `57ac8e28346c6f8823f80338660745cd9a3a24b9`.
- Deployment productivo: `dpl_LnWjSCLfamnVPssaRcyCFk87jVdi`, `READY`.
- Verificación real: `articulos.lasolucionweb.net/dashboard/usuarios` recargado; DOM confirmó familia, tamaños y pesos exactos sin cambios de rutas, permisos ni datos.
