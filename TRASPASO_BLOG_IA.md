# TRASPASO — PROYECTO BLOG IA

Punto de entrada para cualquier agente (Claude, Codex) que retome el proyecto.

## Leer primero, en este orden

1. `COORDINACION_CLAUDE_CODEX.md` — protocolo obligatorio (capitanía con `scripts/migration-coordinator.sh`, PR normal, nada de `git add .`, migración antes que el código que la usa, anotar cada cambio).
2. `MASTER_BLUEPRINT_BLOG_IA_SEO_TOTAL.md` — especificación aprobada por Milton (v1.0, 15/10/2026). Las decisiones de producto de la sección 2 son vinculantes; solo las decisiones de ingeniería (sección 16) se validan en Fase 0.
3. Este archivo — estado y bitácora.

## Regla que no se negocia

BLOG IA es un **destino de salida** del pipeline editorial que ya existe en SEO Total. No se crea un segundo motor de artículos ni reglas nuevas de aprobación/calendario. No se toca el código de la web principal del cliente. No se programa contra suposiciones: primero Fase 0.

La transferencia formal y el prompt para Claude están en `TRANSFERENCIA_CLAUDE_BLOG_IA_2026-10-21.md` y `PROMPT_CLAUDE_CONTINUACION_BLOG_IA.md`. Deben leerse antes de continuar.

## Estado por fase

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Auditoría y validación (código real, Cloudflare Custom Hostnames, DB, GSC/GA/Bing) | **AUDITORÍA LOCAL COMPLETADA; VALIDACIÓN DE CUENTA PENDIENTE** |
| 1 | Núcleo BLOG IA (multi-tenant, render, ingestión, SEO básico) | **COMPLETADA EN LOCAL** (`apps/blog`, 44/44 pruebas; Cloudflare real pendiente) |
| 2 | Wizard y personalización | **COMPLETADA EN LOCAL 2026-10-21** (`/dashboard/blog-ia`, `/api/blog-ia/*`, 22 pruebas nuevas; DNS/TLS/Cloudflare reales pendientes; análisis automático del sitio pendiente) |
| 3 | Integración operativa con SEO Total | Pendiente |
| 4 | Calidad, SEO y piloto (3 negocios) | Pendiente |

## Fase 0 — lista de verificación

- [x] 0.1 (primera pasada, ver hallazgos) Documentar el flujo editorial real de SEO Total (dónde se aprueba/publica; punto de enganche del nuevo destino) sin alterarlo.
- [~] 0.2 Cloudflare: documentación de plan, Custom Hostnames, límites y costes completada; cuenta real pendiente de acceso.
- [ ] 0.3 Prueba real: subdominio externo con CNAME, HTTPS, render SSR y sitemap (requiere zona/DNS reales).
- [~] 0.4 Decisión provisional D1 + R2 + backup: documentada; crear recursos y probar restauración requiere cuenta real.
- [~] 0.5 Requisitos de conexión GSC/GA/Bing y efecto sobre sitemap/indexación: mapeados; verificación de propiedad del blog pendiente.
- [x] 0.6 Mapeo de campos del blueprint contra el modelo actual de artículo (ver `AUDITORIA_BLOG_IA_FASE_0.md`).

## Hallazgos de Fase 0 (código real, 2026-10-15)

La auditoría ampliada del 2026-10-20 está en `AUDITORIA_BLOG_IA_FASE_0.md`. Incluye costes/límites oficiales, decisión provisional de arquitectura, pasos de dominio de prueba, matriz GSC/GA/Bing y mapeo campo por campo.

**Flujo editorial actual.** Pantalla Publicar/Oportunidades crea `Run` + `Title` (`packages/db/prisma/schema.prisma`: `Run`, `Title`). El worker (`apps/worker/src/queue.ts`, ~línea 330) llama `publishArticle` de `automation/10minutesWebsite.ts`, que maneja un navegador (Playwright) contra el panel de 10minutesWebsite: **el cuerpo del artículo y la imagen se generan DENTRO de 10minutesWebsite**. SEO Total solo guarda `articleUrl`, `finalTitle`, `summary` y estados (`Title`); no conserva el HTML ni la imagen. Tras publicar corren `notifyGoogle` / `notifyBing` sobre `articleUrl`.

**Punto de enganche ya previsto.** Existe la interfaz `ArticlePublisher` (`apps/worker/src/automation/publisher.ts`) con dos implementaciones: `browserPublisher.ts` (la de producción) y `mcpPublisher.ts` (segunda línea, ramificada fuera de `queue.ts` por `User.publishMethod` en `mcpQueue.ts`, para no tocar el archivo sensible). BLOG IA debe entrar igual: tercer publisher y cola propia, sin modificar el flujo BROWSER (Protocolo de No Destrucción).

