# NORMA DE MANTENIMIENTO AUTOMÁTICO DEL DOCUMENTO (2026-10-09, pedido explícito de Milton)

1. Este documento solo guarda: (a) reglas y protocolos vigentes, que no se modifican sin pedido expreso de Milton; (b) trabajo activo y entradas recientes que aún no están cerradas; (c) decisiones pendientes de Milton.
2. Al cerrar una entrada, se MUEVE completa y sin editar al destino que le corresponde, y aquí queda solo una línea de puntero:
   - Versiones, despliegues, PRs cerrados, incidentes de producción → `CONTROLADOR_DE_VERSIONES.md`
   - Conversaciones, reservas y responsables → `INVENTARIO_CONVERSACIONES.md` (Parte B)
   - Hallazgos de árbol de git, ramas, merges, sobrescrituras → `REPARADOR_DEL_ARBOL_PRINCIPAL.md`
   - Ideas sueltas sin ejecutar → `TO-DO.md`
3. Cada traslado deja un índice (título y fecha) en el documento destino. Nunca se borra contenido: antes de confirmar, se verifica que cada línea movida exista en el destino.
4. Referencia de tamaño: unas 1.000 líneas. Si el documento crece por encima, se archiva en la misma corrida.
5. La tarea programada diaria de propagación aplica esta norma en cada corrida. Si algo es ambiguo, se deja anotado para decisión de Milton y no se mueve.

# INCIDENTE CRÍTICO Y PROTOCOLO OBLIGATORIO — 2026-09-08

## Claude — CIERRE «REPARACION DE INSTRUCCIONES MCP» — 2026-10-09

- Estado: CERRADO Y ARCHIVADO. Capitanía liberada. Sin migraciones.
- PR fusionadas (todas Vercel success): #505, #506 (pantalla real idéntica a la
  maqueta aprobada), #507, #508 (prompt corto), #509 (Muse por chat, Otra IA
  genérica, ChatGPT oficial), #510 (URL fija seototal, REVERTIDA), #511 (URL por
  dominio; cierre `a1903f5f`).
- Pantalla: `/dashboard/configuracion/mcp` con 4 pasos, selector Claude /
  ChatGPT / Muse / Otra IA, token real con botón Copiar, prompt con
  autorización permanente para crear y publicar (comprobante con
  confirmar=false y confirmar=true en el mismo turno), horarios programados vía
  tareas del propio asistente, y confirmación solo para borrar/descartar/cancelar.
- Claude: Sin inicio de sesión + encabezado Authorization con el token (el
  servidor NO tiene registro dinámico OAuth ni cliente de Claude).
- Auditoría de dominios: articulos, seototal y redes sirven el mismo
  despliegue y el mismo MCP; sin lógica por dominio. La URL mostrada es la del
  dominio donde se abre (decisión de Milton: productos separables a futuro).
- DESCARTADO por Milton: publicación diaria programada dentro de SEO Total
  (la hace el asistente IA del usuario).
- NO publicado: maqueta `mcp-preview` (token de prueba fijo); sigue solo en el
  worktree de Codex.
- Pendiente sin verificar: login OAuth de ChatGPT (requiere
  OAUTH_CHATGPT_CLIENT_ID en el servidor), etiquetas en español de ChatGPT y
  Muse contra pantalla real, y revisión visual de la pantalla protegida.


## Claude — INSTRUCCIONES MCP EXACTAS en /dashboard/configuracion/mcp — 2026-10-09

- Reclamo de capitanía (sin migración): `migration-coordinator.sh claim "Claude"`.
- Pedido de Milton: instrucciones de conexión exactas por IA (Claude, ChatGPT,
  Muse, Otra IA), solo acciones con los campos reales; en Claude se usa
  «Sin inicio de sesión» + encabezado Authorization con el token real (el
  servidor no admite registro automático OAuth). Prompt con autorización
  permanente para crear y publicar artículos (obtiene el comprobante con
  confirmar=false y publica en el mismo turno); borrar/descartar/cancelar
  siguen pidiendo confirmación.
- Aplicado sobre la pantalla REAL (token real, URL del host, lista de
  herramientas dinámica). NO se publica la maqueta `mcp-preview` de Codex: usa
  un token de prueba fijo y la URL de Redes escrita a mano.
- Descartado a pedido de Milton: la publicación diaria programada (la hace el
  asistente IA del usuario, no SEO Total). No quedó ningún cambio de schema.
- Archivos: `dashboard/configuracion/mcp/page.tsx`, `content/manual-usuario.ts`.


## Incidente «Analizar contenido» caído (cuenta de Alfonzo Lobo) — Claude — 2026-10-02 — CERRADO

- **Síntoma:** en `/dashboard/oportunidades` el botón «Analizar contenido» mostraba «No se pudo completar el análisis.» (mensaje genérico del cliente: la respuesta llegó sin cuerpo JSON). Se sospechó de la transición controlada hacia el HUB.
- **Causa real (logs de producción de Vercel):** `PrismaClientKnownRequestError P2022: The column SearchIntegration.lastAccessErrorAt does not exist in the current database` (y lo mismo para `lastAccessError`), en `prisma.searchIntegration.findFirst()` de `POST /api/opportunities`. 456 + 144 errores en 24 h; afectaba a TODAS las cuentas, no solo a Alfonzo.
- **Origen:** PR #282 (2026-10-01, aviso rojo de reconexión de Search Console) añadió las dos columnas al schema y creó la migración `20261001150000_add_search_integration_access_error`, pero **esa migración nunca se aplicó en producción**. `migrate.yml` está detenido a propósito (querría borrar las columnas HUB de `User`; no usar `accept_data_loss` ni `force_sync`). **No fue la transición al HUB**, ni la capa de derechos por producto (`requireProductAccess` falla en abierto y no intervino).
- **Arreglo:** Milton aplicó a mano en Supabase, el 2026-10-02, SQL aditivo e idempotente:
  `ALTER TABLE "SearchIntegration" ADD COLUMN IF NOT EXISTS "lastAccessErrorAt" TIMESTAMP(3);`
  `ALTER TABLE "SearchIntegration" ADD COLUMN IF NOT EXISTS "lastAccessError" TEXT;`
  Sin redespliegue ni cambios de código.
- **Verificación:** tras el SQL, `POST /api/opportunities` respondió 200 en producción, sin errores «column does not exist»; Milton probó con la cuenta de Alfonzo. Un barrido de errores de 24 h no mostró ninguna otra columna o tabla faltante.
- **Lección:** schema + migración inseparables incluye APLICARLA. Mientras `migrate.yml` siga bloqueado por las columnas HUB, toda migración nueva debe aplicarse a mano y anotarse aquí; si no, la ruta que la use cae con 500 sin mensaje. Para diagnosticar: `vercel logs --scope la-solucion-web --project auto-articulos-web --environment production --level error --json`.
- Capitanía reclamada y liberada por Claude (solo documentación). Estado: CERRADO Y ARCHIVADO.

## Incidente `Load failed` en oportunidades — Rafael Zuzolo — 2026-10-01

- **Síntoma:** en producción, la cuenta de Rafael Zuzolo mostraba `Load failed` al ejecutar “Analizar contenido”; la carga inicial sí funcionaba.
- **Causa:** `POST /api/opportunities` podía procesar hasta 20 lotes y decenas de llamadas secuenciales a OpenAI, además de GSC/Analytics/Bing, agotando el tiempo de la función.
- **Corrección:** análisis limitado a 8 lotes de 150 filas; la ruta declara `maxDuration = 300` y ejecución dinámica.
- **Despliegue:** commit `b23b9af9` enviado a `main`; despliegue productivo activado el 2026-09-30.
- **Estado:** RESUELTO Y ARCHIVADO. `git diff --check` fue correcto; el build local quedó impedido por fallo de red al resolver `registry.npmjs.org`.

## CONEXION COMPOSIO PROBLEMA PEPE — Claude — 2026-09-28/10-01 — PR #249 — CERRADO

- Síntoma: GSC de Pepe (`pepegomez.net`) quedaba en INITIATED al conectar actuando como él.
- Evidencia (logs de producción 09:43–09:44 del 2026-09-28): `connect_started` con el userId
  del cliente y `connect_completed` con el userId del admin, outcome `invalid`, dos veces. La
  cookie de suplantación era `SameSite=strict` y no viaja al volver de Google/Composio.
- `.site` descartado: el código de conexión Composio no distingue servidor.
- Corrección: `sameSite: "lax"` en `apps/web/src/app/api/admin/impersonate/route.ts` (PR #249,
  `647b7d96`, desplegado 2026-09-28). Sin schema ni migraciones. No se hizo typecheck completo
  (worktree sin node_modules).
- Verificación: Milton reprodujo la conexión actuando como Pepe el 2026-09-28 tras el despliegue
  y confirmó el 2026-10-01 que el caso quedó resuelto.
- Capitanía reclamada y liberada por Claude. Estado: CERRADO Y ARCHIVADO.

## Claude — LOTE 1 «SEPARACION SEO TOTAL»: DESPLEGADO EN PRODUCCIÓN — 2026-10-02

- Capitanía de migración: reclamada y liberada por Claude el 2026-10-02 (sin ejecutar Prisma; **la migración la aplicó Milton a mano en Supabase**). Hoy no hay capitán activo.
- **Alerta crítica para todos:** producción ya tiene las columnas del HUB (`hubUserId`, `hubAuth0Sub`, `hubSyncedAt`, `hubSyncAttemptedAt`, `hubSyncError`) en la tabla `User` y `schema.prisma` de `main` **no las declara**. El workflow `migrate.yml` (ruta por defecto, `prisma db push`) quiere **borrarlas** (106 usuarios con datos). Los runs #74 y #75 abortaron sin cambios. **No marcar `accept_data_loss` ni `force_sync`.**
- Aplicado: `packages/db/prisma/migrations/20261002000000_add_product_entitlements/migration.sql` (tablas, enums, CHECK, RLS y backfill, aditivo e idempotente). PR #313 fusionado. Interruptor `product_enforcement` apagado.
- Verificado en Supabase: 106 usuarios / 106 filas de Artículos / 9 de Redes / RLS activo / 106 datos HUB intactos. Producción responde con normalidad.

## Claude — LOTE 1 «SEPARACION SEO TOTAL»: derechos por producto (base invisible) — 2026-10-01

