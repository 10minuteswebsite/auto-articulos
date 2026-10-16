# TRASPASO — PROYECTO BLOG IA

Punto de entrada para cualquier agente (Claude, Codex) que retome el proyecto.

## Leer primero, en este orden

1. `COORDINACION_CLAUDE_CODEX.md` — protocolo obligatorio (capitanía con `scripts/migration-coordinator.sh`, PR normal, nada de `git add .`, migración antes que el código que la usa, anotar cada cambio).
2. `MASTER_BLUEPRINT_BLOG_IA_SEO_TOTAL.md` — especificación aprobada por Milton (v1.0, 15/10/2026). Las decisiones de producto de la sección 2 son vinculantes; solo las decisiones de ingeniería (sección 16) se validan en Fase 0.
3. Este archivo — estado y bitácora.

## Regla que no se negocia

BLOG IA es un **destino de salida** del pipeline editorial que ya existe en SEO Total. No se crea un segundo motor de artículos ni reglas nuevas de aprobación/calendario. No se toca el código de la web principal del cliente. No se programa contra suposiciones: primero Fase 0.

## Estado por fase

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Auditoría y validación (código real, Cloudflare Custom Hostnames, DB, GSC/GA/Bing) | EN CURSO |
| 1 | Núcleo BLOG IA (multi-tenant, render, ingestión, SEO básico) | **PROGRAMADO EN LOCAL** (`apps/blog`, 30/30 pruebas; falta D1 real y Cloudflare) |
| 2 | Wizard y personalización | Pendiente |
| 3 | Integración operativa con SEO Total | Pendiente |
| 4 | Calidad, SEO y piloto (3 negocios) | Pendiente |

## Fase 0 — lista de verificación

- [x] 0.1 (primera pasada, ver hallazgos) Documentar el flujo editorial real de SEO Total (dónde se aprueba/publica; punto de enganche del nuevo destino) sin alterarlo.
- [ ] 0.2 Cloudflare: cuenta, plan, Custom Hostnames / Cloudflare for SaaS, límites y costes (requiere acceso de Milton a la cuenta).
- [ ] 0.3 Prueba real: subdominio externo con CNAME, HTTPS, render SSR y sitemap.
- [ ] 0.4 Base de datos (D1 u otra), medios en R2, backups.
- [ ] 0.5 Requisitos de conexión GSC/GA/Bing existentes para la propiedad del subdominio.
- [ ] 0.6 (parcial, ver hallazgos) Mapeo de campos del blueprint (sección 5.2) contra el modelo actual de artículo.

## Hallazgos de Fase 0 (código real, 2026-10-15)

**Flujo editorial actual.** Pantalla Publicar/Oportunidades crea `Run` + `Title` (`packages/db/prisma/schema.prisma`: `Run`, `Title`). El worker (`apps/worker/src/queue.ts`, ~línea 330) llama `publishArticle` de `automation/10minutesWebsite.ts`, que maneja un navegador (Playwright) contra el panel de 10minutesWebsite: **el cuerpo del artículo y la imagen se generan DENTRO de 10minutesWebsite**. SEO Total solo guarda `articleUrl`, `finalTitle`, `summary` y estados (`Title`); no conserva el HTML ni la imagen. Tras publicar corren `notifyGoogle` / `notifyBing` sobre `articleUrl`.

**Punto de enganche ya previsto.** Existe la interfaz `ArticlePublisher` (`apps/worker/src/automation/publisher.ts`) con dos implementaciones: `browserPublisher.ts` (la de producción) y `mcpPublisher.ts` (segunda línea, ramificada fuera de `queue.ts` por `User.publishMethod` en `mcpQueue.ts`, para no tocar el archivo sensible). BLOG IA debe entrar igual: tercer publisher y cola propia, sin modificar el flujo BROWSER (Protocolo de No Destrucción).

**Consecuencias para el diseño.**
1. BLOG IA necesita cuerpo HTML, imagen, slug, categorías, SEO: hay que generar el contenido en SEO Total con `generateCustomArticle.ts` (ya lo hace el publisher MCP) y **persistirlo**; hoy no existe tabla de cuerpo de artículo.
2. Falta el paso «generar y alojar imagen» (R2): `publisher.ts` ya lo anota como pendiente para MCP; BLOG IA lo comparte.
3. `Title.articleUrl` pasaría a apuntar a `blog.cliente.com/...`; el envío a Google/Bing (`googleIndexing.ts`, `bingIndexing.ts`, `send-daily-sitemaps.ts`) y el sitemap diario asumen el sitio de 10minutesWebsite: revisar antes de conectar.
4. Las categorías de SEO Total hoy son las del panel de 10minutesWebsite (`Category.externalId`, `Category.panel`); el blueprint pide categorías propias del blog (§6, §8.6): modelo nuevo.

**DECISIÓN DE MILTON (2026-10-16): Opción A, solo en el blog.** Con BLOG IA activo, el artículo va únicamente a `blog.cliente.com` y deja de ir a 10minutesWebsite (sin contenido duplicado). Consecuencia aceptada: el sitio actual del cliente deja de recibir artículos mientras BLOG IA esté activo. Por tanto BLOG IA reemplaza al publisher de navegador para esa cuenta (no es un envío paralelo), y hay que definir en Fase 3 qué pasa al desactivar/suspender (¿vuelve a 10minutesWebsite?) — pregunta pendiente.

## Fase 1 en local — `apps/blog` (SIN SUBIR, orden de Milton 2026-10-16)

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

**Verificado:** 30/30 pruebas (aislamiento entre clientes, idempotencia, firma, XSS, 503/reactivación, cambio de subdominio, sitemaps solo del tenant); tipos sin errores; vista en navegador desktop 1360 px y móvil 375 px sin scroll horizontal.

**NO hecho todavía (pendiente, en orden):**
1. QR de WhatsApp en desktop (hoy solo botón/enlace; el blueprint exige QR real, nunca decorativo) — requiere codificador QR.
2. Despliegue real: `wrangler.toml`, D1 real, R2 para imágenes, Custom Hostnames (Fase 0.2–0.4; necesita la cuenta de Cloudflare de Milton).
3. Conexión con SEO Total: tercer publisher + cola propia en el worker, generación y persistencia del cuerpo del artículo, alojamiento de imágenes (ver hallazgos).
4. Wizard de 4 pasos y análisis de marca del sitio del cliente (Fase 2).
5. Pruebas de accesibilidad automáticas, Core Web Vitals, límites/costes y piloto (Fase 4).
6. Cabeceras de seguridad adicionales (CSP) y límite de tasa en la API.
7. `apps/blog` aún no está en el `package-lock.json` (no se ejecutó `npm install` para no tocar dependencias); hacerlo al subir.

## Bitácora (más reciente arriba)

**2026-10-16**
- LOCAL · Fase 1 programada en `apps/blog` (ver sección arriba). Sin push (orden de Milton: todo local hasta probar). 30/30 pruebas.
- DECISIÓN · Milton elige Opción A: BLOG IA publica solo en el blog, no en 10minutesWebsite.

**2026-10-15**
- DOCUMENTACIÓN · Auditoría 0.1 (solo lectura de `queue.ts`, `publisher.ts`, `mcpPublisher.ts`, `mcpQueue.ts`, esquema `Run`/`Title`); hallazgos arriba. Sin cambios de código.
- DOCUMENTACIÓN · Blueprint guardado en el repo y este traspaso creado. Capitanía de Claude (solo documentación). Siguiente: punto 0.1 (auditoría del flujo editorial en el código).