**Consecuencias para el diseño.**
1. BLOG IA necesita cuerpo HTML, imagen, slug, categorías, SEO: hay que generar el contenido en SEO Total con `generateCustomArticle.ts` (ya lo hace el publisher MCP) y **persistirlo**; hoy no existe tabla de cuerpo de artículo.
2. Falta el paso «generar y alojar imagen» (R2): `publisher.ts` ya lo anota como pendiente para MCP; BLOG IA lo comparte.
3. `Title.articleUrl` pasaría a apuntar a `blog.cliente.com/...`; el envío a Google/Bing (`googleIndexing.ts`, `bingIndexing.ts`, `send-daily-sitemaps.ts`) y el sitemap diario asumen el sitio de 10minutesWebsite: revisar antes de conectar.
4. Las categorías de SEO Total hoy son las del panel de 10minutesWebsite (`Category.externalId`, `Category.panel`); el blueprint pide categorías propias del blog (§6, §8.6): modelo nuevo.

**DECISIÓN DE MILTON (2026-10-16): Opción A, solo en el blog.** Con BLOG IA activo, el artículo va únicamente a `blog.cliente.com` y deja de ir a 10minutesWebsite (sin contenido duplicado). Consecuencia aceptada: el sitio actual del cliente deja de recibir artículos mientras BLOG IA esté activo. Por tanto BLOG IA reemplaza al publisher de navegador para esa cuenta (no es un envío paralelo), y hay que definir en Fase 3 qué pasa al desactivar/suspender (¿vuelve a 10minutesWebsite?) — pregunta pendiente.

## Fase 1 en local — `apps/blog` (COMPLETADA LOCALMENTE, SIN SUBIR)

Worker de estándar web (`Request`→`Response`), sin dependencias nuevas. Corre igual en Cloudflare y en local: la base se accede por la interfaz `Db` (`src/db.ts`) con adaptador D1 y adaptador `node:sqlite` (pruebas/local); el esquema SQL (`migrations/0001_init.sql`) es el mismo.

| Pieza | Archivo |
|---|---|
| Esquema multi-tenant (`tenant_id` en todo, slugs únicos por tenant) | `migrations/0001_init.sql` |
| API de ingestión firmada (HMAC + ventana 5 min), idempotente, atómica, HTML sanitizado | `src/ingest.ts`, `src/sanitize.ts` |
| Resolución de tenant SOLO por hostname verificado; consultas siempre filtradas | `src/repo.ts` |
| Rutas: home, categoría, artículo, búsqueda, paginación, 301 de barra final/host viejo, 503 suspendido | `src/app.ts` |
| Plantilla única blanca responsive, JSON-LD, canonical, noindex, sitemaps, robots | `src/render/*`, `src/seo.ts` |
| Entrada Cloudflare / servidor local / datos de ejemplo | `src/worker.ts`, `src/node/server.ts`, `src/node/seed.ts` |

Eventos soportados: `blog.provision`, `blog.domain.change`, `category.upsert`, `article.publish|update|unpublish`, `blog.settings.update`, `blog.subscription.suspend|resume`.

Cómo probarlo en local: `cd apps/blog && npx tsx src/node/seed.ts && npx tsx src/node/server.ts` y abrir `http://blog.demo-salud.localhost:8787`. Pruebas: `cd apps/blog && npx tsx --test src/*.test.ts`. Tipos: `npx tsc -p tsconfig.json --noEmit`.

**Verificado:** 44/44 pruebas (aislamiento entre clientes, idempotencia, firma, XSS, 503/reactivación, rechazo reintentable de publicación durante suspensión, cambio de subdominio, sitemaps solo del tenant, R2 simulado, CSP y rate limit); tipos sin errores; vista en navegador desktop 1360 px y móvil 375 px sin scroll horizontal. `package-lock.json` ya incluye `apps/blog` y `qrcode`.