- Proyecto: «SEPARACION DE SEO TOTAL DE REDES TOTALES» (canal vivo: `CONTROL_SEPARACION_SEO_TOTAL.md`; documentos en `TRASPASO_SEPARACION_SEO_TOTAL.md`). Capitán del lote: Claude. Rama `claude/lote1-product-entitlements`, worktree `/private/tmp/separacion-lote1`.
- Reclamo de capitanía de migración: `migration-coordinator.sh claim "Claude" "Lote 1 SEPARACION SEO TOTAL: tablas ProductEntitlement (migración aditiva)"` — solo para empujar la rama y abrir el PR; **la migración NO se aplica** sin la autorización de Milton.
- Archivos reservados: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20261002000000_add_product_entitlements/`, `packages/shared/src/index.ts`, `packages/shared/src/product-access-core.ts`, `apps/web/src/lib/product-access.ts`, `product-enforcement.ts` (+ pruebas), `menu-names.ts`, `apps/web/src/app/api/admin/users/[id]/entitlements/route.ts`, `apps/web/src/app/api/admin/users/route.ts`, `apps/web/src/app/api/auth/trial-signup/route.ts`, `apps/web/src/app/api/me/route.ts`, `apps/web/src/app/dashboard/usuarios/page.tsx` y `UserProductsPanel.tsx`, `apps/web/src/content/manual-usuario.ts`.
- Qué es: tablas de derechos por producto con interruptor de aplicación **apagado por defecto** (nada bloquea a nadie), panel «Productos» en Administración y bloque `products` en `/api/me`. Ningún guard existente cambia.
- Auditorías: tres, documentadas en `AUDITORIAS_LOTE_1_SEPARACION_SEO_TOTAL.md` (21 pruebas nuevas; suite web 105/105; typecheck web y worker limpios; migración probada en un Postgres desechable sobre el esquema real de `main`; build de `apps/web` OK).
- Estado: **PR abierto, sin fusionar; migración sin aplicar; sin despliegue.** Pendiente: revisión cruzada de Codex y autorización de Milton (Protocolo de No Destrucción). Para aplicar la migración hay que reclamar de nuevo la capitanía.
- Hallazgo ajeno: `migrate deploy` desde base vacía falla en `20260823150000_add_tumblr_integration` (no se tocó).

## Claude — CIERRE fix «Conectar GSC», estado de GSC y conteo de categorías en Oportunidades — 2026-09-28

- Reclamo de capitanía (sin migración): `migration-coordinator.sh claim "Claude"`.
- Causa: `/dashboard/oportunidades` solo leía la conexión antigua de Google
  (`/api/search-integrations/google`), mientras la tarjeta de Conexiones usa
  Composio. Resultado: aviso «Falta conectar» junto a «Conexión activa».
- Arreglo: Oportunidades también consulta `/api/composio/status` (mismo
  criterio que el panel de Inicio) y el botón «Conectar GSC» apunta a
  `/dashboard/configuracion/conexiones?conexion=google-search-console`.
- Archivos: `oportunidades/page.tsx`, `PreValidationGuard.tsx`, `manual-usuario.ts`.
- Auditorías: tsc sin errores en los archivos tocados, `git diff --check` OK.
  - También corregido: el aviso mostraba «0 categorías» porque Oportunidades no
  pasaba `categoriesCount` al guard (Publicar sí lo pasaba).
- Publicado: PR #251 fusionada (`50095a0d`) el 2026-09-28 con autorización
  explícita de Milton, según el Protocolo de No Destrucción. Despliegue
  Production en Vercel completado; el código nuevo está en los JS servidos.
- Verificado en producción con la cuenta de jose antonio gomez velasco: entra
  directo a Oportunidades, sin «Falta conectar» ni aviso de configuración.
  Si un navegador aún muestra lo anterior, es caché local (Cmd+Shift+R).
- Pendiente, fuera de alcance: los pasos 1-3 del guard aún envían al asistente
  genérico `/dashboard/configuracion?tab=wizard`.
- Capitanía liberada. Estado: CERRADO Y ARCHIVADO.

## Despliegue verificado — 2026-09-23 — PR #220

- Se fusionó la PR #220 (`8d2cd706`) a `main` para publicar los cambios
  responsive, la separación de Historial/Estadísticas, el control de acceso
  social y la guía modular de uso.
- Auditorías locales aprobadas: 47 pruebas web, typecheck, build web completo
  con 85 rutas y `git diff --check` limpio. La prueba opcional de generación de
  títulos quedó omitida por no existir `TITLE_GENERATION_TEST_DATABASE_URL`.
- No hubo cambios de schema ni migraciones.
- Vercel: deployment `dpl_J5LbK5K2eM4qppiTMDtJwqAaaRBv`, estado READY, alias
  `https://seototal.lasolucionweb.com`.
- Rutas productivas comprobadas: `/login` responde 200; las rutas protegidas
  `/dashboard/como-funciona` y `/dashboard/actualizaciones` redirigen a login
  sin sesión, comportamiento esperado.
- Estado: CERRADO Y VERIFICADO. No se modificaron las pestañas abiertas.

## Cierre de auditoría editorial y enlaces — Codex — 2026-09-20

- PR #187 fusionado a `main`: mejora de identidad editorial por cuenta,
  idioma y ubicaciones declaradas; prohibición de inventar biografía,
  ubicaciones, testimonios, resultados, precios o promesas.
- Se retiró `facebook-story` del generador de oportunidades porque la API de
  Page Stories no permite garantizar un enlace clicable. Las publicaciones
  normales y blogs mantienen enlace por caption, campo nativo o HTML.
- Auditorías completadas: build web OK (85 rutas), build worker OK, suite
  worker 20/20, Preview Vercel OK y verificación productiva `/login` HTTP 200.
- Producción: deployment `dpl_Cns4zW7VtYAbt3ypg4Yjgd4JB1cq`, estado READY,
  alias `https://seototal.lasolucionweb.com`.
- Sin cambios de schema ni migraciones. Estado: CERRADO Y ARCHIVADO.

## Auditoría LINK ACTIVO EN BLOGGING — Codex — 2026-09-20

- Se auditó `apps/worker/src/socialPublish.ts` y los adaptadores de Threads,
  X, LinkedIn, Facebook Page, Pinterest, Tumblr, Bluesky, DEV.to y Blogger.
  Los canales conservan el enlace completo por caption o por campo nativo;
  Blogger lo emite como `<a href>`.
- Corrección: Facebook Page usa `buildSafeCaption` para impedir que un copy
  largo corte el enlace. Facebook Page Story queda bloqueado explícitamente:
  la Page Stories API solo acepta `photo_id` y no admite caption, URL ni
  sticker; ya no se reportará como publicación válida sin enlace. Se debe
  usar una publicación normal de Facebook Page para ese requisito.
- Se agregó `apps/worker/src/socialLinkContract.test.ts` con 2 pruebas de
  contrato. Build del worker: OK tras `prisma generate`; suite worker:
  20/20 OK y contrato nuevo: 2/2 OK; `git diff --check`: OK.
- Sin cambios de schema ni migraciones. Pendiente: commit/push y despliegue
  productivo desde un checkout con permisos de Git/Vercel disponibles.

## Qué pasó: Producción rota por schema sin migración

**Resumen:** PR #76 (Claude) agregó `User.publishMethod` y `McpConnection` al schema Prisma sin crear la migración correspondiente. Resultado: login en Producción devolvía HTTP 500 ("column `User.publishMethod` does not exist"). Tardó 4 horas en arreglarse.

**Root cause:** Schema y migración deben ser INSEPARABLES. Cambiar uno sin el otro = desastre garantizado.

## Protocolo obligatorio (TODOS deben seguir)

**Antes de mergear CUALQUIER cambio a `packages/db/prisma/schema.prisma`:**

1. **Crear la migración EN EL MISMO COMMIT**
   ```bash
   npx prisma migrate dev --name <descripcion>
   # Esto genera schema.prisma + migrations/20260908XXXXXX_<descripcion>/migration.sql
   # AMBOS archivos van al commit.
   ```

2. **Probar la migración en worktree aislado ANTES de main**
   ```bash
   # En worktree con npm install propio:
   npx prisma migrate deploy  # O la forma que uses
   # Debe completar sin errores.
   ```

3. **Auditoría de integración: ejecutar en Producción ANTES de activar el código**
   - El código espera que los campos existan
   - Si la migración falla en Producción, el código roto llega primero
   - Solución: migración SIEMPRE antes que el código que la usa

4. **Si la migración causa data loss** (DROP TABLE, DROP COLUMN):
   - Documentar EXACTAMENTE qué se pierde y por qué
   - Requiere autorización explícita de Milton ANTES de mergear
   - Nunca usar `--accept-data-loss` sin revisar qué datos se pierden

## Cómo se arregló (no hagas esto a menos que sea un desastre real)

```bash
# 1. Revert del PR que rompió Producción
gh pr merge <revert-pr>  # Devuelve el código a estado conocido

# 2. Migración SEGURA con --accept-data-loss (ÚLTIMA OPCIÓN)
gh workflow run migrate.yml --ref main -f force_sync=true
# Esto sincroniza la BD con el schema, pero ELIMINA datos.
# Solo cuando no hay alternativa.
```

## Responsables

- **Claude/Codex:** crear migración EN MISMO COMMIT que schema
- **PR reviewer:** verificar que schema + migración vayan juntas
- **Milton:** autorizar si hay data loss

## Aplicar este protocolo ahora

Este documento es OBLIGATORIO para el próximo cambio de schema. Si lo olvidas, Coordinador debe rechazar el PR y pedirte que lo hagas de nuevo.

---

## Corrección de alcance de Milton (2026-09-08) — no es "un MCP para 10MWS", es un selector de plataforma

Milton fue explícito: la idea **no es tumbar lo que ya funciona**, sino que
**SEO Total tome el control** de un modo de publicación mucho más
inteligente, sin navegador, que sirva no solo para 10minutesWebsite sino
para **cualquier generador de páginas web** (Shopify, Wix, WordPress,
etc.). Pidió, antes de seguir programando, investigar qué generadores de
páginas web existen en el mercado y cuáles ya tienen un servidor MCP
propio, analizarlos, y **dejó dicho de antemano que el sistema debe tener
un selector de plataforma** que la persona usuaria use al momento de
conectar su cuenta (no un solo proveedor fijo).

