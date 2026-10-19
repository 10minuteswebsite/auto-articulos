# CHECKPOINTS

## Checkpoint — Threads/PostPeer: botón de conexión — 2026-10-19

- Task ID: `THREADS-POSTPEER-BOTON-20261019`.
- Punto cero: producción servida desde `cfe380006423950da5447a12d0d6896421941d5f`; deployments `7187003637` y `7187010076`, ambos `success`.
- Causa: la UI bloqueaba Threads por un endpoint de credenciales Meta eliminado.
- Cambio: `OAuthNetworkSection.tsx` permite el botón PostPeer para `config.id === "threads"`.
- Typecheck local no ejecutable: falta `tsc` en el worktree. La verificación productiva queda obligatoria después del despliegue.
- Siguiente punto cero: commit y deployments productivos de este cambio, con Threads comprobado en producción.

## Checkpoint — Google Business y cuidado de tokens — 2026-10-17

- Task ID: `GMB-CIERRE-20261016`. Commits: `dca4ff53`, `d20e06f9`, `1d721742`, `bd57a872`. Deployments: GitHub `7128972685`, `7129447154`, `7129649611` en `success`.
- Alcance: worker de Google Business, cliente PostPeer, generador de imagen IA, documento y prueba de cuidado de tokens. Sin migraciones ni workflows.
- Evidencia: publicación de prueba con Lorena Álvarez y reintento con Antonio Aguirre confirmados en Google por Milton; pruebas unitarias nuevas (PostPeer 7/7, candidatos 3/3, guardiana 1/1, reutilización 1/1); typecheck de los archivos tocados.
- Resultado: CERRADO. No se publicó ninguna propuesta pasada ni se generó imagen en pruebas.
- Siguiente punto de partida: pendientes listados en la Coordinación (`GMB-CIERRE-20261016`).

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

## Checkpoint 16 — Volver al Inicio — 2026-10-17

- Punto cero: producción Vercel `dpl_BxyHihabAupym2Tw3DiXdXzoiV6r`, `READY`,
  `main`, sin ramas ni worktrees adicionales.
- Cambio: `DashboardNav` renombra la entrada compartida `Volver al HUB` a
  `Volver al Inicio`, manteniendo el destino oficial del Hub.
- Alcance: Artículos y Redes; sin cambios de rutas, permisos, autenticación,
  datos ni navegación global.
- Código publicado: `3e181b79`.
- Deployment: `dpl_9NLNZAzUA5TuTTKz7896g1SZiEEY`, `READY`, aliases productivos
  activos.
- Validación: build OK y suite `240/240`; el único aviso local restante es un
  typecheck preexistente por variable no usada en `bing-client-change.test.ts`.
- Estado: PRODUCCIÓN, CERRADO.

## Checkpoint 15 — aislamiento del menú propio de Redes — 2026-10-16

- Punto cero de partida: producción verificada del deployment `dpl_FdSLPtRq3jC53rfZcekMT3W1H6f9`; se trabajó sobre `main`, sin ramas ni worktrees.
- Regresión confirmada: Redes mostraba `SEO Total Artículos`. La etiqueta `Admin Redes` ya estaba corregida, pero el catálogo completo de `PRODUCT_ENTRIES` seguía renderizándose en ese host.
- Corrección publicada: `DashboardNav` filtra el menú por host; Redes recibe solo su grupo, Artículos solo el suyo y el Hub compartido mantiene ambos.
- Código publicado: `d6b0ac20000c70ee66b79cdf54ae9783b1f3da08`.
- Deployment productivo: `dpl_2H4BhWtbetcEkAFHUgLpBzixZZFE`, `READY`.
- Validación local: typecheck, build de producción y `git diff --check` OK.
- Evidencia E2E: Redes `.net` muestra `SEO Total Redes`, `Configuración`, `Admin Redes` y su submenu propio; no muestra Artículos. Artículos `.net` conserva `SEO Total Artículos` y `Admin Artículos`, sin Redes. La tarjeta de Redes sigue visible en el Hub.
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

