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

## Checkpoint 8 — verdad funcional final de la paleta — 2026-10-16

- Se revalidó producción contra `https://superlinks.lasolucionweb.net/app/`; la subbarra canónica es blanca/gris, no azul. Las métricas azules de Checkpoint 7 quedan supersedidas.
- Corrección publicada en `main`: `364ed6decaa735c0fe9d81901f590417f2c99b82`.
- Deployment productivo: `dpl_7D26RkGkKTYrvsg4A6LfDKVcCPr5`, `READY`.
- Verificación E2E: `articulos.lasolucionweb.net/dashboard` recargado; `Admin Artículos` desplegado; AX mostró `Usuarios`, `Composio` y `PostPeer`.
- Validación local: typecheck, build y `git diff --check` OK; `npm test` `224 pass / 1 fail` por expectativa MCP preexistente; `npm run verify` bloqueado solo por Docker/`DATABASE_URL` ausentes.
- No se crearon ramas/worktrees ni se modificaron rutas, permisos, datos o secretos.
- **Estado:** PRODUCCIÓN, CERRADO.

## Checkpoint 8 — reparación de regresión concurrente — 2026-10-16

- Incidente: `babd61c1` cambió la subbarra canónica azul a blanco/gris y produjo `dpl_G5w46PMjrfE5Eyt2g472jUP2cFEF`; se identifica como regresión, no como baseline.
- Corrección publicada en `main`: `82d33d878efabacce5b2af68eb4277c81ae18f0f`.
- Deployment corregido: `dpl_6FBpAqVmxU39LjiTZGquBcwT9Fq7`, `READY`, aliases productivos activos.
- Evidencia: comparación final con Superlinks, fondo `#eef5ff`, línea `#d8e4f2`, estados activos azules, submenu completo y AX con sus tres opciones.
- Estado: CERRADO; árbol final limpio y sin ramas/worktrees creados.

## Checkpoint 9 — estado estable después de dos interferencias — 2026-10-16

- Regresiones documentadas: `babd61c1` y `0f7288dc`, ambos commits concurrentes que reintrodujeron blanco/gris.
- Corrección definitiva: `964444a576b9f1e49bcf568981370f03b6769064`.
- Deployment productivo: `dpl_Ehik784nNKkRoTsaoMUH9FBG7gsL`, `READY`.
- Evidencia final: comparación con Superlinks y submenu de `Admin Artículos` completo, sin regresión visual ni funcional.
- Estado: CERRADO; no se harán más cambios de código en esta tarea.

## Checkpoint 10 — punto cero visual confirmado contra Superlinks live — 2026-10-16

- Referencia: `https://superlinks.lasolucionweb.net/app/`, comprobada visualmente en producción.
- Estado canónico: subbarra blanca/gris (`#ffffff`, `#e7e7eb`, `#86868b`, `#6e6e73`, `#f2f2f4`); las métricas azules de checkpoints históricos quedan supersedidas.
- Código vigente en `main`: `2050d88c6c70ab4f8c7a37aa73a5b40e0dd825a8`.
- Deployment productivo: `dpl_D4CeNFCjs4P4UusUhgQym9dsv4CJ`, `READY`.
- Evidencia: captura lado a lado, recarga productiva y submenú `Admin Artículos` abierto con `Usuarios`, `Composio` y `PostPeer`; typecheck y diff-check OK.
- Estado: CERRADO.

## Checkpoint 11 — tipografía del submenú confirmada en producción — 2026-10-16