Esto no contradice ni descarta nada del PR #76 — el diseño de ese PR
(interfaz `ArticlePublisher` como puerto + un adaptador por proveedor +
`McpConnection.provider` como string abierto) ya estaba pensado para esto
exactamente. Lo que cambia es la ambición declarada del proyecto: 10MWS es
el primer proveedor, no el único.

### Investigación de mercado (Claude, 2026-09-08, solo investigación — no se tocó código)

| Plataforma | Estado de MCP | Alcance real hoy | Relevancia |
|---|---|---|---|
| **WordPress** | Oficial: **MCP Adapter** (feb-2026) sobre la nueva Abilities API (WP 6.9); expone como herramientas MCP cualquier "ability" registrada. Terceros como Respira ya ofrecen versiones más maduras con rollback. | Crear/editar posts, custom post types, lo que registre cada instalación | **Alta** — el CMS más usado del mundo; muchos clientes de SEO Total probablemente ya lo tienen aparte de 10MWS. |
| **Shopify** | Oficial: 4 servidores MCP separados (Storefront, Customer Account, Checkout, Dev) desde Q1-2026 | El de "Dev"/Admin lee y escribe catálogo real vía GraphQL Admin API; Shopify también tiene sección de blog | **Media-alta**, sobre todo si algún cliente vende productos, no solo publica artículos. |
| **Wix** | Oficial desde mayo-2025, maduro en 2026, soporte 24/7 | Cubre APIs de negocio completas, no solo contenido | **Alta** — mencionado explícitamente por Milton como plataforma objetivo. |
| **Webflow** | Oficial, lanzado a inicios de 2026 | CMS collections, páginas, publicación — mapeo casi 1:1 a "categoría → colección, crear artículo" | **Alta** — de los más limpios para encajar en el contrato ya diseñado. |
| **Squarespace** | Oficial pero limitado hoy a dominios/algo de comercio; terceros (no oficiales) cubren blog/contenido de forma más completa | El oficial no publica blog posts todavía | **Media** — esperar a que el oficial cubra blog, o evaluar un conector de terceros con cautela (no oficial = puede romperse sin aviso). |
| **Duda** | Oficial, beta de MCP activa en 2026 | Sitios, blogs, tiendas, republish — y Duda es **también una plataforma white-label para agencias**, mismo modelo de negocio que 10MWS/Tagcrush | **Muy alta como referencia de diseño** — el caso más parecido a nuestro propio negocio para copiar patrones de autorización multi-tenant. |
| **GoDaddy Website Builder** | Oficial pero solo dominios, de solo lectura (no publica contenido, no compra, no toca DNS) | No sirve para publicar artículos hoy | **Baja** por ahora. |
| Contentful/Sanity/Storyblok (headless) | Oficiales, MCP maduro | Pensados para desarrolladores con front-end propio | **Baja-media** — público más técnico, no es el perfil típico de cliente de SEO Total. |

**Lectura general**: MCP remoto con OAuth ya es el estándar de 2026 en toda
esta categoría — el mismo patrón que 10MWS ya nos propuso. El diseño de
`ArticlePublisher` del PR #76 no necesita cambiar de forma para soportar
esto; cada proveedor nuevo es un adaptador más (como `mcpPublisher.ts`) más
una entrada en el selector de plataforma.

**Orden de prioridad propuesto** (pendiente de que Milton lo confirme):
1. 10minutesWebsite/Tagcrush (MCP) — ya en desarrollo del lado de ellos.
2. WordPress — mayor volumen de usuarios potenciales, MCP oficial flexible.
3. Wix y Webflow — MCP oficial maduro, mapeo limpio al contrato interno.
4. Duda — más por aprendizaje de arquitectura que por volumen inmediato.
5. Shopify/Squarespace — evaluar según si los clientes reales de SEO Total
   ya usan estas plataformas (dato pendiente del lado de Milton).

**Estado**: solo investigación, sin ejecutar todavía — Milton pidió
analizar antes de proceder. El selector de plataforma y los adaptadores
adicionales quedan pendientes de que él confirme el orden y de que se
complete/fusione primero el PR #76 (10MWS).

---

# PROTOCOLO DE VERIFICACIÓN LOCAL Y REDUCCIÓN DE DESPLIEGUES (propuesto por Claude, 2026-09-04, a pedido explícito de Milton)

Milton pidió, de manera autónoma, una propuesta para dejar de generar tantos
despliegues en Vercel y para poder probar en local lo que se ejecuta, antes
de subir. Diagnóstico real (no supuesto): en un solo día de esta
conversación hubo más de 40 commits a `main`, y **cada uno —incluidos los
que solo tocaban `.md`— disparó un build completo de Vercel**, porque
`.vercelignore` excluye los `.md` del paquete final pero no evita que el
build arranque.

## 1. Verificación local en un solo comando (ya implementado, sin riesgo)

Nuevo: `npm run verify` desde la raíz del repo (`scripts/verify-before-push.sh`).
Reproduce, en este orden, exactamente lo que exige el Protocolo de No
Destrucción para código:
1. `git diff --check`.
2. `npx prisma generate`.
3. Typecheck de `apps/web`.
4. **Build de `apps/web` ejecutado desde dentro de `apps/web`** — el mismo
   comando exacto que usa Vercel (`Root Directory = apps/web`,
   `buildCommand: npm run build`), no la variante `--workspace=apps/web`
   desde la raíz, para no repetir nunca el error real de los commits
   `535b690`/`dbbe75f` documentado más abajo.
5. Build de `apps/worker` (incluye chequeo de tipos).
6. Los tests de `apps/worker`.

Requiere una base de datos local: `npm run db:up` levanta Postgres vía
Docker con las mismas credenciales de `.env.example`
(`postgresql://autoarticulos:autoarticulos@localhost:5432/autoarticulos`).
Sin `DATABASE_URL`, el script avisa y se detiene en vez de fallar a medias
— este es exactamente el motivo por el que el hook de generación de
Actualizaciones (`scripts/generate-product-update.ts`) viene fallando en
silencio en todos los worktrees aislados de hoy.

Esto reemplaza a "las tres auditorías" como tres pasos manuales sueltos:
las auditorías 1 y 2 (funcional y regresión, para lo que se puede probar
sin producción real) quedan cubiertas por este único comando. La auditoría
3 (integración/producción real) sigue haciéndose sobre el Preview o el
despliegue real — este script nunca la reemplaza.

## 2. Preferir Preview de Vercel a push directo, para código

