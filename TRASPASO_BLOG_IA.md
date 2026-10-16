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
| 1 | Núcleo BLOG IA (multi-tenant, render, ingestión, SEO básico) | Pendiente |
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

**Pregunta de producto abierta (bloquea el diseño de Fase 3):** cuando una cuenta activa BLOG IA, ¿el artículo se publica SOLO en el blog, o TAMBIÉN en su sitio de 10minutesWebsite como hoy? El blueprint dice «destino de salida» y «reutiliza las reglas actuales» sin precisarlo.

## Bitácora (más reciente arriba)

**2026-10-15**
- DOCUMENTACIÓN · Auditoría 0.1 (solo lectura de `queue.ts`, `publisher.ts`, `mcpPublisher.ts`, `mcpQueue.ts`, esquema `Run`/`Title`); hallazgos arriba. Sin cambios de código.
- DOCUMENTACIÓN · Blueprint guardado en el repo y este traspaso creado. Capitanía de Claude (solo documentación). Siguiente: punto 0.1 (auditoría del flujo editorial en el código).
