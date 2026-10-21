# HANDOFF VIGENTE — 2026-10-19

## BLOG IA Fases 2-3 — 2026-10-21 — en `main`, OCULTO a clientes; verificación autenticada pendiente

- Task ID: `BLOG-IA-FASE-2-3-20261021`. PR #598 fusionado: commit `74f61ee09d964ac28b080205abc4335d0514a402`.
- Orden: migración ANTES del código. Workflow `Migración manual de base de datos` con la opción nueva `safe_blog_ia` (run `39668041448`, rama del PR): aplicó SOLO `20261016120000_add_blog_ia` y `20261021120000_blog_ia_wizard` (límite de bloqueo 5 s) y su verificación de solo lectura pasó (valor `BLOG`, tabla `BlogIaBlog`, 6 columnas, `hostname` opcional). El paso general `migrate deploy` se omitió a propósito.
- Vercel (`auto-articulos-web` y `web`): `success` en la vista previa y en el commit fusionado.
- Producción pública posterior: Artículos y Redes `/login` 200; `/api/me` 401; `/api/blog-ia` y `/api/blog-ia/analyze` 401 sin sesión; `/dashboard/blog-ia` sin sesión 307 al login; el login no menciona BLOG IA.
- BLOG IA está OCULTO a los clientes por orden de Milton: módulo opt-in `secret` (solo admin o «Habilitado»), 403/«Página no disponible» sin nombrarlo, y el gancho de «Actualizaciones» ignora los commits de BLOG IA. No hay Worker, D1 con datos ni dominio público: el Worker del blog NO está desplegado (en Cloudflare existen D1 `blog-ia` y R2 `blog-ia-media`, vacíos y privados).
- Pendiente obligatorio: prueba AUTENTICADA en producción (cuenta cliente sin el módulo: sin menú ni pantalla; cuenta admin: pantalla visible) y confirmación de que `/dashboard` sigue cargando. No se declara cierre funcional completo hasta entonces. Aún sin E2E real: Worker/D1/R2/Custom Hostnames, OpenAI dentro de la cola, Search Console del blog.
- Capitanía de migración liberada.

## INCIDENTE AUTO ARTICULOS 500 en /auth/hub — 2026-10-21 — resuelto y verificado

- Task ID: `ARTICULOS-500-AUTH-HUB-20261021`.
- Síntoma: `articulos.lasolucionweb.net/auth/hub?app=seo-total&code=...` devolvía HTTP 500 al entrar desde el HUB.
- Causa raíz (logs de Vercel): `PrismaClientKnownRequestError P2022`, la columna `User.disableIndexing` no existía en la base de producción. El commit `7531dc5c` (Codex, CONTROL NO INDEXAR ARTÍCULOS) la declaró en `schema.prisma` junto con la migración `20261021120000`, que nunca se aplicó; todas las consultas de `User` por Prisma fallaban (también `/api/me` raw 42703 y la revalidación de acceso HUB).
- Corrección: Milton ejecutó en Supabase `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "disableIndexing" BOOLEAN NOT NULL DEFAULT false;` (aditivo, sin tocar datos). No hubo cambio de código ni deployment.
- Verificación en producción: último error P2022 a las 15:56:14; después, ninguno. Acceso real desde el HUB a las 16:03:00: `GET /auth/hub` 303 sin error. Smoke: `/login` Artículos y Redes 200, `/api/me` sin sesión 401.
- Corrección del cierre previo: el cierre «CERRADO» de `d8cebcb0` era prematuro, no se había aplicado la migración.
- Lección: migración antes o junto con el merge; verificar la columna en la base, no solo una pantalla.
- Repetibilidad: opción `safe_user_indexing_preference` añadida a `migrate.yml` (commit `5e03ce76`, solo aditiva, no ejecutada porque la columna ya existe).
- Punto cero siguiente: `main` en `5e03ce76`; producción sana (`/login` 200 en Artículos y Redes, `/api/me` 401 sin sesión, `/auth/hub` con código inválido 307, con acceso real 303). Estado: CERRADO.
- BASELINE no cambia: no hubo cambio visual ni de comportamiento protegido.

## Cierre condicionado — estado HUB→MCP para Redes — 2026-10-21