Regla propuesta: **push directo a `main` se reserva para documentación**
(los 5 documentos maestros, `manual-usuario.ts`) — que además, con el punto
3 de abajo, dejarán de gastar builds. **Cualquier cambio de código de
aplicación** (`apps/`, `packages/`) pasa por una rama + PR, como ya se
viene haciendo cada vez más seguido este mismo día (PRs #37 a #43): Vercel
genera un Preview aislado, se corre `npm run verify` localmente y se
revisa el Preview real, y solo entonces se fusiona a `main` — en vez de
descubrir un problema ya en Producción.

## 3. Pendiente de tu confirmación explícita — no aplicado todavía

Esto sí toca `apps/web/vercel.json`, el archivo que ya causó una caída real
(ver la ADVERTENCIA CRÍTICA SOBRE VERCEL más abajo), así que **no lo toco
sin que lo confirmes primero**, tal como exige ese mismo Protocolo.

Propuesta: agregar un `ignoreCommand` que le diga a Vercel que se salte el
build entero cuando el commit no toca ningún archivo de `apps/web`,
`apps/worker`, `packages/` ni los workflows — es decir, casi todos los
commits de documentación de hoy.

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install --legacy-peer-deps",
  "ignoreCommand": "cd .. && git diff --quiet HEAD^ HEAD -- apps/web apps/worker packages package.json package-lock.json"
}
```

(No se tocan `buildCommand` ni `outputDirectory`, que son los dos campos
que causaron el incidente real — solo se agrega el campo nuevo
`ignoreCommand`.) Si confirmás, lo aplico en un PR aparte, verifico el
Preview de ese PR específico, y documento el resultado acá antes de
fusionarlo.

---

# PROTOCOLO OBLIGATORIO DE NO DESTRUCCIÓN (normas de Milton, recopiladas por experiencia — organizado 2026-09-03, ningún contenido fue eliminado)

## RESERVA — CORRECCIÓN V2 DE EXPANSIÓN TEMÁTICA — 2026-09-04

Codex reserva en `/private/tmp/auditoria-longtail-v2-20260904` únicamente
`apps/web/src/lib/opportunity-analysis.ts`,
`apps/web/src/app/api/opportunities/route.ts` y
`apps/web/src/app/api/social-opportunities/generate/route.ts` para corregir
la clasificación temática, la evidencia y la expansión long tail. No se
tocarán producción, esquema, secretos ni archivos fuera de esta reserva.

## RESERVA LIBERADA — AUDITORÍA Y EXPANSIÓN LONG TAIL SEO/REDES — 2026-09-04

Identidad: Codex, conversación "AUDITORIA A ALGORITMO DE PUBLICACIÓN DE ARTICULOS".
Archivos reservados exclusivamente en `/private/tmp/auditoria-longtail-20260904`:
`apps/web/src/lib/opportunity-analysis.ts` y
`apps/web/src/app/api/social-opportunities/generate/route.ts`.
Objetivo: ampliar la exploración temática long tail y evitar únicamente la
repetición de intención, tanto en oportunidades SEO/AEO como en redes sociales.
No se tocarán Vercel, middleware, autenticación, secretos, esquema ni otras redes.
Estado: cambios preparados en worktree aislado, sin commit, push ni despliegue;
reserva liberada al cerrar esta intervención.

### Triple auditoría — 2026-09-04

1. Funcional: prompt SEO revisado; expansión temática antes del filtro de
intención, sin tope fijo por categoría y memoria completa de títulos recibidos.
Prompt social revisado para ángulos y subtemas complementarios por red.
2. Regresión: `git diff --check` correcto; no se modificaron contratos,
persistencia, publicación, Vercel, middleware, autenticación, secretos ni
esquema. TypeScript del worker (`npx tsc -p apps/worker/tsconfig.json --noEmit`)
correcto. El typecheck web conserva errores preexistentes fuera de estos
cambios.
3. Integración/preproducción: `npm run build` ejecutado desde `apps/web`,
con Prisma generado, compilación, TypeScript y generación de 83 rutas correctos.
`vercel.json` conserva `buildCommand: "npm run build"` y `outputDirectory: ".next"`.
No se desplegó ni se modificó producción; la verificación post-despliegue queda
pendiente de autorización explícita.

**Texto literal de Milton, sin editar:** "NOTA OBLIGATORIA: Es importante
que, antes de comenzar, obedezcas de manera ciega y sin omitir ninguna
instrucción el protocolo del documento de coordinación y que,
adicionalmente, releas estas normas."

En otras palabras: **lectura obligatoria antes de empezar cualquier
tarea.** Toda conversación debe obedecer de manera ciega y sin omitir
ninguna instrucción el protocolo de este documento de coordinación, y
adicionalmente releer estas normas antes de comenzar. Antes de subir
cualquier cosa a producción, la
conversación debe declararlo explícitamente citando este protocolo — por
ejemplo: *"Subiré a producción de acuerdo al Protocolo de No Destrucción."*
Esa declaración es la confirmación de que el protocolo fue leído; si una
conversación no la hace, debe pedírsele antes de continuar.

## 1. Aislamiento del trabajo

Debes realizar esta tarea de la mejor manera posible, trabajando
exclusivamente en un worktree independiente y completamente aislado de
cualquier otro desarrollo en curso, de forma que todo lo que programes
pueda subirse a producción sin depender, interferir ni mezclarse con otros
trabajos.

**Refuerzo explícito de Milton (2026-09-04), motivado por un caso real**:
"independiente y completamente aislado" significa que el worktree debe
crearse en una ruta **completamente separada** del checkout principal (por
ejemplo `/private/tmp/<nombre-del-problema>`, como ya hace la mayoría de
las conversaciones registradas en `INVENTARIO_CONVERSACIONES.md`). **Está
prohibido crear un worktree anidado dentro de la carpeta del checkout
principal** (por ejemplo, algo como
`.worktrees/<nombre>` dentro de `/Users/miltondavila/Creador de
articulos/`). Un worktree encapsulado dentro de main deja de ser
independiente: puede confundirse con el propio árbol de `main`, aparecer
sin querer en operaciones sobre el checkout principal, y es exactamente el
tipo de desorden que este protocolo busca evitar. Se detectó un caso real
de esto el 2026-09-03/04 (`codex/google-api-verification` en
`.worktrees/google-api-verification`, dentro del checkout principal) — se
documenta aquí como advertencia, no se deshizo porque su trabajo ya fue
autorizado y promovido a producción.

## 2. Prohibición absoluta de romper lo que ya funciona

Está prohibido destruir, alterar incorrectamente o afectar cualquier
funcionalidad que ya esté implementada y funcionando, y no se permite
cometer errores que obliguen a regresar a versiones anteriores, restaurar
código o deshacer trabajos existentes. Antes de modificar cualquier cosa,
debes comprender perfectamente la estructura actual, proteger todo lo que ya
funciona y realizar únicamente los cambios estrictamente necesarios.

## 3. Tres auditorías completas e independientes, obligatorias antes de producción

Al finalizar la programación, debes ejecutar TRES AUDITORÍAS COMPLETAS E
INDEPENDIENTES y documentarlas, para verificar que:
- Lo desarrollado funciona exactamente como debe.
- Ningún cambio rompe, altera o degrada funcionalidades existentes.
- La integración no introduce errores, regresiones, conflictos ni efectos
  secundarios en producción.

No debes enviar nada a producción hasta que las tres auditorías hayan sido
completadas satisfactoriamente.

**Orden directa de Milton (2026-09-04)**: esto no es una recomendación de
buenas prácticas, es una **orden obligatoria sin excepción**. Ningún
programador (Claude, Codex, Antigravity, o el Reparador del Árbol
Principal) ejecuta un despliegue a producción sin haber completado y
documentado las tres auditorías primero. El motivo explícito de esta orden
es evitar que un arreglo puntual ("un arreglo") tumbe producción por mala
ejecución — el objetivo no es la auditoría en sí, es que producción nunca
se caiga por un cambio que no se verificó lo suficiente antes de subirlo.

## 4. Despliegue y verificación posterior

Una vez verificadas y aprobadas las auditorías, sube a producción únicamente
los cambios realizados en ese worktree y confirma que producción continúa
funcionando correctamente después del despliegue. **La tarea no termina al
programar: termina únicamente cuando el cambio está desplegado en
producción, verificado, y sin afectar absolutamente nada de lo que ya
estaba funcionando.**

## 5. Reserva y liberación de archivos

Es importante que, si comienzas a trabajar con un archivo, debes reservarlo y documentarlo en
el documento de coordinación. No debes quedarte con la reserva ni con el
control exclusivo del archivo: debes hacer lo que necesites hacer y
liberarlo al terminar. Si deseas trabajar en un archivo que otro programador
está usando, deberás esperar y coordinar; no puedes sobrescribir, mezclar ni
absorber su trabajo.

## 6. Disciplina de commits

Antes de cualquier commit, debes revisar `git status`, el diff completo y el
diff preparado para commit. Nunca debes incluir cambios de otros
programadores ni usar `git add .` o `git add -A`.

## 7. Cambios de versión de software

No se te permite cambiar de versiones del software sin avisar previamente y
explicar claramente el porqué, el riesgo y el impacto de la decisión.

## 8. ADVERTENCIA CRÍTICA SOBRE VERCEL (obligatoria, no se puede omitir bajo ninguna circunstancia)

Este proyecto ya sufrió una caída real por una configuración incorrecta
introducida en los commits `535b690` y `dbbe75f`. Vercel tenía configurado
`Root Directory = apps/web`, pero se utilizaron
`"buildCommand": "npm run build --workspace=apps/web"` y
`"outputDirectory": "apps/web/.next"`. Esa combinación hizo fallar el build
con `No workspaces found`, generó rutas duplicadas y terminó mostrando el
mensaje engañoso `MIDDLEWARE_INVOCATION_FAILED` en producción. **El
middleware y `SESSION_SECRET` no eran el problema.**

Regla exacta:
- Cuando `Root Directory = apps/web`, debes usar exactamente
  `"buildCommand": "npm run build"` y `"outputDirectory": ".next"`. Está
  prohibido mezclar esa configuración con comandos o rutas relativas a la
  raíz del repositorio.
- Solo puedes usar `--workspace=apps/web` y `apps/web/.next` si Vercel está
  configurado para trabajar desde la raíz del repositorio.
- Antes de modificar `vercel.json`, Vercel, middleware, autenticación o
  variables secretas, debes revisar primero el `Root Directory` real y los
  logs completos del build.
- Antes de cualquier despliegue debes ejecutar el build desde el mismo
  directorio que utiliza Vercel, confirmar que el directorio de salida
  exista en la ruta esperada, revisar el diff exacto y completar las tres
  auditorías.
- Si encuentras cualquier contradicción, debes detenerte y avisar.

Esta advertencia es obligatoria y no puede omitirse bajo ninguna circunstancia.

## 9. Regla final, sin excepción

**De ninguna manera ejecutarás una acción que TUMBE a producción.**

---

# ROL PERMANENTE DE CLAUDE — PROPAGAR INFORMACIÓN A LOS DOCUMENTOS CORRECTOS (agregado 2026-09-04, pedido explícito de Milton)

**Encargo de Milton**: de ahora en adelante, cada vez que alguien deje
información en `COORDINACION_CLAUDE_CODEX.md`, es responsabilidad de
Claude revisar si esa información debe escribirse también en otro de los
documentos maestros — no debe quedar solo acá si le corresponde vivir en
otro lado. Esto aplica a **cualquier sesión de Claude** que lea este
documento, no solo a la que escribe esta regla.

**Mapa de a dónde va cada cosa** (ya definido antes en esta conversación
con Milton, formalizado acá):

| Si la entrada de Coordinación menciona... | Se propaga también a... |
|---|---|
| Una idea suelta para más adelante, sin ejecutar todavía | `TO-DO.md` |
| Quién tiene qué archivo/rama reservada, o el nombre exacto de una conversación nueva | `INVENTARIO_CONVERSACIONES.md` (Parte A si es una reserva activa, Parte B si es historial de la conversación) |
| Un commit, deployment, estado de Vercel o verificación en producción de una versión | `CONTROLADOR_DE_VERSIONES.md` |
| Un cambio visible para el usuario final (pantalla, flujo, mensaje, permiso, módulo nuevo) | `apps/web/src/content/manual-usuario.ts` — este archivo alimenta directamente al bot de ayuda (ver `apps/web/src/lib/user-manual.ts`), así que dejarlo desactualizado deja al bot respondiendo con información vieja |
| Un problema de árbol de git enredado, ramas pisadas o commits mezclados | `REPARADOR_DEL_ARBOL_PRINCIPAL.md` |

**Cómo hacerlo, sin romper nada**: worktree aislado, nunca borrar ni
reescribir lo que ya está en Coordinación (esa entrada se queda donde
está, la propagación es una copia/resumen hacia el otro documento, no un
traslado), commit y push siguiendo el Protocolo de No Destrucción de más
abajo.

**Automatización diaria**: además de que cualquier sesión interactiva de
Claude debe hacer esto al momento si detecta información sin propagar,
Milton pidió una tarea programada que corra cada 24 horas, revise todo lo
escrito en `COORDINACION_CLAUDE_CODEX.md` desde la última corrida, y
propague lo que corresponda — para que esto no dependa de que haya una
conversación de Claude abierta en ese momento. Ver la entrada de
configuración de esa tarea (fecha de creación, horario, alcance exacto)
donde corresponda registrarla la primera vez que se configure.

---

# PROTOCOLO: CANAL DE COMUNICACIÓN (agregado 2026-09-04, pedido explícito de Milton)

**Qué es**: un mecanismo repetible para que Milton conecte a Claude
directamente con cualquier otra conversación (Codex, Antigravity, otra
sesión de Claude) hasta resolver una tarea puntual — probado por primera
vez con `CODEX - AUDITORIA A ALGORITMO DE PUBLICACIÓN DE ARTICULOS` (PR
#42), documentado más abajo en este archivo.

**Activación**: Milton le dice a Claude, en cualquier conversación:
`Ejecuta Canal de Comunicación: [Título exacto de la conversación]`.

**Qué hace Claude al activarse:**
1. Confirma que su monitor automático está corriendo (revisa
   `origin/main` completo cada 30 segundos; un solo monitor sirve para
   todos los canales abiertos a la vez, no hace falta uno nuevo por
   conversación).
2. Abre una sección nueva en este documento, con este formato:

   ```
   ## Canal de comunicación — [Título exacto de la conversación] — [fecha]

   Reglas: bitácora en orden cronológico, sin borrar entradas; entradas
   cortas firmadas ("Claude:" / "[Agente]:"); revisión cada ~30 segundos de
   ambos lados; commit y push inmediato de cada entrada (sin acumular
   varias sin subir); termina con una entrada de cierre cuando el objetivo
   puntual esté resuelto.

   ### Bitácora
   - **[fecha] Claude:** canal abierto, esperando la primera entrada de
     [Agente].
   ```

3. Le entrega a Milton un texto listo para copiar y pegar en la otra
   conversación, indicándole que lea esta sección y empiece a reportar ahí.

**Límites, siempre vigentes** (no cambian por tener un canal abierto):
- El canal es para **una tarea puntual**, no una autorización general —
  cada canal se abre para un objetivo específico y se cierra al terminarlo.
- Claude orienta, responde preguntas, señala riesgos y cruza información
  con la Parte A de `INVENTARIO_CONVERSACIONES.md` (quién tiene qué
  reservado) — no decide fusiones ni despliegues en nombre de otra
  conversación; eso lo sigue haciendo cada capitán de archivo, con el
  Protocolo de No Destrucción de este documento siempre por delante.
- El monitoreo solo corre mientras la conversación de Milton con Claude
  esté abierta — no es un proceso permanente de fondo; si Milton cierra la
  sesión, el canal deja de vigilarse hasta que la reabra.

---

## Canal de comunicación — `CODEX - INSTRUCCIONES EN MODULOS` — 2026-09-04

Reglas: bitácora en orden cronológico, sin borrar entradas; entradas
cortas firmadas ("Claude:" / "Codex:"); revisión cada ~30 segundos de
ambos lados; commit y push inmediato de cada entrada (sin acumular varias
sin subir); termina con una entrada de cierre cuando el objetivo puntual
de esta conversación esté resuelto.

Contexto encontrado por Claude antes de abrir el canal (para no arrancar
de cero): esta identidad ya aparece en este mismo documento en entradas
anteriores de agosto/2026 sobre auditoría y mejora de las explicaciones
iniciales de Publicar, Oportunidades, Configuración y sus submódulos. Si
esta es una continuación de esa línea de trabajo o una tarea nueva con el
mismo nombre, contámelo acá para no asumir de más.

### Bitácora

- **[2026-09-04] Claude:** canal abierto a pedido de Milton. Contame en
  qué estás trabajando ahora mismo dentro de `CODEX - INSTRUCCIONES EN
  MODULOS` — qué archivos tenés reservados, qué falta, y si hay algo
  bloqueado o alguna pregunta puntual para mí. Reviso cada 30 segundos.
- **[2026-09-04] Claude:** **CANAL DESACTIVADO por pedido de Milton**,
  antes de recibir respuesta de Codex. No se borra nada de lo escrito
  arriba. Si Milton quiere retomar la comunicación con esta conversación,
  se reactiva con "Ejecuta Canal de Comunicación: CODEX - INSTRUCCIONES EN
  MODULOS".

---

# METODOLOGÍA DE TRABAJO EN PARALELO Y CAPITÁN DE ARCHIVO (agregada 2026-09-04, pedido explícito de Milton)

**Motivo**: Milton reportó un problema recurrente — programadores (conversaciones)
que ya tenían el trabajo listo para producción, pero que responden "no puedo
subir, voy a pisar código que está ahí" y en vez de resolverlo terminan
creando otra rama independiente nueva, una y otra vez. Milton fue explícito:
"esto ya lo teníamos resuelto pero cada vez me dicen lo mismo... no me sirve
que me digan a cada rato que no pueden subir". El objetivo de esta sección es
que el equipo trabaje **en paralelo de verdad**, sin destruir nada, sin que
"otro programador puede estar usando esto" sea una excusa para no terminar.

**Diagnóstico real, no supuesto**: en esta misma conversación, hoy
(2026-09-03/04), pasó tres veces algo que ilustra la causa exacta: otra
sesión (Codex) dejó texto sin commitear directamente en el checkout
compartido durante horas mientras seguía trabajando, y mientras tanto
`origin/main` avanzaba con commits de otras conversaciones. Al momento de
sincronizar, hubo que resolver dos conflictos de texto. **En los dos casos
la resolución fue trivial y tomó segundos**: conservar ambos aportes, en
orden, sin perder una palabra de ninguno de los dos. Eso es la prueba de
que "puedo pisar código ajeno" casi nunca es un motivo real para bloquear
una subida — es un motivo para hacer un `rebase` y resolver, no para huir a
otra rama nueva.

## A. Antes de reservar — consulta rápida obligatoria (segundos, no minutos)

1. `git fetch origin main` y revisar si `origin/main` avanzó.
2. Abrir `INVENTARIO_CONVERSACIONES.md`, Parte A ("¿Quién tiene qué
   reservado AHORA MISMO?") — ahí está la verdad en vivo, verificada contra
   git, no contra memoria de nadie.
3. Si el archivo que necesitás no aparece reservado ahí, está libre.

## B. Cómo reservar — capitán de archivo

- Quien empieza a trabajar un archivo se convierte en su **capitán** por la
  duración de esa tarea puntual — mismo concepto que ya existe para
  "capitán de migración", extendido a cualquier archivo.
- La reserva se declara con una línea agregada a la Parte A de
  `INVENTARIO_CONVERSACIONES.md` (archivo, conversación, hora). No hace
  falta redactar un párrafo largo para reservar — una línea alcanza; el
  párrafo completo se escribe al cerrar la tarea, como ya indica el
  protocolo existente.
- El capitán trabaja en worktree/rama aislada (regla ya vigente, sección 1
  del Protocolo de No Destrucción) y limita el cambio al alcance
  estrictamente necesario del archivo reservado.

## C. Antes de subir a producción — el paso que estaba faltando

**Rebasar sobre `origin/main` es siempre el último paso antes de empujar,
sin importar cuánto haya avanzado `main` mientras tanto.** Un conflicto al
rebasar NO es "estoy pisando a otro programador" — es la señal normal de
que dos personas trabajaron en paralelo, y se resuelve ahí mismo:

1. `git fetch origin main` + `git rebase origin/main`.
2. Si hay conflicto en una sección de texto/documentación (el caso más
   común): conservar **ambos** aportes, en el orden en que corresponda
   cronológicamente, sin borrar ni resumir ninguno. Ver el ejemplo real de
   hoy más abajo en este documento como referencia de cómo se hace.
3. Si hay conflicto en código: revisar si son cambios en zonas distintas
   del mismo archivo (caso común y fácil — Git ya lo resuelve solo la
   mayoría de las veces) o en la misma línea/función (caso raro — ahí sí
   hay que leer ambos cambios y decidir, nunca descartar uno a ciegas).
4. Repetir las auditorías que correspondan sobre el resultado ya rebasado
   (no sobre una base vieja).
5. Empujar.

**Lo que NO hay que hacer**: crear una rama nueva "por las dudas" en vez de
terminar el rebase; dejar el cambio sin commitear durante horas en el
checkout compartido esperando "el momento ideal" (eso es lo que causa los
conflictos grandes, no los conflictos en sí); ni preguntar si se puede
subir cuando el propio rebase ya demuestra que no hay pisado real.

## C.1. Autonomía ya otorgada — no esperar permiso especial cada vez

Milton reportó (2026-09-04) que tiene que repetir, conversación tras
conversación, algo como "te doy la libertad de que busques una solución sin
destruir nada" para que un programador se anime a ejecutar. Eso es
fricción que ya no debería existir: **esa libertad ya está otorgada de
forma permanente por este documento, para cualquier conversación, sin
necesidad de que Milton la repita cada vez.**

Si una tarea tiene un problema bien identificado y se cumplen las barreras
ya obligatorias de este Protocolo — worktree aislado, no romper lo que
funciona, tres auditorías antes de producción, rebase y resolución de
conflictos antes de subir, aviso automático a Coordinación al terminar —
el programador **ejecuta directamente**, sin pedir autorización especial
para "empezar a investigar" o "crear una rama". Pedir permiso para eso es
redundante: el permiso ya está escrito acá. Lo que sí sigue necesitando
autorización explícita de Milton en el momento es lo que ya listan las
reglas existentes de este repositorio (aplicar una migración, promover a
Producción, cambiar de versión de software, enviar algo a un tercero) — no
el hecho de ponerse a trabajar en el diagnóstico y la corrección.

## D. Liberar

Al terminar, borrar la línea de reserva de la Parte A del Inventario y
completar el párrafo de cierre (Norma Suprema 1: informar automáticamente
al culminar). Un capitán no se queda con un archivo reservado más tiempo
del que está trabajándolo activamente.

## E. Archivos calientes (mucha contención) — regla especial

Algunos archivos son tocados por muchas conversaciones distintas en poco
tiempo (el propio `COORDINACION_CLAUDE_CODEX.md` es el caso más claro, pero
también pasa con archivos de código muy compartidos como
`apps/web/src/app/api/opportunities/execute-all/route.ts` o
`apps/web/src/app/dashboard/oportunidades/page.tsx`). Para esos casos:

- **Ventanas cortas**: cambios pequeños y commit/push inmediato, no ramas
  de larga duración que acumulan divergencia con `main`.
- **Para el propio documento de Coordinación**: escribir el bloque nuevo,
  commitear y empujar apenas se termina esa entrada — no dejarlo abierto
  sin commitear mientras se sigue trabajando en otra cosa. Esa espera es
  la causa real de los conflictos grandes, no el hecho de que dos personas
  escriban el mismo día.
- **Si de verdad hace falta esperar** (dos conversaciones necesitan tocar
  exactamente la misma función al mismo tiempo): la segunda avisa en la
  Parte A del Inventario que está "en cola" detrás del capitán actual, y
  arranca en cuanto el primero libera — no abandona la tarea ni improvisa
  una tercera rama para evitar coordinar.

### Caso de estudio real — parches acumulados sin dueño de diseño

Milton señaló (2026-09-04) un ejemplo distinto pero relacionado: no es que
falte reserva, es que un archivo puede acumular **parches puntuales de
varias conversaciones sucesivas** sin que ninguna tenga la responsabilidad
del diseño completo. Texto de Milton, preservado tal cual:

> "No es un programador específico. La dificultad está en el diseño actual
> de estos archivos:
> - `apps/web/src/lib/opportunity-analysis.ts`: contiene el prompt
>   principal; el modelo sigue teniendo demasiada libertad para convertir
>   consultas débiles en variaciones genéricas; la validación de
>   canibalización es principalmente textual/exacta; no existe una etapa
>   separada y obligatoria de: tema raíz → ramas temáticas → clasificación
>   → títulos.
> - `apps/web/src/app/api/opportunities/route.ts`: solo envía al modelo
>   hasta 8 ejemplos publicados por categoría; obtiene datos de GSC, GA4 y
>   Bing, pero no construye previamente un mapa estructurado de temas y
>   ramas; la categoría se entrega principalmente como nombre, por lo que
>   el modelo puede asignar mal una consulta.
> - `apps/web/src/app/api/social-opportunities/generate/route.ts`: solo
>   genera textos sociales derivados de artículos existentes; no descubre
>   realmente nuevas temáticas long tail para redes; el cambio aplicado
>   allí únicamente obliga a usar ángulos diferentes.
>
> La limitación principal está en `opportunity-analysis.ts`, apoyada por la
> forma en que `route.ts` prepara la información. No es un problema de
> Vercel, del worker ni de un programador concreto."

Esto no se resuelve con más reservas puntuales — cada conversación nueva
que toque `opportunity-analysis.ts` con un parche aislado (como ya pasó con
"cero canibalización y longtail", ver más arriba en este documento) alivia
un síntoma pero no cambia el diseño de fondo. Queda documentado como
hallazgo pendiente de decisión de Milton: si amerita una conversación
dedicada de rediseño (`[AGENTE] - REDISEÑO DE OPPORTUNITY-ANALYSIS`, por
ejemplo) en vez de seguir acumulando parches. No se tocó código para
escribir esta entrada.

---

## Decisión de Milton — `stash@{0}` (migración de dominio OAuth de Google) — 2026-09-03

Al revisar los `git stash` sueltos en el checkout principal
(`/Users/miltondavila/Creador de articulos`), se encontró `stash@{0}`
("cambios locales desincronizados pre-sync 2026-09-03"): contiene, entre
otros archivos, una migración de las URLs de redirección OAuth de Google
por defecto (`apps/web/src/lib/google-oauth.ts`, `bing-oauth.ts`,
`google-analytics-oauth.ts`) de `auto-articulos-web.vercel.app` hacia
`seototal.lasolucionweb.com`.

Se detectó que esto coincide en tema con el worktree activo
`codex/google-api-verification` (commit `7908b01`, "chore: prepare Google
OAuth domain and verification pages"), donde Milton y Codex están
trabajando ahora mismo en lo mismo — la migración de dominio para la
verificación OAuth de las APIs de Google.

**Decisión de Milton**: no tocar `stash@{0}` todavía. Milton está
trabajando esto ahora mismo junto con Codex; hay que esperar a que esa
conversación culmine. Si al terminar queda algo suelto o sin resolver de
`stash@{0}` que no haya sido cubierto por el trabajo de Codex, se le pasa
al **Reparador del Árbol Principal** (`REPARADOR_DEL_ARBOL_PRINCIPAL.md`)
para que lo diagnostique y lo integre o descarte de forma ordenada.

Estado: PENDIENTE — no tocar `stash@{0}` hasta que Codex culmine
`CODEX - GPT-5 - VERIFICACION DE API'S DE GOOGLE`.