**NO hecho todavía (pendiente de infraestructura o Fase 2+):**
1. ~~QR de WhatsApp~~ HECHO (`apps/blog/src/qr.ts`, usa `qrcode` núcleo JS; se probó que la matriz coincide con la librería de referencia; NO se escaneó con un celular real: probarlo).
2. Despliegue real: `wrangler.toml`, D1 real, R2 real, Custom Hostnames y dominio de prueba (requiere la cuenta de Cloudflare).
3. Conexión con SEO Total — PARCIAL. Hechos en local: cliente firmado, publisher, modelo `BlogIaBlog`, valor `BLOG`, migración, cola, API de suspensión/reactivación y pruebas end-to-end. Pendiente: conectar esos eventos al flujo real de suscripción, enviar imágenes reales a R2 y probar la cola contra una base/servicio reales.
   - **Decisión de Milton (2026-10-21): NO hay prompt por defecto.** Si el lote no tiene prompt elegido, la cola se detiene y pide seleccionar uno (`blogIaQueue.ts`; se eliminó `DEFAULT_BLOG_PROMPT`).
   - **Al subir:** la migración debe aplicarse ANTES o junto con el código (incidente 2026-09; `ALTER TYPE … ADD VALUE` en el SQL Editor de Supabase). Variables nuevas del worker: `BLOG_IA_API_URL`, `BLOG_IA_SECRET`.
4. Wizard de 4 pasos y análisis de marca del sitio del cliente (Fase 2).
5. Pruebas de accesibilidad automáticas, Core Web Vitals, límites/costes y piloto (Fase 4).

## Bitácora (más reciente arriba)

**2026-10-20**
- LOCAL · Corrección de suscripciones: la ingestión de `article.publish`/`article.update` devuelve 503 reintentable mientras el tenant está suspendido; al reactivar, el mismo flujo publica sin duplicar. Verificación: typecheck, 44/44 pruebas y `git diff --check`.

**2026-10-21 (Fase 3, desactivar y reactivar)**
- LOCAL · Nuevo estado `deactivated` (decisión de la persona; distinto de `suspended`, que viene de derechos). `deactivate`/`reactivate` en `blog-ia-wizard.ts`, rutas `POST /api/blog-ia/deactivate` y `/reactivate`, botones con aviso en la pantalla. Desactivar envía `blog.subscription.suspend` (el blog responde 503 sin caché, contenido y configuración conservados), es idempotente y NO toca `publishMethod`. Reactivar exige acceso vigente y dominio todavía verificado y envía `blog.subscription.resume`. La sincronización de derechos NO reabre un blog desactivado a propósito. La cola se detiene con un mensaje claro (título en error, lote `halted`, títulos devueltos a oportunidades). +4 pruebas (web 259/259). Probado en navegador y contra el blog local: desactivar → 503 + estado `deactivated` + `publishMethod` intacto; cola detenida; reactivar → 200 y el artículo anterior sigue abierto.

**2026-10-21 (Fase 2c, análisis del sitio)**
- LOCAL · Paso 1 del blueprint: botón «Analizar mi sitio» (`POST /api/blog-ia/analyze`, `lib/blog-ia-site-analysis.ts`). Lee solo la portada pública y SUGIERE nombre, logo, color, idioma, WhatsApp, menú y pie; no guarda nada hasta que la persona confirma. Blindado contra SSRF: solo https, sin IP/localhost/.local/.internal/puerto/credenciales, DNS resuelto y rechazo de IP privadas, cada redirección revalidada (máx. 3), 8 s de tiempo y 1 MB, freno de 10 análisis/10 min por persona (en memoria de la instancia). Nuevo campo `logoUrl` (https) en la marca. +14 pruebas (web 255/255). Probado en navegador: `http://`, localhost, 127.0.0.1, 169.254.169.254 (metadatos), `.local` y dominio inexistente → rechazo con mensaje claro; sitio público real (wikipedia.org) → sugerencias.
- LÍMITE · El análisis lee HTML estático: sitios que arman su menú con JavaScript pueden dar sugerencias vacías (queda el ingreso manual). No se analizó el logo como imagen ni se valida que la URL del logo abra.

**2026-10-21 (Fase 2b, menú y pie)**
- LOCAL · El wizard permite editar menú del encabezado (hasta 8) y enlaces del pie (hasta 10), solo `https://`, texto ≤40; viajan al blog como `brand.nav`/`brand.footer` (`brandOf` en `blog-ia-wizard.ts`). Un blog ya activo se puede editar con «Editar marca, menú y pie». +2 pruebas (web 243/243). Probado en navegador: enlace `http://` rechazado con mensaje y el formulario conserva lo escrito (se corrigió un fallo: el formulario se cerraba aunque el guardado fallara); con enlaces válidos el blog local muestra menú y pie.

**2026-10-21 (Fase 3, prompt)**
- DECISIÓN · Milton: no inventar un prompt por defecto. `blogIaQueue.ts` ya no lo tiene: sin prompt en el lote, el título queda en error con «Selecciona un prompt de redacción para este lote…» y el lote se detiene (igual que MCP). Probado contra la BD local: sin prompt → título `error` y lote `halted`; con prompt elegido → publica y el generador recibe exactamente ese texto. Worker typecheck OK.