- Task ID: `MCP-HUB-REDES-20261021`.
- Commit publicado en `main`: `fd19b682` (`fix: propagate HUB Redes entitlement to MCP`).
- Producción pública posterior: Artículos `/login` 200, Redes `/login` 200, descubrimiento OAuth MCP 200 y `/api/mcp/capabilities` 401 sin autenticación.
- Cambio: el MCP consulta el permiso efectivo de Redes del HUB; filtra herramientas/prompts sociales, comunica el estado en `initialize` y devuelve un mensaje accionable si se intenta operar con Redes apagado.
- Pruebas locales: 247/247; `git diff --check` limpio. Typecheck bloqueado por error preexistente no relacionado: `latestBingChange` declarado sin uso en `bing-client-change.test.ts`.
- Limitación: falta prueba autenticada de `initialize`/`tools/list` con una cuenta HUB activada y desactivada; no se declara verificación funcional completa ni éxito de deployment Vercel sin esa evidencia.

## CONTROL NO INDEXAR ARTÍCULOS — 2026-10-21 — desplegado y verificado

- Producción pública: `articulos.lasolucionweb.net/login` respondió 200. Después del despliegue se verificó autenticadamente `/dashboard/configuracion/indexacion` con la cuenta `lorenalvarez30@gmail.com`.
- `main`/GitHub: corrección final `d8cebcb0` (`fix: avoid stale prisma user client for indexing preference`).
- Vercel `la-solucion-web/auto-articulos-web`: deployment asociado a `d8cebcb0`, estado `Ready`.
- `User.disableIndexing` se guarda con migración, aparece en Configuración → Indexación y alimenta Publicar/Oportunidades; una decisión explícita del selector prevalece.
- Los deployments anteriores fallaron por el cliente Prisma stale; la corrección final usa SQL parametrizado para la preferencia y el deployment quedó `Ready`. La pantalla productiva cargó correctamente la preferencia persistida sin modificarla.

## Cierre condicionado — revisión factual de blogs — 2026-10-21

- Task ID: `REVISION-CONTENIDO-BLOGS-20261021`.
- Commit publicado en `main`: `04910056a6f6bd5c081b33970baf76c5b27deec0`.
- Cambio: norma factual añadida a generación de artículos, títulos y FAQs; 10MWS no modificado.
- Punto cero productivo confirmado por smoke HTTP: Artículos y Redes responden `/login` 200, rutas protegidas 307/401; esto confirma salud pública, no el SHA servido.
- Deployment Vercel productivo: `6wAi9CqW6tjQTeW9qxpiHPkuUiYd`, estado `Ready`, aliases productivos activos; Vercel muestra el commit `04910056`.
- Estado: VERIFICADO. El commit documental posterior `0d64c780` no cambia runtime.

## Cierre — mensaje de login genérico — 2026-10-21

- Task ID: `LOGIN-MENSAJE-GENERICO-20261021`. Commit `45569e14` en `main` (worker: `categorySync.ts`, `automation/10minutesWebsite.ts`).
- Punto cero previo: `main` en `270eafa9`, workers `success`. Sin migración, datos ni permisos.
- Cambio: los errores de inicio de sesión ya no nombran dominios ni servidores ni el «detalle técnico»; solo indican que las credenciales guardadas no sirven.
- Verificación: `tsc` sin errores nuevos en los archivos tocados. El worker toma el código de `main` en cada corrida; la comprobación con un login fallido real queda pendiente de un caso natural.


## META — historias y carruseles — 2026-10-20

- Commit en `main`: `943a0231` (`fix(web): remove unused admin image flag`), deployment Vercel `9ikVLnzfaDe8nZAMR2JdTarnx5x8`, `Ready`.
- Alcance: Instagram Carrusel de cinco láminas, numeración, formato `1080×1350`, identidad visual derivada del logo sin insertar el logo, validación anti-corte y persistencia de assets.
- Verificación local: worker `20/20`, pruebas específicas `4/4`, build de worker y web correctos.
- Migración productiva `20261020130000_add_social_opportunity_assets` aplicada por workflow `39435521352`, `success`.
- Verificación HTTP posterior: `/login` `200`, `/api/me` `401` sin sesión y generación sin sesión `401`.
- Pendiente: prueba autenticada de creación/publicación real; no hay sesión de usuario disponible en este entorno.

## Punto cero — estilo problema-solución publicado (2026-10-19)