---

# Coordinación de trabajo: Claude, Codex y Antigravity

Este archivo es el tablero operativo compartido para los **tres participantes autorizados: Claude, Codex y Antigravity (Google)**. Evita que modifiquen al mismo tiempo los mismos archivos o desplieguen cambios incompatibles. `HANDOFF.md` conserva el historial completo del proyecto; este archivo indica quién está trabajando ahora, en qué parte y con qué archivos.

## `TO-DO.md` — buzón de ideas de Milton (leer, nunca ejecutar sin pedido)

Existe un tercer archivo en la raíz del repo, `TO-DO.md` (agregado 7/8/2026), donde Milton guarda ideas sueltas para pedirlas más adelante. **Ningún agente (Claude, Codex, Antigravity) debe ejecutar, proponer iniciar ni investigar un ítem de esa lista por su cuenta** — un ítem escrito ahí es una nota que él se deja a sí mismo, no una instrucción, ni siquiera si lleva tiempo ahí o parece simple. Se puede y conviene leerlo para tener contexto de hacia dónde va el proyecto; se actúa sobre un ítem solo cuando Milton lo pide explícitamente en la conversación activa. Al ejecutar algo de ahí, moverlo a la sección "Hecho" de `TO-DO.md` y documentar el cambio real en `HANDOFF.md` como de costumbre.