**2026-10-21 (Fase 3, prueba de punta a punta)**
- LOCAL · `processBlogRunTitle` acepta `overrides` (`generate`, `cover`) solo para pruebas; el comportamiento normal no cambia. Prueba real contra la BD local copia (`autoarticulos_blogia`) y el blog local: un `Run`/`Title` de la cuenta tester pasó por la COLA REAL → publisher → cliente firmado → blog: `Title.status=success`, `articleUrl` correcta, la página abre (200) con su `<title>`, la portada WebP se sirve en `/media/cover-…` (200) y otro host no la ve (404). Redacción y portada simuladas (sin gasto); la redacción real con IA y R2 real siguen sin probarse: configuración/código verificados; E2E pendiente.

**2026-10-21 (Fase 3, imágenes)**
- DECISIÓN FINAL · Milton (2026-10-21): portadas con OpenAI en calidad BAJA (≈0,005 USD/imagen; 90 artículos/mes ≈ 0,45 USD por cuenta). Es el valor por defecto (`BLOG_IA_IMAGE_PROVIDER` vacío = openai, `BLOG_IA_IMAGE_QUALITY` vacío = low); no hace falta configurar nada. Calidad media y fal.ai quedan como opciones por variable, sin usar. Muestras reales de OpenAI generadas y aprobadas a la vista; la llamada real a OpenAI quedó verificada, el guardado en R2 real sigue pendiente. Cálculo de rentabilidad con 1.000 usuarios a 19,99 USD (calidad baja): ≈ 19.285 USD/mes antes de comisiones de cobro (estimación, ver conversación).
- DECISIÓN · Milton (2026-10-21): portadas con IA, sin texto en la imagen; probar OpenAI barato y comparar con fal.ai/Ideogram V3 (≈0,03 USD/imagen; 90 artículos/mes ≈ 2,70 USD). Costos tomados de comentarios del código (22/8/2026), no verificados en vivo.
- LOCAL · `apps/worker/src/automation/blogCoverImage.ts` (generador desde cero con título+resumen, proveedor con `BLOG_IA_IMAGE_PROVIDER`, `optimizeCover` → WebP 1200 px), `blogIaPublisher.ts` (`cover`: genera → sube con `media.upload` → usa `/media/cover-<id>` como portada; si falla se publica sin imagen), `blogIaQueue.ts` (cableado). Blog: evento `media.upload`, ruta `/media/<id>` por cliente, binding `MEDIA` (R2) en `worker.ts`/`wrangler.toml.example`, almacén en memoria en local. Pruebas: blog typecheck OK y 52/52; worker typecheck OK; 5 pruebas del generador. Reintentos idempotentes; un id de imagen de otro cliente da 409.
- NO PROBADO · Llamadas reales a OpenAI/fal.ai (no hay claves en el entorno local; los endpoints están escritos según el código existente) y R2 real: configuración/código verificados; E2E pendiente. Falta ver muestras reales de OpenAI vs fal.ai para decidir con Milton.

**2026-10-21 (Fase 3, primer lote)**
- LOCAL · Cambio de slug sin 404: migración `apps/blog/migrations/0002_slug_redirects.sql` (tabla `slug_redirects`), `ingest.ts` registra el slug anterior al actualizar, `repo.ts getRedirectSlug`, `app.ts` responde 301 a la URL nueva (solo si el artículo sigue publicado; por cliente, sin cruzarse; en cadena; volver a un slug viejo retira su redirección). +3 pruebas: BLOG IA typecheck OK, 47/47. Al crear D1 real hay que aplicar 0001 y 0002.
- HALLAZGO · Ediciones: `blogIaPublisher.ts` envía siempre `revision: 1` y SEO Total no tiene hoy un flujo de edición de artículos publicados; el blog ya ignora revisiones viejas y aplica las nuevas. No se inventa un flujo de edición: queda anotado hasta que exista la función.
- HALLAZGO · Imágenes: el publisher envía `cover_image_url` solo si recibe `imageUrl`; la cola no la entrega porque SEO Total no genera ni aloja imágenes para BLOG (igual que MCP). Sin imagen el blog muestra el marcador neutro. Requiere decisión de producto (qué generador de imágenes y dónde se guardan).