- Task ID: `PROMPT-DEFAULT-PROBLEMA-SOLUCION-20261019`.
- Código: `e0b6cf8a` en `main`; deployment Vercel `3FJBdcyeAsh7Kh3Q2CYVrtqLV5fJ`, `success`.
- Datos: workflow `39340883977` ejecutó únicamente `safe_problem_solution_default_prompt`; el paso terminó correctamente.
- Verificación HTTP posterior: Artículos `/login` 200 y `/api/me` sin sesión 401. No hubo sesión autenticada disponible para prueba visual.
- Siguiente punto cero: `main` en `e0b6cf8a` y base productiva con el prompt problema-solución asignado a todas las cuentas.

Este bloque prevalece sobre las notas históricas posteriores del archivo.

- Harness aplicado: producción verificada como verdad funcional; GitHub como memoria durable; rama única `main`; sin ramas ni worktrees.
- Punto 4 de sesión/logout: COMPLETADO y verificado con sesión real.
- Auto Artículos: código `c28f8ccef86aee1e41c828b6eee1d0141b3eaed9`, Vercel `dpl_8q4iRMCe2iyPYh6VeJ3quKw3G5cd`, `READY`.
- HUB: puente final `7e4628cba95564736d3d18f3f7e7574533e72077`, Cloudflare `73a6fbcd`, 100% en producción.
- El logout del HUB recorre las familias `.com` y `.net`; después de la prueba, Auto Artículos llevó a `/login`, el HUB llevó a Auth0 login y no quedaron cookies de sesión. Solo permanecieron `_fbp` y `_gcl_au`; no se leyeron valores.
- No modificar de nuevo el puente de logout salvo que aparezca nueva evidencia productiva.

## Siguiente trabajo autorizado

1. Reconexiones OAuth reales, empezando por Bing.
2. Auditoría manual de URLs en las consolas externas.
3. Registrar resultados y limitaciones en los documentos Harness.

Punto de entrada obligatorio: leer este bloque, el último checkpoint y `BASELINE.md` antes de programar.

# CURRENT_STATE — Punto cero real

## Cierre — Threads/PostPeer: botón de conexión — 2026-10-19

- Task ID: `THREADS-POSTPEER-BOTON-20261019`. Commit funcional `474ed73ca6796672c4d274e8b310f2d23e8b301c` en `main`.
- Deployments productivos: Vercel `web` `5XcP7ZMdrRhTWHeGuN3SNeRXrJSn` y `auto-articulos-web` `6W6fHM4eaLN59CXxBfcFww6C1KAh`; ambos `success`.
- HTTP productivo verificado; la pantalla autenticada redirige a `/login` sin sesión (`307`). No se declara E2E autenticado de Juan por falta de sesión.
- Siguiente punto cero: `main` en la punta remota posterior a `474ed73c`; validación visual de Juan queda pendiente de sesión autenticada.

## En curso — Threads/PostPeer: botón de conexión — 2026-10-19

- Task ID: `THREADS-POSTPEER-BOTON-20261019`.
- Punto cero productivo confirmado: `origin/main` en `cfe380006423950da5447a12d0d6896421941d5f`; deployments `Production – web` y `Production – auto-articulos-web` de ese commit en `success` el 2026-10-19.
- Causa confirmada: `OAuthNetworkSection` consulta `/api/search-integrations/threads/settings`, ruta eliminada al migrar Threads a PostPeer; el 404 se interpreta como `configured=false` y oculta `Conectar con Threads`.
- Cambio: Threads omite esa comprobación antigua y conserva `/api/postpeer/threads/connect`.
- Sin migración, sin cambio de datos ni permisos; se protegen PostPeer, las demás redes y las conexiones existentes.

## Nota de cierre MCP — 2026-10-17

- La conversación «PROBLEMAS CON MCP ARTICULOS» quedó CERRADA Y ARCHIVADA (Task `MCP-CIERRE-20261017`). El estado del MCP en producción está descrito en la sección «Punto cero vigente — prompts por producto» y en el Checkpoint 11/12; el último código MCP es `4836deaf`. Producción al cierre: `e5414d1a`, `dpl_At7F1QJYaUzy9mdkGUyX2KRM4VZu` (`READY`).

## Cierre Google Business y cuidado de tokens — 2026-10-17

