## Checkpoint — Oportunidades sin evidencia — CERRADO 2026-10-29

- Task `OPORTUNIDADES-SIN-EVIDENCIA-20261029`: resuelto y confirmado por Milton en la cuenta afectada. Código `2f2b862d` en `main`. Archivado; capitanía liberada.

## Checkpoint — Oportunidades sin evidencia — 2026-10-29

- Task `OPORTUNIDADES-SIN-EVIDENCIA-20261029`; código `2f2b862d` en `main`, desplegado. Pendiente: probar «Analizar» con una cuenta solo-Composio. Capitanía liberada.

## Checkpoint — MCP/Cloudflare 1010 cerrado — 2026-10-29

- Task `MCP-ORIGIN-403-20261027`; el 403 de MUSE (Cloudflare 1010) quedó resuelto por otra instancia, verificado en producción. Sin commits pendientes de esta sesión.

## MCP-USE-CASES-20261029 — antes de publicación

Extensión posterior: `initialize` anuncia política de refresco al conectar y
el prompt `menu` ofrece cinco casos por producto, separados y numerados, con
opción de pedir más.

- Punto cero: `origin/main` `9a685bb9`; smoke público OK en ambos hosts y MCP
  devuelve 401 sin credencial.
- Cambio: dos tools nuevas, sin migración, reutilizando `PATCH /api/me` y
  `PUT /api/social-opportunities`.
- Typecheck OK; suite bloqueada por aserción heredada de
  `social-generate-lock.test.ts`. No cerrar hasta resolver/registrar y verificar
  las nuevas tools autenticadas en producción.
- Suite final: 288/288 pruebas pasan; typecheck y `git diff --check` pasan.
  Commit publicado: `3e6c9602`. Smoke postdeploy: login/.well-known 200 en
  Artículos y Redes; MCP capabilities 401 sin credencial. E2E autenticado de
  las dos tools no se declara ejecutado porque no hay token autorizado en este
  entorno.

## HISTORIAL-INDEXACION-SIMPLE-20261029 — publicado y verificado en producción