## `REPARADOR_DEL_ARBOL_PRINCIPAL.md` — manual permanente de un rol de orden y limpieza (agregado 2026-09-03)

Existe un cuarto archivo de referencia en la raíz del repo,
`REPARADOR_DEL_ARBOL_PRINCIPAL.md`, creado por Codex a pedido de Milton.
No es una conversación ordinaria ni una tarea puntual: es el manual
permanente de un rol de mantenimiento de orden en el árbol de git —
investigar qué está realmente en Producción, separar proyectos mezclados,
identificar responsables por conversación/programador/modelo, y clasificar
cada cambio encontrado (`CONSERVAR`, `INTEGRAR`, `PAUSAR`, `ARCHIVAR` o
`RESPONSABLE NO IDENTIFICADO`) sin perder trabajo válido de nadie.

Ese archivo deja explícito, en su propia sección "Límites obligatorios", que
las decisiones finales son de Milton, que no se borran commits de
Producción ni se aplican migraciones o deploys sin su autorización expresa,
y que no se usan `git add .`/`git add -A`/`git clean`/`git reset
--hard`/force-push — es decir, un rol de diagnóstico y orden, no de
autoridad destructiva.

Cualquier agente (Claude, Codex, Antigravity) que retome la conversación
`REPARADOR DEL ARBOL PRINCIPAL` debe leer primero ese archivo completo, y
debe tener acceso sin restricción a este documento y a
`INVENTARIO_CONVERSACIONES.md` completos —incluida cualquier información de
reservas, responsables o commits que ahí aparezca— para poder identificar
correctamente de quién es cada rama antes de proponer cualquier
clasificación u orden.

## Regla obligatoria antes de iniciar cualquier tarea (OPTIMIZADA PARA MÍNIMO CONSUMO DE TOKENS)

Claude, Codex y Antigravity deben hacer lo siguiente **antes de leer o modificar código**:
1. Leer únicamente la sección "Trabajo activo" de este archivo (NUNCA leer el archivo completo).
2. Ejecutar `git status --short` y `git log -5 --oneline`.
3. Revisar únicamente el estado actual de `HANDOFF.md` si es relevante para la tarea.
4. Confirmar que ningún otro agente tenga reservados los archivos o el área.
5. Registrar su tarea en "Trabajo activo" antes de editar.
6. Si existe una reserva que se cruza con la tarea, detenerse y coordinar.

## ORDEN OBLIGATORIA — nadie daña el trabajo de nadie

**Orden directa de Milton (13/8/2026):** ningún agente (Claude, Codex, Antigravity) puede dañar, sobrescribir, perder ni absorber sin darse cuenta el trabajo de otro agente ni del usuario. Esto no es una sugerencia, es una orden.

**Incidente real que la motiva:** el mismo 13/8/2026, una sesión hizo commit de un cambio en `COORDINACION_CLAUDE_CODEX.md` mientras OTRA sesión tenía un cambio distinto al mismo archivo ya escrito en disco pero sin commitear todavía. El commit de la primera sesión absorbió sin querer el cambio de la segunda. En este caso no se perdió contenido — pero es exactamente el tipo de accidente que la próxima vez SÍ puede borrar o corromper trabajo real.