- Código funcional de esta conversación en `main`: `dca4ff53` (#605), `d20e06f9` (#609), `1d721742` (#611), `bd57a872` (#612). Despliegues de producción verificados `success`; Redes `/login` 200.
- Comportamiento vigente: una respuesta de PostPeer con `success:false`/`error` marca la publicación como rechazada con el motivo; el worker de Google Business toma también artículos aprobados sin resumen; la imagen IA de Post, Story, Reel-image y Pinterest se reutiliza 48 h en reintentos.
- Problemas conocidos: corrida programada de respaldo de `social-worker.yml` casi inexistente; Carrusel/Infografía de Instagram sin reutilización; cascada de modelos pagados (R2); Composio y fal.ai sin auditar. Detalle en `CUIDADO_DE_TOKENS.md` y en Coordinación (`GMB-CIERRE-20261016`).

Fecha de auditoría: 2026-10-16 (America/New_York)

## Punto cero vigente — prompts por producto — 2026-10-16 17:00 (America/New_York)

- Task ID: `MCP-PROMPTS-POR-PRODUCTO-20261016`. Commit de código servido: `4836deaf` (`4836deaf3645db7215a3a9c30fd47580f95a5e92`, squash del PR #606; padre `4a736c60`). Deployment: `dpl_J9bQtR8XPmRHDA6LFPiXCQq7wvBx`, `READY`, origen git, creado 2026-10-16 20:48Z.
- Árbol de `main` = árbol verificado antes de publicar (`03af7339`); diff contra `4a736c60` = 7 archivos (151 añadidas, 52 quitadas, todas de la pantalla/prompts del MCP).
- Comportamiento publicado: la pantalla de Asistentes IA muestra el prompt de Redes en `redes`, el de Artículos en `articulos` y, en el host combinado, el de Artículos más la sección de Redes. La automatización se propone, la persona la acepta una vez y corre sola sin aprobar cada publicación; frecuencia por defecto: Artículos 3 al día (07:00, 12:00, 19:00), Redes 1 al día por red (10:00) o solo las redes elegidas con su horario.
- Comprobado en producción por HTTP: seis dominios (`/login` 200, salvo `seototal.com` 307 al HUB; `/` y `/dashboard` 307; `/api/mcp` sin token 401; `/dashboard/configuracion/mcp` sin sesión 307); `POST /api/oauth2/token` con refresh falso → `invalid_grant` 400.
- NO verificado todavía: la pantalla `/dashboard/configuracion/mcp` por host con una sesión real (requiere iniciar sesión). Pendiente de confirmar con la cuenta de Lorena; el host `seototal` queda pendiente de decisión de Milton.
- Siguiente punto de partida: `main` más reciente; leer este archivo, `BASELINE.md` (Contrato MCP) y Checkpoint 11.

## Punto cero vigente — MCP en producción — 2026-10-16 16:40 (America/New_York)

- Task ID: `MCP-REDES-CLARIDAD-20261016`. Repositorio `10minuteswebsite/auto-articulos`, rama única `main`.
- Commit de código servido: `4bbf565a` (`4bbf565ac2a096d749db8b78b2e2a45db783b317`, squash del PR #601; padre `9bcfded8`).
- Deployment productivo: `dpl_4rtM1ewRc2bXtQRmcuASB3yhahFR`, `READY`, origen git, creado 2026-10-16 20:29Z, aliases asignados.
- Árbol de `main` = árbol verificado antes de publicar (`e9e8590b`): no se sobrescribió nada ajeno; diff contra `9bcfded8` = 12 archivos, 139 líneas añadidas.
- Producción comprobada por HTTP en los seis dominios: `/login` 200 (salvo `seototal.com` 307 al HUB, como documenta el baseline), `/` y `/dashboard` 307, `/api/mcp` sin token 401, `/.well-known/oauth-protected-resource` 200; `POST /api/oauth2/token` con refresh falso responde `invalid_grant` 400 (rechazo limpio, no 500).
- MCP en producción (commits en `main`): `dc4203f0` OAuth refresh (#566), `748c3dec` alcance + automatización de artículos (#581), `334d59d0` Redes (#593), `81c40c87` estilos de escritura (#594), `4bbf565a` claridad de Redes + corrección de prueba (#601).
- Evidencia del arreglo OAuth (#566) en logs reales de Vercel: el 16/10 hay 7 `POST /api/oauth2/token` 200 sin `authorize` previo (05:57, 08:18, 08:24, 09:19, 11:51, 12:54, 14:18 ET), tras la reautorización de las 05:23; antes del arreglo ninguna renovación tuvo éxito (400 el 13 y 14/10).
- Pendiente de comprobar en vivo con un asistente real: las herramientas de Redes y de estilos con Catalina/Lorena y Arantza (requieren token personal u OAuth de una cuenta; no se probó publicando).
- Siguiente punto de partida: `main` más reciente en GitHub; leer este archivo, `BASELINE.md` (sección MCP) y el último checkpoint (10).

## Identidad del sistema

- Repositorio canónico: `https://github.com/10minuteswebsite/auto-articulos`.
- Rama única autorizada: `main`.
- Commit funcional productivo verificado: `d6b0ac20000c70ee66b79cdf54ae9783b1f3da08`.
- Producción: Vercel, proyecto `la-solucion-web/auto-articulos-web`.
- Deployment funcional observado: `dpl_2H4BhWtbetcEkAFHUgLpBzixZZFE`.
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

## Verdad funcional vigente — aislamiento de navegación por host — 2026-10-16

- Código y deployment vigentes: `d6b0ac20000c70ee66b79cdf54ae9783b1f3da08` / `dpl_2H4BhWtbetcEkAFHUgLpBzixZZFE` (`READY`).
- Causa de la regresión: la vista de producto reutilizaba `PRODUCT_ENTRIES` completo en ambos dominios; por eso el menú de Redes incluía Artículos.
- Corrección: `DashboardNav` selecciona las entradas según el host. Redes solo muestra `SEO Total Redes` y su configuración; Artículos solo muestra `SEO Total Artículos` y su configuración; el grupo administrativo conserva su etiqueta por producto.
- Verificación E2E: `redes.lasolucionweb.net` muestra `Inicio`, `SEO Total Redes`, `Configuración` y `Admin Redes`; al abrir Redes aparecen sus destinos propios. `articulos.lasolucionweb.net` mantiene `SEO Total Artículos` y `Admin Artículos`, sin entradas de Redes.

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
- Código vigente en `main`: `945fe5fcd2af2d1d7383bc4f61dc110bd6875805`.
- Deployment productivo: `dpl_FdSLPtRq3jC53rfZcekMT3W1H6f9`, `READY`.
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

## Corrección de navegación de Redes — 2026-10-16

- Hallazgo en producción: Redes heredaba el texto `Admin Artículos` aunque el shell, la subbarra y el submenú sí estaban presentes.
- Corrección mínima: el grupo administrativo usa `Admin Redes` cuando el host es `redes.lasolucionweb.net`/`.com`; Artículos conserva `Admin Artículos`. Rutas, estilo, permisos y destinos (`Usuarios`, `Composio`, `PostPeer`) no cambiaron.
- Código productivo: `945fe5fcd2af2d1d7383bc4f61dc110bd6875805`.
- Deployment: `dpl_FdSLPtRq3jC53rfZcekMT3W1H6f9`, `READY`.
- Verificación real: Redes `.net` mostró shell global, `SEO Total Redes`, `Difusión social`, `Admin Redes` y su submenú completo; el Hub mantuvo visible `AUTOMATIZA TUS REDES SOCIALES`.

## Etiqueta de salida al Hub — 2026-10-17

- Punto cero: producción Vercel `dpl_BxyHihabAupym2Tw3DiXdXzoiV6r`, `READY`,
  con `main` limpia antes de editar.
- Cambio mínimo: la entrada compartida de `DashboardNav` conserva el destino
  `https://hub.lasolucionweb.net` y cambia únicamente su texto de `Volver al HUB`
  a `Volver al Inicio`. Artículos y Redes reciben la misma etiqueta; no cambian
  rutas, permisos, autenticación ni el encabezado global.
- Código publicado: `3e181b79`.
- Deployment verificado: `dpl_9NLNZAzUA5TuTTKz7896g1SZiEEY`, `READY`, con aliases
  productivos de Artículos y Redes activos.
- Validación: build de producción OK; suite `240/240`; el typecheck aislado local
  conserva un error preexistente en `src/lib/bing-client-change.test.ts` por una
  variable no usada, fuera de este cambio.

## Rescate de títulos y anti-canibalización — 2026-10-16

- Causa probada de la republicación de «Aspectos clave para comprar propiedades en Orlando desde Medellín» (cuenta Antonio Aguirre): rescate prematuro de un título recién reclamado. El primer artículo es válido y sigue publicado; la segunda corrida terminó en error de título duplicado.
- Código en producción: PR #599, commit `2de420bb3037cd940b370a24a03faea8516689fe`. Verificado el bloqueo web (`409 ALREADY_PUBLISHED`) y el arranque del worker; corrida real del worker `38959171399` en `success`, sin falsos rescates, confirmada por Milton. Solo queda sin provocar en vivo el repetido ante el worker (cubierto por pruebas).

## Visibilidad de Volver al Inicio desde sesiones Hub — 2026-10-17

- Hallazgo: el enlace ya estaba publicado, pero `DashboardNav` lo añadía solo
  cuando `showHubNavigation` era falso; por eso no aparecía al entrar desde el Hub.
- Corrección: `Volver al Inicio` se renderiza también en sesiones con encabezado
  global del Hub. Se eliminó el prop ya innecesario sin cambiar destino, permisos
  ni autenticación.
- Código publicado: `c69c9628`.
- Deployment verificado: `dpl_HEoU6gp5XJN6PoHpRHaYik4rRWtt`, `READY`, con aliases
  productivos de Artículos y Redes activos.
- Validación: build OK y suite `240/240`.

## Corrección de logout y navegación Hub — 2026-10-19

- Punto cero: producción en main, commit funcional final a2f3406e9dfe154188e180d204f82ea08e8558ee, deployment Vercel dpl_H6HNToZ9agcLBf5WxPnMe4KkVRCS (READY), con los seis dominios de producto asignados.
- Hallazgo: /api/auth/logout borraba las cookies usando process.env sin seleccionar la familia del host receptor. En el flujo .net, el logout podía no borrar la cookie compartida .lasolucionweb.net.
- Corrección: el endpoint usa cookieEnvForHost(request.nextUrl.hostname) al borrar sesión, suplantación y contexto Hub. Se añadió prueba de regresión para una variable global mal configurada.
- Corrección visual: se eliminó del DashboardNav la entrada Volver al Inicio; no se alteraron los enlaces internos de las páginas.
- El botón de logout ahora es explícitamente type="button", envía la petición con credentials: same-origin y redirige incluso si la petición falla.
- Verificación real: con una sesión iniciada en seototal.lasolucionweb.net/dashboard, pulsar Salir llevó a Auth0 y después a hub.lasolucionweb.net/login; al volver a seototal.lasolucionweb.net/dashboard, producción respondió con /login. La navegación visible no mostró Volver al Inicio.
- Alcance: esta evidencia cubre el botón Salir del dashboard, que ejecuta primero el logout de Auto Artículos y después el logout de Auth0. Un logout iniciado exclusivamente desde otra aplicación del HUB debe seguir usando este mismo contrato si se quiere invalidar también la cookie de Auto Artículos.

## Punto 1 del plan de sesión/OAuth completado — 2026-10-19

- Código vigente en `main`: `849ba35bd4bb7f77d3f79063d12495a37075f44d`; deployment productivo: `dpl_AWAZPEAmvnZgoVUN5yxJUox6bDhQ`, estado `READY`.
- Se centralizó `clearOAuthFlowCookies()` para borrar el estado temporal tanto en éxito como en error y usando la familia del host callback (`.lasolucionweb.com` o `.lasolucionweb.net`).
- Se aplicó a los callbacks OAuth de Twitter/X, LinkedIn, Pinterest, Blogger y Bing. Tumblr usa un pending server-side, no una cookie de state; no requería este cambio. Threads, Instagram, Search Console, Analytics y Business Profile no tienen en este repositorio un callback OAuth con esa cookie; no se modificaron.
- Se añadió prueba de regresión para borrar state y verifier en ambas variantes de cookie.
- Vercel confirmó compilación, typecheck y deployment exitosos. Los callbacks sin sesión responden `401`, por lo que no se ejecutó una autorización real ni se modificaron cuentas.
- Pendiente de prueba con sesión autorizada: cancelar/error real desde cada proveedor y confirmar visualmente la ausencia de la cookie en el navegador.


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

## Punto cero del lote Antonio — 2026-10-20

- Base: `main` `c2e1e11d`.
- Código preparado: idioma editorial por categoría y selección explícita de sitio en MCP.
- Validación: web 245/245, worker 20/20 y builds web/worker correctos.
- Pendiente: commit, deployment, migración y prueba productiva; typecheck completo mantiene un error previo no relacionado.

## Cierre del lote Antonio — 2026-10-20

- Código `0c3b7197` publicado en `main`; Vercel asociado en `success`.
- Smoke público OK en Artículos y Redes; `seototal` conserva 307 al HUB.
- Migración segura #81 (`39347494879`) `Success`, columna aplicada sin pérdida de datos.
- Queda como pendiente no bloqueante el error previo de typecheck `latestBingChange` no usado.