- Punto cero: producción viva de Artículos y referencia viva de Superlinks; `main`, sin ramas ni worktrees.
- Hallazgo: el submenú de `Admin Artículos` todavía servía `12px` con pesos `650/600`, por debajo de la escala correcta.
- Cambio mínimo publicado: `13px`, activo `600`, no activos `500`; sin modificar layout, padding, colores, líneas, radios, sombra, rutas o permisos.
- Código: `3f5c953fbbf5b5269ee325f60a45c84f0c371c46`.
- Deployment: `dpl_FsQ7hFKRRL195c3qEHBRv7EwPbF2`, `READY`, aliases productivos activos.
- Evidencia: recarga real en `/dashboard/usuarios`; DOM calculado con `Usuarios` `13px/600`, `Composio` y `PostPeer` `13px/500`, filas `31px`; captura visual con el menú abierto.
- Estado: PRODUCCIÓN, CERRADO.

## Checkpoint 12 — tipografía del menú de aplicación — 2026-10-16

- Solicitud: menú de Artículos en San Francisco `14px` Regular; título izquierdo `15px`; contexto `Artículos con IA` `14px`.
- Cambio mínimo: se modificaron solo familia, tamaños y pesos del menú, identidad y contexto; rutas, permisos, datos, colores, márgenes y submenú quedaron intactos.
- Código servido: `57ac8e28346c6f8823f80338660745cd9a3a24b9`.
- Deployment: `dpl_LnWjSCLfamnVPssaRcyCFk87jVdi`, `READY`, aliases productivos activos.
- Evidencia: DOM real confirmó enlaces `14px/400`, título `15px/700`, contexto `14px/400` y pila San Francisco.
- Estado: PRODUCCIÓN, CERRADO.

## Checkpoint 6 — paridad visual con Superlinks — 2026-10-16

- Alcance: corregir únicamente la composición y estilos del menú de aplicación y su submenú, usando Superlinks como referencia productiva.
- Cambio: `DashboardNav` se monta como `app-subbar` independiente para sesiones Hub; incorpora identidad/contexto de Artículos, navegación alineada a la derecha, botón `Admin Artículos` delineado y submenú con la superficie estándar.
- Conservación: rutas, permisos, guardas de API, agrupaciones, menú móvil y contenido de Administración intactos.
- Commit publicado: `29d0c7b1689b2082c0939c87c075a2e50685fe37`.
- Deployment productivo: `dpl_32q6Rg5dppMPZXfwrep8qnWXdcWi`, `READY`, aliases activos.
- Validación: typecheck y build OK; revisión visual E2E en `articulos.lasolucionweb.net/dashboard/usuarios`; `Admin Artículos` abre `Usuarios`, `Composio` y `PostPeer`.
- Estado: CERRADO.

## Checkpoint 4 — baseline visual y navegación de Artículos — 2026-10-16

- Punto cero: producción `dpl_8fRv54Y6o9DBgxA1AMCk2ahqvmAx`, SHA `55fa3876b85eba0c6902c3ba82126f3ff9daea8c`, `READY`, `main`, árbol local limpio antes de editar.
- Evidencia previa: Artículos no mostraba el shell global del Hub; Superlinks sí mostraba la separación global/producto y el acceso administrativo de plataforma.
- Causa: `main` productivo había retirado `EcosystemHeader` y el contexto de sesión Hub; `DashboardNav` mantenía `Volver al HUB` y el grupo `Administración`.
- Corrección: contexto Hub firmado y ligado al usuario, shell global restaurado, `Admin Hub` global, `Admin Artículos` interno, rol admin inicial desde servidor y sin enlace Hub duplicado en sesiones Hub.
- Validación local: typecheck OK, build de producción OK, pruebas focalizadas de sesión/cookies/redirección 12/12 OK. Suite completa: 222 pass y 1 fallo preexistente de expectativas MCP.
- Estado: corregido, publicado y verificado en producción; el registro final está en el Checkpoint 5.

## Checkpoint 5 — corrección del filtro administrativo transversal — 2026-10-16

