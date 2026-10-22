# BLOG IA — qué queda en Artículos (2026-10-22)

BLOG IA es un **programa independiente** (cobro aparte, repositorio propio, base de datos propia): https://github.com/10minuteswebsite/blog-ia (privado). Artículos es un motor que BLOG IA puede usar si el cliente lo contrata.

En este repositorio queda **solo el conector**:
- `apps/worker/src/automation/blogIaPublisher.ts`, `blogCoverImage.ts`, `blogIaQueue.ts`, `blogIaSitemap.ts` y la rama de `queue.ts` / `send-daily-sitemaps.ts` que publican en BLOG IA cuando `User.publishMethod = BLOG`.
- `packages/shared/src/blog-ia-client.ts`: envío firmado de eventos (el contrato oficial vive en `blog-ia/docs/CONTRATO.md`).
- Base de datos: tabla `BlogIaBlog` y valor `BLOG` de `PublishMethod`. Se **conservan** (cambio aditivo, sin migración destructiva); son el vínculo usuario → blog de BLOG IA.

Ya **no** está aquí: el asistente de configuración, las rutas `/api/blog-ia/*`, el módulo y menú «BLOG IA», la sincronización de suscripción de Artículos hacia el blog, el Worker (`apps/blog`) y los documentos de diseño. Todo eso vive en el repositorio de BLOG IA.

Pendiente (Mario/HUB): cómo se vincula una cuenta de Artículos con una cuenta de BLOG IA (hoy solo existe la fila de prueba del administrador).