## Checkpoint 14 — navegación y submenú de Redes — 2026-10-16

- Punto cero de partida: `main` alineada con producción en `57ac8e28346c6f8823f80338660745cd9a3a24b9`; no se crearon ramas ni worktrees.
- Hallazgo real: el Hub ya mostraba `AUTOMATIZA TUS REDES SOCIALES`; Redes ya recibía el shell y el submenú, pero el grupo administrativo estaba mal rotulado como `Admin Artículos`.
- Cambio mínimo: `Admin Redes` para el host de Redes; `Admin Artículos` se conserva para Artículos. No se alteraron rutas, permisos ni datos.
- Código publicado: `945fe5fcd2af2d1d7383bc4f61dc110bd6875805`.
- Deployment: `dpl_FdSLPtRq3jC53rfZcekMT3W1H6f9`, `READY`.
- Evidencia E2E: Redes `.net` mostró `Admin Redes` expandido con `Usuarios`, `Composio` y `PostPeer`; el Hub conservó la tarjeta de Redes visible.
- Estado: PRODUCCIÓN, CERRADO.

## Checkpoint 10 — MCP: claridad de Redes, estilos, automatización y renovación OAuth — 2026-10-16 16:40 ET

- Task ID: `MCP-REDES-CLARIDAD-20261016`. Producto: `10minuteswebsite/auto-articulos`.
- Commit de código: `4bbf565a` (PR #601). Commit de `main` al verificar: el mismo. Commits MCP previos en producción: `dc4203f0`, `748c3dec`, `334d59d0`, `81c40c87`.
- Deployment: `dpl_4rtM1ewRc2bXtQRmcuASB3yhahFR` (`READY`, git, aliases asignados). Previos: `dpl_GYJ9mEpJ4ZnUWGugK6zCK6PkCfNf` (#566), `dpl_ExEP7ywHp3FNiMFQgkwQ8NWDxks9` (#581), `dpl_8MnYqAW7NceduJdVMh5pzzDZLc2b` (#593), `dpl_85mLnuS9qpun6bJt2NAdcG23m1Ey` (#594).
- Punto de partida verificado: `main` `9bcfded8` = producción `dpl_pw7h2Absd4LgCfbMWfC7D9JYnsgt`.
- CURRENT_STATE y BASELINE (sección «Contrato MCP») actualizados.
- Pruebas: 227 en `apps/web`, 204 correctas; 23 fallos del paquete `shared` instalado localmente desactualizado (`evaluateProductAccess`), ajenos y distintos del fallo de `mcp.test.ts`, que era mío y quedó corregido; pruebas MCP/OAuth 22/22.
- Evidencia de producción: HTTP de los seis dominios; logs de Vercel con 7 renovaciones OAuth 200 sin `authorize` el 16/10 (arreglo #566 comprobado); rechazo limpio `invalid_grant` con refresh falso.
- Riesgos: herramientas de Redes y estilos NO probadas en vivo con un asistente real; las personas deben volver a copiar el prompt de la pantalla del MCP.
- Siguiente responsable: quien reciba la prueba en vivo con Catalina/Lorena (una publicación por red, borrar propuestas sobrantes, visto bueno de Milton antes de cada publicación real).

### Auditoría de cobertura documental (Task `MCP-REDES-CLARIDAD-20261016`)

| Documento | Task ID | Commit | Deployment | Checkpoint | Alcance | Evidencia | Resultado |
|---|---|---|---|---|---|---|---|
| COORDINACION_CLAUDE_CODEX.md | sí | `4bbf565a` | `dpl_4rtM1ewR…` | 10 | sí | sí | publicado y verificado |
| CONTROLADOR_DE_VERSIONES.md | sí | `4bbf565a` | `dpl_4rtM1ewR…` | 10 | sí | sí | publicado y verificado |
| INVENTARIO_CONVERSACIONES.md | sí | `4bbf565a` | `dpl_4rtM1ewR…` | 10 | sí | sí | publicado y verificado |
| CEREBRO.md | sí | `4bbf565a` | `dpl_4rtM1ewR…` | 10 | sí | sí | publicado y verificado |
| CURRENT_STATE.md | sí | `4bbf565a` | `dpl_4rtM1ewR…` | 10 | sí | sí | punto cero vigente |
| BASELINE.md | sí | `4bbf565a` | `dpl_4rtM1ewR…` | 10 | sí | sí | contrato MCP |
| CHECKPOINTS.md | sí | `4bbf565a` | `dpl_4rtM1ewR…` | 10 | sí | sí | este registro |

## Checkpoint 11 — prompts por producto y automatización con aceptación única — 2026-10-16 17:00 ET

- Task ID: `MCP-PROMPTS-POR-PRODUCTO-20261016`. Commit de código: `4836deaf` (PR #606); punto de partida `main` `4a736c60`.
- Deployment: `dpl_J9bQtR8XPmRHDA6LFPiXCQq7wvBx` (`READY`, git).
- CURRENT_STATE y BASELINE actualizados.
- Pruebas: pruebas MCP 28/28; suite completa de `apps/web` 230 con 23 fallos del paquete `shared` local desactualizado (ajenos, mismos de siempre).
- Evidencia de producción: HTTP de los seis dominios y rechazo limpio de OAuth (ver CURRENT_STATE). La pantalla por host con sesión real NO se verificó.
- Riesgos: personas deben volver a copiar el prompt; host `seototal` por decidir; automatización no probada en vivo con un asistente real.
- Siguiente responsable: verificación visual con la cuenta de Lorena y prueba en vivo con Catalina.

### Auditoría de cobertura documental (Task `MCP-PROMPTS-POR-PRODUCTO-20261016`)

| Documento | Task ID | Commit | Deployment | Checkpoint | Alcance | Evidencia | Resultado |
|---|---|---|---|---|---|---|---|
| COORDINACION_CLAUDE_CODEX.md | sí | `4836deaf` | `dpl_J9bQtR8X…` | 11 | sí | sí | publicado; pantalla por host sin verificar con sesión |
| CONTROLADOR_DE_VERSIONES.md | sí | `4836deaf` | `dpl_J9bQtR8X…` | 11 | sí | sí | publicado |
| INVENTARIO_CONVERSACIONES.md | sí | `4836deaf` | `dpl_J9bQtR8X…` | 11 | sí | sí | publicado |
| CEREBRO.md | sí | `4836deaf` | `dpl_J9bQtR8X…` | 11 | sí | sí | decisiones registradas |
| CURRENT_STATE.md | sí | `4836deaf` | `dpl_J9bQtR8X…` | 11 | sí | sí | punto cero vigente |
| BASELINE.md | sí | `4836deaf` | `dpl_J9bQtR8X…` | 11 | sí | sí | contrato de prompts |
| CHECKPOINTS.md | sí | `4836deaf` | `dpl_J9bQtR8X…` | 11 | sí | sí | este registro |

## Checkpoint 12 — cierre y archivo de la conversación MCP — 2026-10-17 (America/New_York)

- Task ID: `MCP-CIERRE-20261017`. Producto: `10minuteswebsite/auto-articulos`, rama única `main`.
- Commit de `main` al cerrar: `e5414d1a` (incluye mi último código `4836deaf`). Deployment: `dpl_At7F1QJYaUzy9mdkGUyX2KRM4VZu` (`READY`).
- CURRENT_STATE y BASELINE: sin cambio de comportamiento en este cierre (N/A; el contrato MCP vigente es el del Checkpoint 11).
- Pruebas: sin cambios de código; las del Checkpoint 11 siguen vigentes (28/28 MCP).
- Evidencia: HTTP `articulos` y `redes` `.com` (`/login` 200, `/api/mcp` 401) el 2026-10-17; 8 PR fusionados y ninguno abierto; ramas propias eliminadas.
- Riesgos/pendientes: ver Coordinación (entrada «CIERRE Y ARCHIVO»), 5 puntos con dueño Milton.
- Siguiente responsable: quien reciba la prueba en vivo con Catalina/Lorena o los pendientes de Milton.

### Auditoría de cobertura documental (Task `MCP-CIERRE-20261017`)

| Documento | Task ID | Commit | Deployment | Checkpoint | Alcance | Evidencia | Resultado |
|---|---|---|---|---|---|---|---|
| COORDINACION_CLAUDE_CODEX.md | sí | `4836deaf`/`e5414d1a` | `dpl_At7F1QJ…` | 12 | sí | sí | cerrado y archivado |
| CONTROLADOR_DE_VERSIONES.md | sí | `4836deaf`/`e5414d1a` | `dpl_At7F1QJ…` | 12 | sí | sí | cierre registrado |
| INVENTARIO_CONVERSACIONES.md | sí | `4836deaf`/`e5414d1a` | `dpl_At7F1QJ…` | 12 | sí | sí | reservas liberadas |
| CEREBRO.md | sí | `4836deaf` | `dpl_J9bQtR8…` | 12 | sí | sí | lecciones y pendientes |
| CURRENT_STATE.md | sí | `4836deaf`/`e5414d1a` | `dpl_At7F1QJ…` | 12 | sí | sí | punto cero MCP vigente |
| BASELINE.md | sí | N/A (sin cambio de comportamiento) | N/A | 12 | N/A | N/A | contrato MCP del Checkpoint 11 vigente |
| CHECKPOINTS.md | sí | `e5414d1a` | `dpl_At7F1QJ…` | 12 | sí | sí | este registro |

## Checkpoint 17 — visibilidad desde sesiones Hub — 2026-10-17

- Hallazgo: `Volver al Inicio` estaba condicionado a sesiones sin shell global;
  por eso no se veía al entrar desde el Hub.
- Cambio mínimo: la entrada se muestra en ambos contextos y mantiene el destino
  `https://hub.lasolucionweb.net`.
- Código: `c69c9628`.
- Deployment: `dpl_HEoU6gp5XJN6PoHpRHaYik4rRWtt`, `READY`, aliases productivos activos.
- Validación: build y suite `240/240`.
- Estado: PRODUCCIÓN, CERRADO.

## Corrección de logout y navegación Hub — 2026-10-19

- Punto cero: producción en main, commit funcional final a2f3406e9dfe154188e180d204f82ea08e8558ee, deployment Vercel dpl_H6HNToZ9agcLBf5WxPnMe4KkVRCS (READY), con los seis dominios de producto asignados.
- Hallazgo: /api/auth/logout borraba las cookies usando process.env sin seleccionar la familia del host receptor. En el flujo .net, el logout podía no borrar la cookie compartida .lasolucionweb.net.
- Corrección: el endpoint usa cookieEnvForHost(request.nextUrl.hostname) al borrar sesión, suplantación y contexto Hub. Se añadió prueba de regresión para una variable global mal configurada.
- Corrección visual: se eliminó del DashboardNav la entrada Volver al Inicio; no se alteraron los enlaces internos de las páginas.
- El botón de logout ahora es explícitamente type="button", envía la petición con credentials: same-origin y redirige incluso si la petición falla.
- Verificación real: con una sesión iniciada en seototal.lasolucionweb.net/dashboard, pulsar Salir llevó a Auth0 y después a hub.lasolucionweb.net/login; al volver a seototal.lasolucionweb.net/dashboard, producción respondió con /login. La navegación visible no mostró Volver al Inicio.
- Alcance: esta evidencia cubre el botón Salir del dashboard, que ejecuta primero el logout de Auto Artículos y después el logout de Auth0. Un logout iniciado exclusivamente desde otra aplicación del HUB debe seguir usando este mismo contrato si se quiere invalidar también la cookie de Auto Artículos.

## Checkpoint — Punto 1 de sesión/OAuth cerrado — 2026-10-19

- Objetivo: limpiar cookies temporales de OAuth también en errores y cancelaciones.
- Resultado: helper común `clearOAuthFlowCookies` y callbacks de Twitter/X, LinkedIn, Pinterest, Blogger y Bing corregidos.
- Tumblr queda fuera del cambio porque usa un pending cifrado server-side, no cookie de state. Threads, Instagram, Google Search Console, Google Analytics y Business Profile no exponen aquí callbacks con esa cookie.
- Código: `849ba35bd4bb7f77d3f79063d12495a37075f44d`.
- Producción: `dpl_AWAZPEAmvnZgoVUN5yxJUox6bDhQ`, `READY`; Vercel reportó build y typecheck correctos.
- Verificación pública sin sesión: endpoints protegidos responden `401`. La autorización real queda pendiente porque requiere una cuenta/sesión autorizada.


## Cierre del Punto 4 — logout cruzado HUB → Auto Artículos — 2026-10-19

- Código publicado en `main`: `c28f8ccef86aee1e41c828b6eee1d0141b3eaed9`.
- Corrección: `/api/auth/logout` queda público para que el puente pueda limpiar las cookies de Auto Artículos aunque ya no exista una sesión local; la ruta GET borra las cookies y redirige de forma segura al HUB.
- Vercel: deployment `dpl_8q4iRMCe2iyPYh6VeJ3quKw3G5cd`, estado `READY`, producción; aliases personalizados incluidos `seototal.lasolucionweb.com`, `seototal.lasolucionweb.net`, `articulos.*` y `redes.*`.
- Verificación pública: el flujo `hub.lasolucionweb.net/auth/logout` → puente `seototal.lasolucionweb.com/api/auth/logout` → HUB terminó en `https://hub.lasolucionweb.net/login`, sin JSON `No autenticado` ni pantalla Auth0 Oops.
- La verificación se hizo sin una sesión activa de Auto Artículos; queda separada la comprobación con una cookie real del producto para observar físicamente su expiración en el navegador.


## Verificación E2E final — logout cruzado con sesión real — 2026-10-19

- Se abrió una sesión real desde el HUB y se lanzó Auto Artículos en `articulos.lasolucionweb.net/dashboard`; el dashboard mostró la cuenta autenticada.
- Se ejecutó logout desde `hub.lasolucionweb.net/auth/logout`.
- Resultado verificado: `articulos.lasolucionweb.net/dashboard` redirigió a `/login`; la cookie de la familia `.lasolucionweb.net` dejó de ser utilizable.
- El HUB también quedó sin sesión: `hub.lasolucionweb.net/dashboard` redirigió al login de Auth0.
- El puente de Auto Artículos ya estaba publicado en `dpl_8q4iRMCe2iyPYh6VeJ3quKw3G5cd`; la corrección de ambas familias vive en el HUB, commit `7e4628cba95564736d3d18f3f7e7574533e72077`, Cloudflare `73a6fbcd`, 100%.
- Punto 4: COMPLETADO. No se comparten cookies entre `.com` y `.net`; el HUB visita ambos orígenes para borrarlas.


## Evidencia adicional — cookies inspeccionadas sin leer valores — 2026-10-19

- Tras el logout cruzado se inspeccionaron solo nombre, dominio y ruta mediante el navegador.
- En `articulos.lasolucionweb.net`, `seototal.lasolucionweb.net` y `seototal.lasolucionweb.com` no quedó ninguna cookie de sesión de Auto Artículos; solo permanecieron `_fbp` y `_gcl_au` de analítica/marketing.
- No se leyeron ni registraron valores de cookies.