**Reglas concretas para que no vuelva a pasar:**
- Antes de cualquier `git add`/`git commit`, correr `git status --short` y `git diff --staged` (o revisar el diff de cada archivo agregado) para confirmar que lo que se va a commitear es SOLO lo propio, y no un cambio ajeno que estaba en disco sin commitear.
- Nunca usar `git add .` ni `git add -A` — agregar únicamente las rutas exactas que el propio agente modificó (regla ya existente, reforzada acá
- Nunca usar `git add .` ni `git add -A` — agregar únicamente las rutas  exactas

> **Trabajo activo — 23/8/2026 (Tumblr):** Codex implementó la integración Tumblr sin modificar las redes existentes: permiso por usuario, credenciales globales cifradas, OAuth2 (`basic write offline_access`), callback `/api/search-integrations/tumblr/callback`, selección de blog, oportunidades y publicación de posts con imagen OG. El commit `b04b0e9` quedó separado y enviado a `main`. Pendiente: aplicar la migración en Supabase, desplegar y luego ingresar Consumer Key/Secret desde Configuración → Redes Sociales → Tumblr.

> **Decisión de coordinación — 23/8/2026 (Google Analytics):** La rama `codex/integracion-google-analytics` no debe fusionarse completa: está desfasada respecto a `origin/main` y su diff elimina integraciones y workflows ya desplegados (Tumblr, Pinterest, Bluesky, DEV.to, Mastodon, prompt pipeline y workflows). El responsable debe rebasar una copia aislada sobre el `origin/main` actual, extraer únicamente los archivos necesarios para Google Analytics y su migración, restaurar cualquier archivo existente que no pertenezca al proyecto, ejecutar typecheck/build y revisar el diff exacto antes de solicitar publicación. No borrar ni reemplazar integraciones existentes. La producción queda protegida hasta completar esa separación y auditoría.

## Liberación coordinada de main — 23/8/2026

[CODEX] - REDES SOCIALES
Proyecto: lote de Tumblr, menú/no-cache, enlaces del historial y ajustes de publicación social realizados en este worktree.
Archivos: no hay cambios locales pendientes; el worktree está limpio.
Commit: `b04b0e9` (integración Tumblr) y `25aee57` (documentación de coordinación); los cambios publicados están incorporados en `origin/main`.
Estado: terminado.
¿Publicado en producción?: sí; Tumblr y los ajustes asociados fueron desplegados. La rama actual coincide con `origin/main`.
¿Debe conservarse?: sí, en `origin/main`; no conservar copias locales redundantes.
Acción inmediata: liberar este lote y no realizar cambios, migraciones ni despliegues adicionales desde esta sesión.
Responsable siguiente: responsable del siguiente lote identificado en este documento; cualquier cambio nuevo debe usar su propia rama o worktree.
Capitanía de migración: no.

## REGLA PERMANENTE — VERCEL, ROOT DIRECTORY Y `vercel.json`

Esta regla debe ser leída y cumplida por **todas las conversaciones y agentes**
(Claude, Codex y Antigravity) antes de modificar `vercel.json`, la configuración
de Vercel o cualquier despliegue.

El valor de Vercel **Root Directory** y las rutas de `vercel.json` deben tratarse
como un solo sistema. Nunca se deben mezclar rutas relativas a la raíz del
repositorio con rutas relativas al `Root Directory`. Los dominios
`auto-articulos-web.vercel.app` y `seototal.lasolucionweb.com` son únicamente
dominios/alias: no cambian el `Root Directory` ni autorizan rutas duplicadas.

Para el proyecto actual, cuyo `Root Directory` real es `apps/web`,
`vercel.json` debe vivir físicamente en `apps/web/vercel.json`; no debe existir
otro `vercel.json` en la raíz del repositorio. La configuración compatible es:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install --legacy-peer-deps"
}
```

Solo si Vercel se configura deliberadamente para usar la raíz del repositorio se
pueden usar comandos o rutas como `--workspace=apps/web` y `apps/web/.next`;
esa migración requiere coordinación explícita, cambio coherente de ubicación y
contenido de `vercel.json`, y registro del motivo. Nunca se debe mezclar una
configuración de raíz con `Root Directory=apps/web`.

Antes de publicar, el agente debe:

1. Confirmar el `Root Directory` real en el proyecto de Vercel; no confiar en
   documentación antigua, memoria o supuestos.
2. Confirmar que `vercel.json` esté dentro de ese directorio y que no haya una
   segunda configuración en la raíz.
3. Ejecutar el build desde ese mismo directorio, con exactamente el comando que
   Vercel utilizará; para el estado actual: `cd apps/web && npm run build`.
4. Verificar que exista `apps/web/.next` y que el dry-run desde la raíz del
   repositorio no incluya secretos, scripts operativos ni rutas duplicadas.
5. Revisar `git status`, el diff completo, el diff preparado y los logs completos
   del despliegue antes de hacer commit o publicar.
6. Ejecutar las tres auditorías independientes obligatorias antes de promover a
   producción y comprobar después los dos dominios públicos.

Condiciones de detención inmediata: si el Root Directory real contradice el
documento o el repositorio, si la ruta del build/salida no coincide, si el
deployment actual contiene trabajo más nuevo de otro agente o si los logs
muestran cualquier error, no se publica y se coordina primero.

Incidente que esta regla previene: el commit `535b690`, seguido por `dbbe75f`,
configuró comandos de monorepo mientras Vercel ya estaba dentro de `apps/web`.
Eso produjo `No workspaces found`, una ruta duplicada de salida y el mensaje
engañoso `MIDDLEWARE_INVOCATION_FAILED` en producción. El middleware y las
variables secretas no eran la causa.


## Trabajo activo — REGLA PERMANENTE VERCEL/ROOT DIRECTORY — 2026-09-02

Responsable: CODEX - GPT-5.

Worktree aislado: `/private/tmp/this-routing-middleware`.

Archivos reservados exclusivamente por esta tarea:
- `COORDINACION_CLAUDE_CODEX.md`

Objetivo: documentar una regla permanente para prevenir configuraciones
incompatibles entre Vercel, `Root Directory` y `vercel.json`.

Estado: COMPLETADO. Archivo liberado el 2026-09-02; no queda reserva activa.

## PROTECCIÓN PERMANENTE — INSTRUCCIONES DE PUBLICAR — 2026-09-04

Identidad exacta: `INSTRUCCIONES EN MODULOS` — Codex.

Referencia válida de producción: `/dashboard/publicar` en
`https://seototal.lasolucionweb.com` y `https://auto-articulos-web.vercel.app`.

Contenido protegido: la tarjeta visual independiente rotulada **“Leer antes de
ejecutar”**, con el objetivo del módulo y los cuatro pasos para elegir categoría,
idioma/estilo, introducir títulos y revisar/iniciar la ejecución. La tarjeta debe
conservar fondo blanco, texto legible y su separación visual respecto de la
ejecución.

Objetivo del módulo: convertir ideas o títulos del usuario en artículos completos,
con contenido e imagen, para atraer visitas, responder preguntas de clientes y
fortalecer el posicionamiento SEO de su web; el usuario puede aportar títulos
propios o generados por otra inteligencia artificial.

Regla permanente: ningún cambio futuro puede borrar, reemplazar, duplicar,
ocultar o pisar estas instrucciones. Cualquier modificación de
`apps/web/src/app/dashboard/publicar/page.tsx` debe revisar explícitamente esta
sección, preservar el bloque completo y documentar el motivo, el diff y las tres
auditorías requeridas. Si una rama no contiene esta tarjeta, no puede publicarse
como actualización de Publicar.

Versión comprobada: commit independiente `ab65585`, deployment Vercel
`dpl_83YWDfLAV3m9oR32vWVMhbc9vUmm`, estado `READY`. Verificación postdespliegue:
los cuatro elementos de contenido aparecen en el DOM autenticado y el fondo de la
tarjeta computa como blanco (`rgb(255, 255, 255)`).

Responsable de protección documental: todo programador que toque el módulo debe
leer esta entrada y actualizar Coordinación, Inventario de Conversaciones y
Controlador de Versiones si cambia la referencia publicada. Esta entrada es
aditiva: no se deben borrar las anteriores.

## Codex — etiqueta de Redes por cuenta en Administración — 2026-10-07

- Se ajustó `apps/web/src/app/dashboard/usuarios/page.tsx` para que el selector
  del módulo `oportunidades-redes` muestre «Quitárselo a esta cuenta» para las
  cuentas normales y conserve «Dárselo a esta cuenta» para administradores,
  Zulmad y Lorena Alvarez.
- El cambio es únicamente de interfaz; no modifica permisos individuales de
  redes, schema, migraciones, datos ni producción.
- Verificación: `git diff --check` OK. Typecheck pendiente porque este worktree
  no contiene `node_modules`.

Estado: PREPARADO LOCALMENTE; sin commit, PR ni deploy.

Responsable: Codex.

## Codex — AUDITORÍA ENLACES HISTORIAL TODAS LAS REDES — 2026-10-06

- Se revisaron los enlaces de Historial para Threads, X, LinkedIn, Facebook,
  Instagram, Pinterest, Tumblr, Bluesky, DEV.to, Blogger y Google Business.
- X y LinkedIn dejaron de construir URLs directamente en la vista y ahora
  usan `socialPostUrl`, igual que Threads.
- `socialPostUrl` respeta URLs completas para todas las plataformas y añade el
  alias `twitter` para X. Cuando un ID aislado no basta para formar un
  permalink fiable, devuelve `null` en vez de mostrar un enlace incorrecto.
- Se añadieron pruebas para URLs completas de Blogger, Pinterest y Tumblr,
  el alias Twitter y el rechazo de IDs opacos sin URL.
- `git diff --check` pendiente de ejecutar después de esta edición. No hubo
  migración ni deploy.

## Cola de producción — enlaces de Historial — 2026-10-06

Milton pidió dejar este cambio en cola para producción. La corrección de
enlaces de Historial para todas las redes/blogs permanece únicamente en el
worktree local: **no subir, no crear PR y no desplegar todavía**.

## REPARACIÓN DE BUILD WEB — 2026-10-06

**Identidad:** CODEX - GPT-5 - REPARADOR DEL ARBOL PRINCIPAL.

**Base:** `origin/main` en rama aislada
`codex/reparar-typecheck-web-20261006`.

**Causa 1:** `apps/web/src/lib/modules.test.ts` tenía un bloque de test sin
cerrar; faltaba `});` antes del siguiente `test()`.

**Causa 2:** `apps/web/src/app/dashboard/usuarios/page.tsx` referenciaba el
estado inexistente `savingUserModules`. Se sustituyó por `savingAny`, el estado
agregado existente para bloquear el guardado durante cualquier operación de
permisos, módulos o límites.

**Alcance excluido:** Blogger, Composio, PostPeer, callbacks, secretos,
credenciales, schema Prisma, migraciones, middleware y `vercel.json` no fueron
modificados.

**Validación:** `prisma generate` correcto; typecheck web correcto después de
regenerar Prisma; build worker correcto; pruebas worker 20/20 correctas.
Las pruebas web ejecutaron 187 casos: 186 correctos, 1 fallo preexistente en
la expectativa antigua de `oportunidades-redes`, que ahora está deshabilitado
intencionalmente en `origin/main`. El build web no pudo terminar por un error
de permisos del entorno al crear un proceso/puerto interno de Turbopack
(`Operation not permitted`), no por estos dos archivos.

**Estado:** commit local creado para conservar la reparación y su evidencia,
pero **NO LISTO PARA PRODUCCIÓN** hasta repetir el build web en un entorno con
permisos de procesos completos y resolver o actualizar separadamente el test
preexistente de Redes Sociales. No hubo deploy ni cambios de producción.

## Corrección — REDES SOCIALES OFF PARA TODOS — 2026-10-05

Responsable: Codex. Corrección solicitada por Milton: pasar el selector
universal de Redes Sociales a OFF y deshabilitarlo para todos los usuarios no
administradores por ahora. El módulo `oportunidades-redes` ahora es
`alwaysDisabled`; las excepciones antiguas no lo pueden reactivar. Los
permisos individuales de cada red permanecen separados.

### Continuación CONEXION POSTPEER 2 — 2026-09-22

- Se confirmó el resultado de la prueba aislada de Lorena: el artículo exacto
  `https://segurosdesaludyvida.com/news/comparativa-de-seguros-medicos-economicos-en-florida`
  apareció como `GOOGLE-BUSINESS ✓ Publicado` en Historial, pero la publicación
  visible no mostró imagen. No se volvió a publicar.
- Causa identificada: `SocialOpportunity.imageUrl` estaba vacío para esa
  oportunidad y el worker no tenía respaldo de lectura de la imagen real del
  artículo. La generación de imagen IA no se reintroduce.
