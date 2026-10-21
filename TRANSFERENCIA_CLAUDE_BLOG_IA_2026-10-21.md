# Transferencia formal a Claude — BLOG IA

Fecha: 2026-10-21  
Proyecto: BLOG IA para SEO Total  
Estado: desarrollo local validado; sin publicación ni despliegue  
Responsable de la transferencia: Codex

## 1. Propósito

Este documento entrega a Claude el estado real del proyecto BLOG IA para que pueda continuar el desarrollo sin repetir trabajo, perder cambios, mezclar proyectos ni declarar terminado algo que todavía no ha sido comprobado en producción.

La solución convierte BLOG IA en un destino editorial alternativo para una cuenta de SEO Total. Cuando una cuenta usa `BLOG`, el artículo debe publicarse únicamente en el blog del cliente y no simultáneamente en 10minutesWebsite. Esta es una decisión funcional explícita de Milton.

## Contexto de la conversación y decisiones acumuladas

La conversación comenzó con el blueprint de BLOG IA y la intención de construir un blog SEO multi-tenant conectado al pipeline editorial de SEO Total. Durante el trabajo se aclaró lo siguiente:

1. Milton preguntó qué significaba publicar solo en el blog. Se confirmó la **Opción A**: con BLOG IA activo, el artículo va únicamente al blog del cliente y deja de ir a 10minutesWebsite para evitar contenido duplicado.
2. Milton pidió inicialmente que todo se hiciera solo en local hasta probarlo. Esa regla sigue vigente para el desarrollo actual: no publicar ni desplegar todavía.
3. Después Milton añadió el estándar Harness-Mario: antes de publicar hay que partir del punto cero real de producción, usar `main` como única rama, guardar la memoria durable en GitHub, ejecutar `IA_JOURNEY.md`, verificar producción y actualizar la documentación.
4. Se decidió trabajar rápido en local y reconciliar el resultado contra `main` y producción inmediatamente antes de subirlo, porque producción puede cambiar mientras avanza el desarrollo.
5. Codex completó el núcleo local, corrigió la sincronización de suscripciones y preparó esta transferencia. Claude debe continuar desde aquí, no reiniciar el proyecto.

El usuario no quiere que Claude le repita preguntas que ya están resueltas en estos documentos. Si una pregunta aparece, Claude debe escribirla en el canal compartido absoluto `/Users/miltondavila/Creador de articulos/.claude_shared/BLOG_IA_COMUNICACION_CLAUDE_CODEX.md` y continuar todo lo que sea seguro. El archivo `CLAUDE_PREGUNTAS_RESPUESTAS_BLOG_IA.md` dentro de un worktree queda como historial local, no como canal principal.

## Mapa de ubicación de la información

| Necesidad | Fuente |
|---|---|
| Reglas Harness y protocolo de producción | Repositorio `Harness-Mario`, `IA_JOURNEY.md`, `.ai/standards/` |
| Estado local BLOG IA | `TRASPASO_BLOG_IA.md` |
| Auditoría de costes, Cloudflare, D1/R2 y proveedores | `AUDITORIA_BLOG_IA_FASE_0.md` |
| Transferencia completa | Este documento |
| Instrucciones ejecutables para Claude | `PROMPT_CLAUDE_CONTINUACION_BLOG_IA.md` |
| Preguntas y respuestas de continuidad | `/Users/miltondavila/Creador de articulos/.claude_shared/BLOG_IA_COMUNICACION_CLAUDE_CODEX.md` |
| Núcleo Worker/blog | `apps/blog/` |
| Esquema y migración SEO Total | `packages/db/prisma/` |
| Cliente firmado | `packages/shared/src/blog-ia-client.ts` |
| Cola BLOG IA | `apps/worker/src/blogIaQueue.ts` |
| Publisher BLOG IA | `apps/worker/src/automation/blogIaPublisher.ts` |
| Sincronización de derechos | `apps/web/src/lib/blog-ia-subscription.ts` y ruta de entitlements |

## Stack y entorno local

La solución local usa TypeScript, Node/Request/Response estándar, una capa `Db` compatible con D1 y un adaptador local `node:sqlite`. El frontend existente es Next.js; la persistencia SEO Total usa Prisma/PostgreSQL. El Worker real previsto es Cloudflare Workers con D1 y R2. El entorno local debe mantener separadas las dependencias generadas del checkout del proyecto: Prisma se regenera usando `packages/db/prisma/schema.prisma` antes del typecheck web.

## 2. Norma superior obligatoria

Antes de continuar, Claude debe leer y aplicar completo:

- `https://github.com/10minuteswebsite/Harness-Mario`
- `IA_JOURNEY.md`
- `.ai/standards/INDICE_ESTANDARES.md`
- `CURRENT_STATE.md`
- `BASELINE.md`
- `CHECKPOINTS.md`
- `CONTROLADOR_DE_VERSIONES.md`
- `CEREBRO.md`
- `INVENTARIO_CONVERSACIONES.md`
- el documento vigente de Coordinación

Reglas no negociables:

1. Producción es la verdad funcional.
2. GitHub es la memoria durable.
3. `main` es la única rama autorizada para el trabajo publicable.
4. No crear ramas ni worktrees nuevos.
5. No alterar, borrar ni absorber cambios ajenos.
6. Antes de publicar, volver a comprobar el punto cero real en producción.
7. Después de publicar, verificar comportamiento productivo real.
8. Actualizar toda la documentación Harness después de cada cierre.
9. Si no existe una prueba real de proveedor, declarar exactamente: “configuración/código verificados; E2E pendiente”.

## 3. Punto actual real

El desarrollo BLOG IA se encuentra en un checkout local de trabajo:

`/Users/miltondavila/Creador de articulos/.claude/worktrees/github-private-repo-d45a69`

Este checkout contiene cambios locales sin publicar. No debe confundirse con producción ni con el checkout principal, que tiene cambios ajenos sin guardar.

No existe todavía una instalación productiva confirmada de BLOG IA con Worker, D1, R2, Custom Hostnames y dominio de prueba. Por tanto:

- no hay todavía una URL productiva BLOG IA verificada;
- no hay D1/R2 reales confirmados;
- no hay backup/restauración real verificados;
- no hay propiedad de prueba BLOG IA comprobada en Search Console, Analytics o Bing;
- no se puede declarar el proyecto productivo terminado.

## 4. Validación local completada

### BLOG IA

- TypeScript: correcto.
- Pruebas: **44/44 correctas**.
- `git diff --check`: correcto.
- Publisher real → cliente firmado → API local del blog: probado.
- Repetición de eventos: idempotente.
- Revisión vieja: ignorada.
- Aislamiento multi-tenant: probado.
- HTML malicioso: sanitizado.
- CSP y cabeceras anti-clickjacking: probadas.
- Rate limit de ingestión: probado.
- R2: contrato simulado y metadatos D1 probados.
- Suspensión: sitio público responde 503 sin caché.
- Publicación suspendida: responde 503 reintentable.
- Reactivación: el mismo flujo vuelve a publicar sin duplicar.
- Cambio de dominio: canonical, 301 y aislamiento probados.
- Sitemap y robots: limitados al tenant correcto.

### Web SEO Total

- TypeScript: correcto después de enlazar las dependencias al checkout local y regenerar Prisma.
- Pruebas: **219/219 correctas**.
- La expectativa obsoleta del catálogo MCP fue actualizada para reflejar los seis prompts actuales.

## 5. Archivos BLOG IA modificados o creados

### Núcleo del blog

- `apps/blog/migrations/0001_init.sql`
- `apps/blog/src/app.ts`
- `apps/blog/src/ingest.ts`
- `apps/blog/src/types.ts`
- `apps/blog/src/worker.ts`
- `apps/blog/src/media.ts`
- `apps/blog/src/media.test.ts`
- `apps/blog/src/security.ts`
- `apps/blog/src/security.test.ts`
- `apps/blog/wrangler.toml.example`