**2026-10-21 (Fase 2)**
- LOCAL · Wizard de BLOG IA completo (ver `DISENO_WIZARD_BLOG_IA_FASE_2.md`). Núcleo inyectable `apps/web/src/lib/blog-ia-wizard.ts` (+22 pruebas), pegamento `blog-ia-wizard-runtime.ts` (Prisma, envío firmado, `dns.resolveCname`, sonda HTTPS), rutas `/api/blog-ia` (GET/POST), `/config`, `/domain`, `/verify`, `/activate`, página `/dashboard/blog-ia`, módulo opt-in `blog-ia` (modules.ts, product-routes.ts, DashboardNav), guarda de `hostname` nulo en `blogIaQueue.ts`, espejo `suspended`/`active` en `blog-ia-subscription.ts`. Migración aditiva `20261021120000_blog_ia_wizard` (hostname opcional + 6 columnas; probada 2 veces sobre BD local). Variable nueva: `BLOG_IA_CNAME_TARGET`.
- VERIFICACIÓN · web typecheck OK y 241/241 pruebas (219 previas + 22); BLOG IA typecheck OK y 44/44; `git diff --check` OK. Navegador local (BD copia aislada `autoarticulos_blogia`, API blog local): 403 sin módulo y bloqueo de pantalla; validación de WhatsApp y de dominio raíz; error de red reintentable con datos guardados; reintento aprovisiona (evento firmado `provision:{userId}` aplicado en el Worker local); retomar el progreso; verificación DNS real queda en «Pendiente»; activación OK (`status=active`, `publishMethod=BLOG`). **DNS y HTTPS «listos» se simularon en la BD (no hay CNAME real en local): configuración/código verificados; E2E pendiente.**
- DECISIÓN · Milton (2026-10-21): al desactivar BLOG IA las publicaciones se conservan en la base de datos, el blog se desindexa (503) y, si el cliente vuelve, recupera todo. Mientras está desactivado NO se publica en ninguna parte (decisión final de Milton).
- DECISIÓN FINAL · Milton (2026-10-21): al desactivar, las publicaciones SE DETIENEN hasta reactivar; NO se cambia `publishMethod` (queda en BLOG). Implementado abajo (Fase 3, desactivar/reactivar). Análisis automático del sitio (paso 1 del blueprint). Cloudflare real. Probar suspensión desde Administración en navegador (solo probada por pruebas unitarias del núcleo y tipos).

**2026-10-21**
- LOCAL · Se aisló `@auto-articulos/db`/`shared` al checkout del proyecto y se regeneró Prisma. La sincronización de `ProductEntitlement` con BLOG IA quedó implementada para suspender/reactivar de forma idempotente. Verificación final: web typecheck + 219/219 pruebas; BLOG IA typecheck + 44/44 pruebas; `git diff --check`.

**2026-10-16**
- LOCAL · Fase 1 cerrada: metadatos de medios + contrato R2 simulado, CSP, rate limit de ingestión, publicación bloqueada durante suspensión con reintento posterior, plantilla `wrangler.toml.example`, lockfile actualizado y 44/44 pruebas. Sin push.
- LOCAL · Modelo/migración `BlogIaBlog`+`BLOG`, `blogIaQueue.ts` y rama en `queue.ts`. Verificación: `prisma validate`; migración en Postgres desechable (2 aplicaciones, cascade, usuarios existentes intactos); worker compila (tsconfig con rutas al worktree, porque `@auto-articulos/*` apunta al repo principal); 39/39 pruebas del blog.
- LOCAL · QR de WhatsApp real; cliente firmado en `packages/shared`; publisher BLOG IA en el worker; prueba de punta a punta. 39/39 pruebas. Aviso técnico: en este entorno `@auto-articulos/shared` resuelve al repo PRINCIPAL (enlaces de `node_modules`), por eso el publisher recibe `send` inyectado y no importa `shared` en ejecución; al subir, el build real resuelve bien.
- LOCAL · Fase 1 programada en `apps/blog` (ver sección arriba). Sin push (orden de Milton: todo local hasta probar). 30/30 pruebas.
- DECISIÓN · Milton elige Opción A: BLOG IA publica solo en el blog, no en 10minutesWebsite.

**2026-10-15**
- DOCUMENTACIÓN · Auditoría 0.1 (solo lectura de `queue.ts`, `publisher.ts`, `mcpPublisher.ts`, `mcpQueue.ts`, esquema `Run`/`Title`); hallazgos arriba. Sin cambios de código.
- DOCUMENTACIÓN · Blueprint guardado en el repo y este traspaso creado. Capitanía de Claude (solo documentación). Siguiente: punto 0.1 (auditoría del flujo editorial en el código).