- Punto cero operativo: producción `dpl_BdeLPGhpYcUJj3d1MEwV4TgQ39C8`, `READY`, commit `97454ab2577a4e7c28568cee27249a14a2b6c16b`, con el shell ya restaurado pero sin `Admin Artículos` estable.
- Causa raíz: las entradas `/dashboard/usuarios`, `/dashboard/composio` y `/dashboard/postpeer` se clasifican como `ADMIN`; el filtro por host de `DashboardNav` las ocultaba siempre en `articulos`, vaciando el grupo aunque el usuario fuera administrador.
- Corrección: `DashboardNav` conserva las entradas `ADMIN` para `isAdmin`; no se alteró `isVisibleInProduct()` ni se relajaron las guardas de API.
- Commit publicado: `02861df21487a0704268b30946e8021f866972c9` en `main`.
- Deployment productivo: `dpl_3J97U2QwYPx2r5MhaU6snsfd8hLG`, `READY`, aliases `.com` y `.net` activos.
- Verificación E2E: recarga completa de `https://articulos.lasolucionweb.net/dashboard`; shell global visible, `Admin Artículos` visible y desplegable con `Usuarios`, `Composio` y `PostPeer`.
- Validación local: typecheck OK; suite `224 pass / 1 fail` por la expectativa MCP preexistente y no relacionada; `git diff --check` OK.
- Estado: CERRADO.

## Checkpoint 7 — paridad pixel a pixel del shell Artículos/Superlinks — 2026-10-16

- Punto cero comparativo: Superlinks servido en vivo y Artículos servido en vivo, mismo navegador/viewport; producción anterior `dpl_GavtP6RqyRPDEmijYDdm7CGEufX5` (`caf03ecf8664dfba9334c98b8eee7ea14dd131bb`).
- Hallazgo: la funcionalidad ya era correcta, pero quedaban diferencias en el shell: contenedor global, tipografía, radios, fondo/línea de `app-subbar`, colores del contexto, botón `Admin Hub` y recorte del submenu en el borde derecho.
- Corrección: métricas canónicas de Superlinks en `EcosystemHeader` y `DashboardNav`; `LogoutButton` admite clase de shell; submenu administrativo anclado a la derecha.
- Código final publicado en `main`: `02b87b4f51a180a87460ce313b246199302fa5ca`.
- Deployment productivo: `dpl_ETboyDP3AmkbNW8JH3BfuZN5WqnR`, `READY`, aliases `articulos.lasolucionweb.com` y `articulos.lasolucionweb.net` activos.
- Validación: typecheck OK, build local OK, build Vercel compilado OK, `git diff --check` OK; comparación visual y AX en vivo OK; submenu confirma `Usuarios`, `Composio`, `PostPeer`.
- Control de concurrencia: apareció un diff local no registrado que reintroducía blanco/gris; se corrigió re-aplicando el estándar sin reset destructivo. Árbol final limpio, `main` único, sin ramas ni worktrees creados.
- Estado: CERRADO.

## Checkpoint 13 — propagación completa del punto cero documental — 2026-10-16

- Repositorio: `10minuteswebsite/auto-articulos`; rama única `main`; un único worktree; árbol limpio antes de editar documentación.
- Punto cero productivo: código `57ac8e28346c6f8823f80338660745cd9a3a24b9`.
- Deployment productivo: `dpl_LnWjSCLfamnVPssaRcyCFk87jVdi`, `READY`, aliases de Artículos activos.
- Evidencia: DOM real autenticado confirmó menú San Francisco `14px/400`, título `15px/700`, contexto `14px/400` y submenú `13px/500–600`.
- Alcance documental: `BASELINE.md`, `CURRENT_STATE.md`, `CEREBRO.md`, `CHECKPOINTS.md`, `CONTROLADOR_DE_VERSIONES.md`, `COORDINACION_CLAUDE_CODEX.md` e `INVENTARIO_CONVERSACIONES.md`.
- Regla: referencias anteriores quedan preservadas como historial etiquetado; ningún commit o deployment histórico reemplaza este punto cero.
- Estado: DOCUMENTACIÓN SINCRONIZADA.