Código `22cb96b9` (PR #694) en `main`, Vercel web y auto-articulos-web success.
Pedido de Milton: el Historial daba demasiada información de indexación. Ahora
cada artículo muestra solo Google («Sitemap enviado a Google» verde / «Sitemap
por enviar a Google» gris + nota «un envío al día» + «Enviar ahora») y Bing
(«Artículo enviado a Bing» / «Artículo por enviar a Bing» + «Enviar ahora»).
Un envío manual a Google marca todos los artículos publicados del usuario
(`/api/sitemap/send`). Quitados el error rojo de inspección y «Comprobar
indexación». Sin migraciones. Manual actualizado. Primer build falló por un
`fechaCorta` sin usar (mío); corregido y tipos limpios.
Verificado en producción: el bundle servido en articulos.lasolucionweb.net trae
el texto nuevo y ya no el viejo. NO verificado: vista con artículos reales
(cuenta de prueba sin ejecuciones; falta ver con Lorena) ni el clic de «Enviar
ahora». Capitanía liberada. Responsable: Claude.
Confirmación de Milton (2026-10-29): «Quedó espectacular». Estado: CERRADO.

## MCP-AUTH-FIX-20261027 — cierre verificado20:14 EDT

Punto de continuación: código620e0cc9, Vercel7wM3UkkfJHLUe9jstGuZSm5wHMVV
READY.300 tests+18 controles API PASS, UI token activo y confirmación cancelada.
Fixture35 tools por su concesión REDES; revocado401 y cleanup0/0/0.
30 credenciales reales intactas; metadata aditiva nullable aplicada.
Pendiente exclusivo del caso MUSE: tools/list desde ese cliente con su token
actual y hora/HTTP/Ray; no recuperar/rotar credenciales sin autorización.

[Registro y evidencia](docs/audits/mcp-auth-fix-20261027.md).

## MCP-CREDENTIAL-LOGIC-20261027 — revisión

9 pruebas aisladas PASS reproducen4 defectos; son evidencia de bugs, no de
reparación. Base productiva e3613783 READY. Corregir emisión explícita,
metadatos, errores503/401 y producto Hub; preservar credenciales. Positivo
productivo temporal bloqueado por auto-review, autorización pendiente.
[Continuidad](docs/audits/mcp-auth-logic-20261027.md).

## MCP-MUSE-READONLY-20261027 — 19:26 EDT

Solo análisis. Producción27499e7f READY; ambos controles propios401 de app.
Informe repite1010 histórico. Logs18:57 Redes: token personal rechazado401,
sin dueño atribuible. Token Patricia no revocado; fallo anterior a Hub.
Siguiente: correlacionar una llamada NUEVA de MUSE, sin cambiar token.
[Registro](docs/audits/mcp-muse-readonly-20261027.md).

### MCP-CLOUDFLARE-BIC-20261027 — diagnóstico publicado18:53 UTC

`654b311c` / Vercel `dpl_919g1r4DimziKbKUs7pqvRkZ9yBn` READY en ambos
hosts; checks Vercel success. Cuatro controles401 con token ausente/falso y
seis registros seguros de middleware correlacionados PASS. No cambiar
credenciales. Próximo paso: un tools/list real desde MUSE, todavía pendiente.
[Recibos y límites](docs/audits/mcp-cloudflare-bic-20261027.md).

## Checkpoint — MCP-CLOUDFLARE-BIC-20261027 — 2026-10-27

Perímetro CF corregido: regla `bc768b93c8584a57acddd2c285d9fc0c`, BIC global
ON,18 pruebas HTTP PASS. Runtime app previo d0690cde/Vercel READY. Cliente
MUSE ahora401; autenticación todavía abierta. Diagnóstico sin secretos
preparado,258 pruebas web+26 worker/tipos/builds PASS; no E2E positivo.
[Continuidad exacta](docs/audits/mcp-cloudflare-bic-20261027.md).

## Checkpoint — MCP: Origin con Bearer — 2026-10-27

- Task `MCP-ORIGIN-403-20261027`; `origin/main` incluye #686 (`2250eaf4`), desplegado. Falta confirmación de Patricia con MUSE.

## Checkpoint — Redes: subida de logos reparada — 2026-10-26

- Task `REDES-LOGO-VIGENTE-20261026`; `origin/main` incluye #672, #675 y #678 (`7e782228`). Subida verificada en producción (Mauricio Medina). Pendiente: publicación real con el logo nuevo.

## Checkpoint — Redes: logo vigente y subida — 2026-10-26

- Task `REDES-LOGO-VIGENTE-20261026`; `origin/main` incluye #672 y #675 (`aa46a0d6`), desplegados. Sin migración. Verificación en producción pendiente de la subida real de un logo.

## Punto cero vigente — cierre de REDES-LOG-IMAGENES-VICENTE-20261023 (traspaso) — 2026-10-26

- Estado final verificado el 23/10: log de Historial visible; foto del artículo 103390 reparada (404→200); regla «sin foto no se publica, nunca el logo» en `main` (#660). Tumblr, Pinterest, LinkedIn y Facebook del artículo de Cartagena salieron antes con el logo; Instagram y Threads de ese artículo NO se publicaron.
- Prueba de cupo (autorizada por Milton): se subió a 2 el cupo de Google Business, Instagram y Threads solo de Vicente (`set-user-social-limits.yml`, run 39974527982) y se RESTAURÓ a `{}` (run 39975131193, verificado en el log). Con el cupo libre y la foto buena, Google Business siguió fallando: «Internal error encountered». Por tanto el cupo NO era la causa única y la foto tampoco.
- ABIERTO — causa de Google Business sin confirmar. Siguiente paso: ejecutar `diagnose-gbp-post.yml` (solo lectura, ya corregido en #667; las 2 ejecuciones del 23/10 fallaron por la consulta anterior) con `vicente.sanchez@expglobalspain.com` y comparar texto y respuesta de PostPeer contra la publicación que sí funcionó (`vender-una-propiedad-heredada-en-espana-`). No cambiar código antes de ver esa respuesta.
- ABIERTO — Threads de Vicente con autorización vencida (reconectar en Conexiones); Instagram del 22/10 sin reintentar con la foto nueva.
- Aviso: este cierre no vuelve a probar producción; revisar el estado actual de las pendientes antes de actuar (otras sesiones cambiaron `main` después, p. ej. #672 sobre el logo).

## Checkpoint — E2E permisos de redes — 2026-10-26

- Task `REDES-PERMISOS-ASISTENTE-20261026`; `main` con #668 y #669. Prueba de Juan con su asistente: funcionó (confirmado por Milton). Caso cerrado; Blogger y X fuera por orden.

## Checkpoint — Artículos: editor de prompts en Contenido — 2026-10-26

- Task `ARTICULOS-PROMPTS-ADMIN-20261026`; `origin/main` incluye #670 (`ccfe4f37`). Sin migración ni cambios de API.
- Punto de partida: confirmación visual de Milton como administrador en `/dashboard/configuracion/contenido`.

## Checkpoint — Redes: permisos por defecto — 2026-10-26

- Task `REDES-PERMISOS-ASISTENTE-20261026`; `origin/main` incluye #668 (`c0884753`). Migración aplicada en producción por Milton (`sin_permisos = 0`). Sin cambios de código funcional más allá de los defaults del esquema.
- Punto de partida: prueba real de Juan Carvajal con su asistente en cada red conectada (pendiente).

## Punto cero vigente — Redes: foto reparada, sin logo, pendientes frenadas por cupo — 2026-10-23

- Task ID: `REDES-LOG-IMAGENES-VICENTE-20261023` (cierre). `main` incluye PR #660 (`cf4a5953`: sin foto no se publica, nunca el logo), #661 (diagnóstico de edición) y #662 (reparar foto de un artículo publicado).
- Causa raíz de «sus fotos» y de Google Business: el artículo 103390 (Cartagena, Vicente) se guardó en la plataforma con la referencia de imagen pero SIN archivo (404). El worker tomaba la primera `<img>` del cuerpo = logo 358x179; Tumblr/Pinterest «publicaron» el logo y Google Business lo rechazó («Internal error encountered»).
- Reparación hecha: workflow `repair-article-image.yml` (run 39968437869) regeneró la foto en la pantalla de edición `direct-edit-articles?articles_id_=103390` y guardó. Verificado: la og:image pública del artículo pasó de 404 a 200 `image/webp`. Gasto: 1 crédito de imagen de Vicente.
- Prueba de que Google Business funciona con foto real: hoy 12:45 UTC publicó otro artículo de Vicente (`vender-una-propiedad-heredada-en-espana-`).
- PENDIENTE (no publicadas aún): Google Business, Instagram y Threads del artículo de Cartagena. Reintentar en pantalla devuelve «Ya llegaste al cupo de publicaciones de hoy (1)» en las tres: el cupo diario de 1 por red ya lo ocupó otro artículo de hoy. Threads además tiene la autorización vencida (Vicente debe reconectar). Siguiente paso: tras el reinicio del cupo (día de Vicente) o si Milton sube el cupo en Administración, pulsar Reintentar y verificar enlace y log.
- Tumblr, Pinterest, LinkedIn y Facebook de ese artículo ya estaban publicados con el logo (antes del fix); borrarlos o republicarlos con la foto nueva es decisión de Milton.

## Punto cero vigente — Redes: log visible y despliegue reparado — 2026-10-23

- Task ID: `REDES-LOG-IMAGENES-VICENTE-20261023`. `main` = `bd0ce517` (PR #658), Vercel web y auto-articulos-web `success`; worker `social-worker` corrió con ese commit.
- Causa raíz del log vacío: `ced2c1b7` añadió un evento de error sin `id` (campo obligatorio de `TitleEventRow`) → build de Vercel fallido en `ced2c1b7`, `124701d2` y `a05c59ee`; producción siguió en `16bbbca4`, donde el middleware clasificaba `/api/titles/{id}/events` como ARTICULOS y devolvía 404 «Esta ruta pertenece al otro producto».
- Verificado en producción con la sesión de Vicente: `/events` 200 con eventos reales; «Ver log del proceso» muestra la lista. Título de Cartagena: Tumblr, Pinterest, Instagram, Threads y Facebook `published` con enlace.
- ABIERTO: Google Business sigue en error tras el despliegue: `Google Business post creation failed: Internal error encountered.` (PostPeer devuelve un id pero Google rechaza). No atribuible a la imagen (JPEG público ya re-alojado). Hipótesis sin probar: el contenido enviado lleva la URL del artículo y puede traer el marcador literal `[ENLACE]`. También abiertos: Threads de Vicente con autorización vencida (reconectar en Conexiones) e Instagram del 22/10 en error (intento anterior a los arreglos; reintentar).

## Checkpoint — Redes sin imágenes por timeout de og:image — 2026-10-22

- Task `REDES-IMAGENES-20261022`; base `origin/main` = `2a4aa6f3`. Cambia solo el worker de redes (`socialPublish.ts`) y el texto de error compartido; sin base de datos.
- `main` = `7a0589d3` (PR #655), verificado en producción: reintentos de Tumblr/Pinterest/Threads/Google Business de Lorena publicados sin timeouts. Punto de partida: abrir un post público por red para confirmar la imagen; reconectar Blogger.

## Checkpoint — conexiones en pestaña nueva — 2026-10-22

- Task `CONEXIONES-PESTANA-NUEVA-20261022`; `origin/main` = `2b81b829` (PR #653) con Vercel `success`. Cambia solo componentes web y `composio-options.ts`; sin base de datos ni rutas del servidor.
- Pendiente: probar con la cuenta de Vicente Sánchez (Probar conexión y logs `[composio] … lista vacía`) para saber si el vacío era la lista tapada o una cuenta sin Páginas/tableros.

## Checkpoint — acceso Hub reflejado en lista nativa y MCP — 2026-10-22

- Se añadió la entrada server-to-server firmada para que tenants concedidos desde Hub existan también en la aplicación nativa.
- El endpoint es idempotente: mismo tenant y producto no crean usuarios o entitlements duplicados.
- Revocación recibida con `allowed=false` deja el entitlement local INACTIVE y la frontera MCP vuelve a negar Redes.
- Producción pública verificada: login y OAuth discovery responden; MCP sin sesión responde 401. Falta prueba autenticada y confirmación de reconciliación masiva.


# CHECKPOINTS

## Checkpoint — todas las redes nacen activadas — 2026-10-26 — pendiente de producción

- Task `REDES-ALTA-ON-TODAS-20261026`; punto cero `origin/main` = `78f09e3f`.
- Código preparado para que Instagram, Facebook, LinkedIn, Threads, Pinterest, Tumblr, Bluesky, Blogger, Google Business y Mastodon nazcan en ON en todos los caminos de alta.
- Migración nueva: `20261026130000_enable_all_social_publishing_defaults`; aún no aplicada en producción.
- Tests/typecheck no ejecutables en este checkout: faltan `tsx` y `tsc`. No publicar ni declarar cierre sin instalar/usar las dependencias del pipeline y verificar una cuenta real.

## Checkpoint — BLOG IA independiente (repo y app propios) — 2026-10-22

- Task: `BLOG-IA-INDEPENDENCIA-20261022`; repo `blog-ia` con pruebas verdes; limpieza de Artículos sin tocar la base de datos. Pendiente: verificar despliegue de Artículos tras el merge.

## Checkpoint — BLOG IA conexión verificada en D1 y limpieza — 2026-10-21

- Task: `BLOG-IA-LIMPIEZA-20261021`; alta de SEO Total confirmada en la base del Worker; datos de `blogtest` borrados (1 tenant restante). Pendiente: retirar el dominio `blogtest` (DNS, Milton), `BLOG_IA_CNAME_TARGET`/Custom Hostnames de clientes, R2 real, Search Console/Bing del blog.

## Checkpoint — SEO Total conectado al Worker de BLOG IA — 2026-10-21

- Task: `BLOG-IA-CONEXION-SEOTOTAL-20261021`; clave rotada, variables en GitHub y Vercel Production, redespliegue `Ready`, alta firmada de prueba aceptada sin error. Pendiente: lectura directa en D1, `BLOG_IA_CNAME_TARGET`/Custom Hostnames de clientes, R2 real, limpieza de residuos de prueba (ver CURRENT_STATE).

## Checkpoint — BLOG IA blog público probado con dominio de mentira — 2026-10-21

- Task: `BLOG-IA-DOMINIO-PRUEBA-20261021`; `blogtest.lasolucionweb.net` sirve el blog de prueba por HTTPS real (home/artículo/categoría/sitemaps/robots/404/301/cabeceras) y la suspensión responde 503 sin caché. Queda suspendido. Pendiente: Custom Hostnames de clientes, R2 real, conexión con SEO Total (ver CURRENT_STATE).

## Checkpoint — BLOG IA Worker en Cloudflare — 2026-10-21 — desplegado, sin conectar

- Task: `BLOG-IA-WORKER-CLOUDFLARE-20261021`; punto cero: `origin/main` = `58786850` + este cierre.
- Worker `blog-ia` + D1 `blog-ia` + R2 `blog-ia-media` creados; pruebas negativas y positivas con eventos firmados reales OK; replay sin duplicación; datos de prueba borrados; acceso de `wrangler` revocado. Pendiente: conexión con SEO Total, dominio de prueba/Custom Hostnames, R2 real de imágenes (ver CURRENT_STATE).

## Checkpoint — BLOG IA Fases 2-3 — 2026-10-21 — fusionado, oculto; verificado con sesión real

- Task: `BLOG-IA-FASE-2-3-20261021`; punto cero: `origin/main` = `74f61ee0`.
- Migraciones aditivas aplicadas ANTES por `safe_blog_ia` (run `39668041448`) y verificadas; Vercel `success`; smoke público OK; módulo invisible para clientes.
- Verificación AUTENTICADA en producción (2026-10-21, panel lateral): admin `miltondavila@gmail.com` ve la pantalla BLOG IA, el asistente guarda marca y valida dominios, `/dashboard` y `/api/blog-ia` 200; cliente `lorenalvarez30@gmail.com`: `/dashboard` 200, menú SIN BLOG IA, `/dashboard/blog-ia` = «Página no disponible», `/api/blog-ia` 403 «No disponible para tu cuenta.», sin la palabra «BLOG IA» en pantalla. Fix posterior PR #641 (`dd9f6728`, aviso del análisis vacío) desplegado, Vercel `success`.

## Checkpoint — HUB→MCP reconoce activación de Redes — 2026-10-21 — condicionado

- Task: `MCP-HUB-REDES-20261021`; punto cero `origin/main` = `c47b4878`.
- Código preparado sin migración ni cambios de datos: el catálogo MCP y sus prompts obedecen el permiso efectivo del HUB; `tools/call` conserva una barrera final clara.
- Validación local: 247/247 pruebas; typecheck detenido por el error preexistente `latestBingChange` sin uso.
- Producción pública: descubrimiento MCP OK en Artículos y Redes; endpoint protegido devuelve 401 sin token.
- Commit publicado en `main`: `fd19b682`.
- Smoke HTTP posterior: Artículos y Redes `/login` 200; descubrimiento MCP 200; capacidades sin token 401.
- Pendiente obligatorio: prueba autenticada de `initialize`/`tools/list` en ambos estados del HUB; no se declara cierre funcional completo.

## Checkpoint — control de no indexar artículos — 2026-10-21 — cerrado

- Punto cero: login público = 200; luego se comprobó la pantalla autenticada de Indexación con `lorenalvarez30@gmail.com`.
- Código final `d8cebcb0` en `main`; Vercel `auto-articulos-web` = `Ready`.
- Evidencia funcional: producción muestra la nueva pantalla, el selector y el estado persistido. No se modificó la preferencia de la cuenta durante la verificación.

## Checkpoint — revisión factual de blogs — 2026-10-21 — código publicado, producción pendiente

- Task: `REVISION-CONTENIDO-BLOGS-20261021`.
- Punto cero de código: `origin/main` en `04910056`.
- Código: regla factual en generador de artículos, FAQs y títulos; test unitario de contrato añadido.
- Exclusión respetada: no se modificó el prompt de 10MWS.
- Smoke HTTP público: OK en Artículos y Redes (`/login` 200; protegidas 307/401).
- Deployment Vercel productivo: `6wAi9CqW6tjQTeW9qxpiHPkuUiYd`, `Ready`, con el commit `04910056`.
- Estado: VERIFICADO. El commit documental `0d64c780` no altera runtime.

## Checkpoint — mensaje de login genérico — 2026-10-21

- Task `LOGIN-MENSAJE-GENERICO-20261021`; código `45569e14` en `main`. Punto cero previo `270eafa9`.
- Sin migración. Solo textos de error del worker. E2E con credenciales inválidas reales: pendiente.


## Checkpoint — META historias y carruseles — 2026-10-20 — pendiente de producción

- Commits de código: `f0e40a4d` y corrección de build `943a0231` en `main`; deployment Vercel `9ikVLnzfaDe8nZAMR2JdTarnx5x8`, `Ready`.
- Verificación local: Prisma generate, worker `20/20`, carrusel `4/4`, builds de worker y web correctos.
- Migración preparada: `20261020130000_add_social_opportunity_assets`.
- Migración aplicada: workflow `39435521352`, `success`; HTTP productivo comprobado (`/login` 200, APIs protegidas 401).
- Pendiente obligatorio: ejecutar una prueba autenticada real de generación/publicación.

## Checkpoint — estilo problema-solución por defecto — 2026-10-19

- Task `PROMPT-DEFAULT-PROBLEMA-SOLUCION-20261019`; código `e0b6cf8a`; deployment Vercel `3FJBdcyeAsh7Kh3Q2CYVrtqLV5fJ`, `success`.
- Workflow `39340883977` aplicó únicamente `safe_problem_solution_default_prompt`; `/login` 200 y `/api/me` 401 sin sesión después del cambio.

## Cierre — Threads/PostPeer — 2026-10-19

- Task ID: `THREADS-POSTPEER-BOTON-20261019`; código `474ed73c` en `main`.
- Deployments `5XcP7ZMdrRhTWHeGuN3SNeRXrJSn` y `6W6fHM4eaLN59CXxBfcFww6C1KAh`, ambos `success`.
- HTTP productivo verificado; E2E autenticado de Juan no verificado por falta de sesión.

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

## Checkpoint — Antonio bilingüe — 2026-10-20

- Base `main`: `c2e1e11d`.
- Cambios: `Category.contentLanguage`, asignación por panel, prioridad en publicación/worker y regla de selección en MCP.
- Validación local: 245 pruebas web, 20 worker y ambos builds correctos.
- Migración pendiente: `20261019000000_category_editorial_language`.
- No declarar cerrado hasta confirmar Vercel `READY`, smoke HTTP, migración y comportamiento productivo.

## Cierre del Checkpoint Antonio bilingüe — 2026-10-20

- Vercel: deployments del cambio `success`.
- Smoke: Artículos y Redes OK; endpoints protegidos 307/401 según contrato.
- Migración: workflow #81 (`39347494879`) `Success`, sin `--accept-data-loss`.
- Código/documentación en `main`; no se creó rama nueva ni worktree.


## Checkpoint — Google Business: mensaje de error accionable — 2026-10-21

- Código integrado en `main`: `6ec4fa8ca6c9f5a172c5934baab80d63b6661424`.
- Cambio: el error de conexión de Google Business Profile muestra una explicación sobre correo/cuenta incorrecta o ficha no verificada y un botón para volver a Conexiones de Google Business Profile.
- No se incluyeron la maqueta HTML, migraciones, permisos ni publicaciones.
- `git diff --check`: correcto. Typecheck y suite web quedan no concluyentes por errores preexistentes y restricción IPC del entorno.
- Estado de producción: deployment de Vercel pendiente de confirmación; no se forzó OAuth ni se publicó contenido.
- Estado documental: ARCHIVADO como pendiente de verificación productiva.


## Checkpoint — AUTO ARTICULOS 500 en /auth/hub — 2026-10-21

- Punto cero: `main` en `1c8d2803`; producción con 500 por columna `User.disableIndexing` ausente.
- Corrección: ALTER TABLE aditivo en Supabase (Milton). Sin cambio de código.
- Cierre: `/auth/hub` 303 (16:03) sin P2022; `/login` 200 en Artículos y Redes. Siguiente punto cero: producción con la columna aplicada.

- Cierre final: commit `5e03ce76` en `main` (opción `safe_user_indexing_preference` en `migrate.yml`). Smoke de producción posterior sano. CERRADO.


## Cierre operativo — Hub native access projection — 2026-10-22

- Reconciliation evidence: found=12, projected=12, failed=[] from the production Hub admin endpoint.
- The signed Hub projection and explicit REDES ProductEntitlement checks are now part of the durable authorization path.
- Auto production commit f6ce1d9d is READY and public smoke checks pass at the route boundary.
- A tenant-authenticated MCP browser session was not available for direct E2E and remains explicitly pending.

## Checkpoint — Artículos: `{BIO_AUTOR}` en estilos de redacción — 2026-10-26

- Task `ARTICULOS-BIO-AUTOR-20261026`. Diagnóstico cerrado; sin código. Punto de partida: Milton pega los prompts limpios en Configuración → Contenido y revisa el próximo artículo generado.
## Checkpoint — todas las redes activadas en producción — 2026-10-26

- `main` = `f9b5e529`.
- Run `40423874512` `Success`: migración `20261026130000_enable_all_social_publishing_defaults` aplicada con la opción segura dedicada.
- Smoke HTTP: Artículos `/login` 200; Redes `/login` 200.
- Residual: falta E2E autenticado de alta nueva/HUB para observar las diez columnas; no afecta la evidencia de migración ni el contrato de código.


## Checkpoint — No indexar en 10MWS — 2026-10-29

- Punto cero: `main` = `38621d27` (PR #691). Prueba E2E real con Inés García: artículo 104488 con «Activate Indexing» = No y `noindex,nofollow` público.
- Antes del arreglo: 104484 `index,follow` y log «sigue activada». Sin migraciones. Pendiente aparte: BLOG IA no recibe la orden de no indexar.

- Cierre: Confirmación de Milton (2026-10-29): la reparación quedó correcta tras revisión manual del artículo 104488. Estado: CERRADO.

## Checkpoint — Entrada sin espera tras el HUB — 2026-10-29

- Punto cero: `main` con `9c136189` (PR #712). Carga desde el HUB: antes 27 s hasta las tarjetas; ahora documento 2,7–4,3 s en frío / 0,58 s en caliente y tarjetas al instante. Detalle en `CURRENT_STATE.md`. Sin migraciones.
## Checkpoint — REDES-GENERACION-ESPERA-20261029 — publicado, E2E pendiente

- `ee4066d8` en `main`, sin migración ni cambios de datos.
- Copys en paralelo, timeout de OpenAI y manejo de HTML de timeout en la UI.
- `git diff --check` y revisión del diff PASS; smoke público 307→`/login`, 200.
- Falta prueba autenticada; no se declara cierre funcional definitivo.

## Checkpoint — REDES-GENERACION-ESPERA-20261029 — regresión corregida

- `82ca8b0c` publicado en `main`.
- Regresión aislada en `860fb2e`: inspección completa de todos los artículos
  antes de generar. Se mantiene la protección de URL/foto, limitada a 24 y con
  salida al primer candidato válido.
- No se revirtió ninguna adhesión de hoy. E2E autenticado aún pendiente.

## Checkpoint — REDES-GENERACION-ESPERA-20261029 — CERRADO Y ARCHIVADO

- Confirmación funcional de Milton en producción: «ok funcionó».
- Punto cero final: `main` en `3391990b`; sin migración ni cambios de datos.
- Capitanía liberada. Reabrir únicamente con un caso nuevo.


## Checkpoint — REDES-NO-ARTICULOS-FALSO-20261029 — CERRADO

- PR #698 (`1bbf65e5`), #703 (`0d2ffc45`) y #704 (`e26a3e32`) en `main`; CI Vercel verde.
- Verificado en producción vía Hub (impersonación de Milton): Rosa María Bello y realestatemov generan propuestas con artículos reales. Propuestas de prueba dejadas pendientes, sin publicar.
- No probado: el estado previo al arreglo en esas cuentas. Sin migración.

## Checkpoint — ALTAS-HUB-UBICACION-20261029 — CERRADO (con incidente)

- PR #708 tumbó el panel (500, P2022) y se revirtió con #709. Rehecho a prueba de caídas en #711 (`06e7564a`); notas en #718 (`b46c0f1c`).
- Migración `20261029190000` aplicada por Milton en Supabase `uqqclaezxagukoyiiiol` (~17:30). Tras aplicarla, `/api/me` ya no registra «column does not exist».
- Pendiente: primera alta real del Hub viendo «¿Dónde estás?». Capitanía liberada.