### Integración SEO Total

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20261016120000_add_blog_ia/migration.sql`
- `packages/shared/src/blog-ia-client.ts`
- `apps/worker/src/blogIaQueue.ts`
- `apps/worker/src/automation/blogIaPublisher.ts`
- `apps/worker/src/queue.ts`
- `apps/blog/src/e2e.test.ts`

### Sincronización de derechos

- `apps/web/src/lib/blog-ia-subscription.ts`
- `apps/web/src/app/api/admin/users/[id]/entitlements/route.ts`

El helper de sincronización es best-effort: el cambio de derechos se guarda aunque BLOG IA esté temporalmente caído. Los eventos usan IDs estables para que el reintento no duplique el cambio.

### Documentación local

- `TRASPASO_BLOG_IA.md`
- `AUDITORIA_BLOG_IA_FASE_0.md`
- este documento
- `PROMPT_CLAUDE_CONTINUACION_BLOG_IA.md`

## 6. Arquitectura local actual

### BLOG IA

- Worker compatible con Cloudflare y servidor local mediante `Request`/`Response`.
- D1 compartida en el piloto, con `tenant_id` obligatorio.
- R2 para binarios; D1 conserva solo metadatos.
- Hostname de API separado de los hostnames públicos de cliente.
- Firma HMAC con timestamp y ventana anti-replay.
- Eventos idempotentes por `(tenant_id, event_id)`.
- Categorías y artículos aislados por tenant.
- Estado de suscripción en el tenant: `active` o `suspended`.

### Eventos soportados

- `blog.provision`
- `blog.domain.change`
- `category.upsert`
- `article.publish`
- `article.update`
- `article.unpublish`
- `blog.settings.update`
- `blog.subscription.suspend`
- `blog.subscription.resume`

### SEO Total

- `PublishMethod.BLOG` distingue el flujo BLOG IA del flujo BROWSER y MCP.
- `BlogIaBlog` mantiene la relación cuenta → tenant → hostname.
- `blogIaQueue.ts` procesa únicamente cuentas con `publishMethod === BLOG`.
- El publisher no ejecuta publicación paralela en 10minutesWebsite.
- El contenido se genera mediante el flujo existente de SEO Total y luego se envía firmado al blog.

## 7. Qué falta

### Prioridad inmediata: Fase 2 local

1. Wizard de alta/configuración de BLOG IA.
2. Alta del blog por cuenta.
3. Configuración de marca.
4. Configuración de idioma.
5. Configuración de WhatsApp.
6. Configuración y validación del dominio.
7. Estados visibles: borrador, DNS pendiente, TLS pendiente, activo, suspendido y error.
8. Pruebas de permisos, validación y aislamiento.

### Fase 3 local

1. Completar el flujo operativo de activación.
2. Definir cómo se crea/provisiona `BlogIaBlog` desde la interfaz.
3. Definir qué ocurre al desactivar BLOG IA: no asumir automáticamente que vuelve a BROWSER sin decisión documentada.
4. Resolver el alojamiento de imágenes generado por el flujo editorial.
5. Confirmar incremento de `revision` en ediciones reales.
6. Definir contrato para cambios de slug y redirecciones.
7. Ejecutar pruebas del worker con una base Prisma local coherente.

### Fase de infraestructura real

1. Crear Worker real.
2. Crear D1 real y aplicar migraciones.
3. Crear R2 real.
4. Ejecutar exportación y restauración de D1 en una base de prueba.
5. Configurar Custom Hostnames.
6. Crear dominio de prueba.
7. Completar DCV y TLS.
8. Probar SSR, 404, 503, sitemap, robots, canonical y 301 en dominio real.
9. Registrar coste, límites, alertas y backups.

### Integraciones externas

1. Registrar/verificar la propiedad BLOG IA en Search Console.
2. Confirmar si se usará una propiedad GA4 del cliente.
3. Registrar/verificar el sitemap en Bing.
4. Probar callbacks y permisos reales.
5. Probar firma inválida.
6. Probar entrega real.
7. Probar reintento/replay.
8. Comprobar el efecto downstream en producción.

## 8. Riesgos conocidos

- El archivo `MASTER_BLUEPRINT_BLOG_IA_SEO_TOTAL.md` aparece referenciado por el traspaso, pero no está presente en este checkout local; Claude debe localizar la copia durable en GitHub/archivo seguro antes de tomar decisiones de producto.
- El acceso real a Cloudflare no está disponible en el repositorio.
- El coste final no puede estimarse sin tráfico, imágenes y número de clientes.
- Una simple entrada CNAME no demuestra TLS funcional.
- La conexión web de derechos está validada localmente, pero no en producción.
- La suite local no sustituye una prueba productiva autenticada.
- El checkout principal contiene cambios ajenos: no usar `git add .`, `git add -A`, reset destructivo ni copiar archivos sin revisar.

## 9. Criterios para declarar completada cada fase

Una fase local solo puede declararse completa cuando:

- sus pruebas pasan;
- el typecheck relevante pasa;
- el diff está limpio;
- los cambios están documentados;
- se distinguen claramente los accesos/configuraciones pendientes;
- no se confunde una simulación con una prueba productiva.

La publicación final solo puede declararse completa cuando además:

- se confirma el commit de `main` que se va a publicar;
- se compara con producción justo antes del despliegue;
- el despliegue es exitoso;
- las rutas y flujos críticos responden en producción;
- las integraciones externas tienen evidencia positiva y negativa;
- Harness y los documentos del proyecto se actualizan en GitHub.

## 10. Punto exacto de continuación para Claude

Claude debe comenzar leyendo este documento y `PROMPT_CLAUDE_CONTINUACION_BLOG_IA.md`, después revisar el estado real del checkout y del `main`. No debe repetir la implementación del núcleo ni cambiar producción. La siguiente tarea autorizada es construir y probar localmente el wizard de Fase 2, preservando el flujo BROWSER y los cambios ajenos.