- Cambio pendiente en PR: `apps/worker/src/businessProfilePublish.ts` ahora
  usa primero `SocialOpportunity.imageUrl` y, si falta, obtiene la `og:image`
  pública del artículo exacto mediante `getArticleOpenGraphImage`. Si tampoco
  existe, falla antes de enviar la publicación; así GBP nunca publica sin foto.
  No hay recorte, adaptación ni generación de imagen.
- Commit: `ee9df8e` (`fix(gbp): use article og image fallback`).
- PR: #211, https://github.com/miltondavila-ux/auto-articulos/pull/211
  contra `main`. Checks observados: Vercel pasó como `Skipped - Not affected` y
  Vercel Preview Comments pasó. No hubo merge, deployment ni nueva publicación.
- Validaciones realizadas: TypeScript del worker (`npx tsc --noEmit -p
  apps/worker/tsconfig.json`) OK; `git diff --check` OK. El hook de commit
  informó que no pudo ejecutar el generador de actualización por falta de
  `DATABASE_URL`, pero el commit sí quedó creado; no se ejecutó migración.
- Archivos tocados: `apps/worker/src/businessProfilePublish.ts` y este
  documento. No se añadieron conexiones ni se modificó Configuración →
  Conexiones.
- Deployment: ninguno. Prueba posterior: pendiente de merge/deploy y de una
  única autorización explícita; no ejecutar otra publicación hasta que exista
  autorización. La prueba deberá activar `POSTPEER_GBP_CONSUMER_READY` solo para
  Lorena, usar el URL exacto de la oportunidad y confirmar imagen + artículo
  exacto como `Publicado` en Historial.
- Bloqueos restantes: revisión/merge del PR, autorización explícita de
  deployment y después una única prueba productiva controlada. Si desaparece de
  la cola sin Historial confirmado, revisar logs y no repetir publicación.

## PROTECCIÓN PERMANENTE — RENEW CONFIGURACION — 2026-09-07

Identidad exacta: proyecto `RENEW CONFIGURACION`, dentro de la continuación
de `CODEX - INSTRUCCIONES EN MODULOS`. Milton pidió el rediseño explícitamente
por ser "la que menos se entiende" de todo el sistema, usó MAGO para
especificarlo (documento `RENEW_CONFIGURACION.md`), y aprobó ejecutarlo
"autónomo" con una sola condición: "que una persona que no comprende nada...
pueda comprender esto".

Referencia válida de producción: `https://seototal.lasolucionweb.com/dashboard/configuracion`
y sus 6 subrutas (`/inicial`, `/cuenta`, `/contenido`, `/indexacion`,
`/redes-sociales`, `/movil`).

Contenido protegido:
1. `/dashboard/configuracion` es un ÍNDICE de navegación (tarjetas), no un
   formulario. No debe volver a mostrar directamente credenciales, categorías
   ni ningún campo — eso vive en sus páginas dedicadas.
2. **Cuenta** (`/cuenta`) y **Contenido** (`/contenido`) son secciones
   DISTINTAS y sin superposición: Cuenta = acceso (Credenciales, Categorías,
   Idioma de Redacción); Contenido = estilo editorial (Estilo de redacción
   por defecto, Firma, Ubicaciones geolocalizadas, Teléfono, Foto/logo). No
   deben volver a fusionarse en un solo bloque ni repetir la misma
   descripción — ese fue exactamente el problema que motivó el rediseño.
3. Cada página conserva su tarjeta `ModuleIntro` con explicación en lenguaje
   cotidiano ANTES de cualquier campo o botón.
4. `ConfiguracionView.tsx` fue retirado deliberadamente (commit `c7accf7`).
   No debe recrearse un componente único con pestañas que vuelva a mezclar
   estas 6 secciones.

Versión comprobada: commits `7615c9e`, `d20b2f1`, `2ff4969`, `c7accf7` en
`main`. `Vercel – auto-articulos-web: success` confirmado vía API de GitHub
para cada uno; `seototal.lasolucionweb.com/login` → 200 tras cada despliegue.
Detalle completo de las tres auditorías por fase en
`CONTROLADOR_DE_VERSIONES.md`, sección "RENEW CONFIGURACION (rediseño
completo, 6 fases)".

Regla permanente (mismo criterio que ya rige para Publicar y Oportunidades):
ningún cambio futuro puede volver a fusionar Cuenta y Contenido, ni ocultar
la explicación de cada página, ni resucitar el componente monolítico, sin
revisar esta sección primero y documentar el motivo, el diff y las tres
auditorías requeridas.
Estado: APROBADA POR MILTON — PROTEGIDA PERMANENTEMENTE.

## DECISIÓN DE MILTON — BUG NATALIA — 2026-09-08

Milton indicó expresamente que la ausencia de la cuenta de Natalia en la
base local no debe trabar esta corrección. Para este caso, la validación
funcional se hará sobre el caso real controlado, sin copiar a local su
contraseña, tokens, credenciales OAuth ni datos privados. Se mantienen
obligatorias la auditoría estática, la auditoría de regresión y la
verificación de integración/Producción; la limitación de la prueba local
queda documentada como excepción autorizada por Milton para este usuario.

Codex: solución preparada en `c162119`, rama
`codex/fix-natalia-category-login-20260908`; no fusionada todavía.

## Claude — CATEGORÍA ESPECÍFICA VS GENERAL: REGLA GENERALIZADA — 2026-09-29

**Hallazgo real (Milton probando en vivo, cuenta Guillermo Martínez):** 7 de
8 títulos sobre contrato 'as is' quedaron en "Venta" (general) en vez de
"As Is Contract Florida" (específica, con artículos publicados reales,
disponible en la lista). Mismo patrón de falla que Flow House/Port St.
Lucie, con otro par de categorías — confirma que es sistémico.

**Triple auditoría de causa:** (1) el prompt solo tenía un ejemplo puntual
(Flow House), sin regla general; (2) el patrón se repitió con categorías
distintas, confirma sistémico; (3) descartada causa de datos, la categoría
específica sí estaba disponible con ejemplos reales.

**Triple auditoría de estrategia:** (1) generalizar ataca la causa raíz;
(2) riesgo de sobre-corrección mitigado con contraejemplo real de la misma
corrida (gastos de cierre genérico, correctamente en "Venta"); (3) cambio
de solo texto de prompt, cero riesgo estructural.

**Fix (PR #265, sin fusionar todavía):** regla general explícita
reemplaza el ejemplo puntual de Flow House, ilustrada con dos casos reales
(Flow House + As Is Contract Florida vs Venta).

**Verificación:** `tsc --noEmit --strict` limpio. Pendiente reverificar en
producción con Guillermo Martínez.

**Responsable:** Claude. **Estado:** PR abierto, pendiente de fusión.

## Claude (tarea programada diaria de propagación) — 2026-10-06

Punto de partida: la última entrada firmada por esta misma tarea era la del 2026-10-03
(commit `d351feb`). Se revisó el rango `d351feb..origin/main` sobre
`COORDINACION_CLAUDE_CODEX.md`: dos commits lo tocaron, ambos de Milton directamente sobre el
documento — `f787bd9` ("feat: habilitar redes sociales para todos", agregó la entrada "Trabajo
activo — HABILITAR REDES SOCIALES PARA TODOS — 2026-10-02") y `5f10b56` ("fix: deshabilitar
redes sociales temporalmente", 2026-10-05), que **borró esa misma entrada** y la reemplazó por
"Corrección — REDES SOCIALES OFF PARA TODOS — 2026-10-05". Esa edición no la hizo esta tarea de
propagación (que nunca borra), sino un commit ajeno sobre el propio documento maestro; se deja
anotado aquí por transparencia, sin revertirlo, porque el protocolo de no-destrucción de este
documento aplica a cualquiera que lo edite, no solo a esta tarea.

Se verificó contra el código real de `origin/main` cuál de las dos versiones sigue vigente:
`apps/web/src/lib/modules.ts` tiene hoy `alwaysDisabled: true` en la entrada
`oportunidades-redes`, confirmando que el estado final es "apagado para todos los no
administradores" (commit `5f10b56`), no el "habilitado para todos" del commit `f787bd9` que ya
fue revertido.

Propagado por documento:

- `CONTROLADOR_DE_VERSIONES.md`: entrada nueva "Versión — 2026-10-05 — módulo de Redes
  Sociales: habilitado para todos y revertido el mismo día", con ambos commits (`f787bd9` y
  `5f10b56`), la verificación contra el código vigente, y la falta de confirmación de
  despliegue/Vercel en las entradas originales (esta tarea no tiene acceso a Vercel para
  comprobarlo).
- `apps/web/src/content/manual-usuario.ts`: nota nueva en la sección de
  `${MENU_NAMES.redes}` (debajo de la frase "Este módulo está en prueba...") explicando que,
  desde el 2026-10-05, el módulo está apagado para toda cuenta que no sea administradora, para
  que el bot de ayuda no siga diciendo solo que "se está activando poco a poco" cuando en
  realidad está deshabilitado a propósito.
- `INVENTARIO_CONVERSACIONES.md`: sin cambios — ninguna de las dos entradas trae un nombre de
  conversación en formato «[AGENTE] - [NOMBRE DEL PROBLEMA]» ni una reserva de archivo/rama
  activa verificable (no hay ningún worktree abierto además del de esta misma tarea, según
  `git worktree list`), así que no hay nada que indexar ahí todavía.
- `TO-DO.md`: sin cambios — ninguna idea suelta nueva sin ejecutar en este rango.
- `REPARADOR_DEL_ARBOL_PRINCIPAL.md`: sin cambios — no se encontró ninguna mención nueva a
  árboles de git enredados, ramas pisadas o commits mezclados en el rango revisado (la edición
  que borró y reemplazó una entrada se anotó arriba, en este mismo documento, por no calzar
  exactamente en el tema de ese archivo).

No hubo ninguna acción destructiva, migración ni deploy ejecutados por esta tarea.

Responsable: Claude (tarea programada diaria de propagación).

---

## Historial archivado

Lo cerrado se movió sin editar a los documentos de destino. Cada uno tiene su propio índice al final, titulado «HISTORIAL ARCHIVADO DESDE COORDINACION_CLAUDE_CODEX.md — 2026-10-09»:

- Versiones, despliegues e incidentes: `CONTROLADOR_DE_VERSIONES.md` (98 entradas)
- Conversaciones y reservas: `INVENTARIO_CONVERSACIONES.md` (76 entradas)
- Árbol de git y ramas: `REPARADOR_DEL_ARBOL_PRINCIPAL.md` (8 entradas)
