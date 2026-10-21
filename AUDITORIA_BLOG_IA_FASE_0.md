# Auditoría inicial de BLOG IA — Fase 0

Fecha: 2026-10-20  
Alcance: revisión local del repositorio + documentación oficial de Cloudflare.  
Estado: auditoría local completada; validación de cuenta real pendiente de credenciales/acceso.

## Resultado ejecutivo

La arquitectura local es compatible con un Worker multi-tenant y D1. R2 todavía no está conectado y no hay configuración `wrangler.toml` ni cuenta Cloudflare vinculada en este worktree. La solución recomendada para el piloto es:

- Un Worker público para render y API.
- Una base D1 compartida, con `tenant_id` obligatorio y aislamiento probado.
- Un bucket R2 compartido con claves bajo `tenant/<tenant_id>/...`, más validación server-side del tenant.
- Cloudflare for SaaS / Custom Hostnames para los subdominios de clientes.
- Queues solo si la ingestión de medios o reconciliación lo necesita; la publicación desde SEO Total ya tiene reintentos en su worker.

No es posible confirmar desde el repositorio el plan, zona, uso actual, método de pago, límites contratados ni coste real de la cuenta Cloudflare. Eso requiere consultar el dashboard/API de la cuenta.

## 1. Cloudflare, costes y límites

Referencias oficiales consultadas el 2026-10-20:

- Workers Paid: mínimo de 5 USD/mes; incluye 10 millones de requests/mes y 30 millones de milisegundos de CPU; excedentes publicados: 0,30 USD por millón de requests y 0,02 USD por millón de milisegundos de CPU. El plan Free tiene 100.000 requests/día y 10 ms de CPU por invocación.
- D1 Paid: 25.000 millones de filas leídas/mes y 50 millones de filas escritas/mes incluidos; excedentes publicados: 0,001 USD por millón de filas leídas, 1 USD por millón de filas escritas y 0,75 USD por GB-mes sobre los primeros 5 GB.
- R2 Standard: 10 GB-mes, 1 millón de operaciones Clase A y 10 millones Clase B incluidos; después, 0,015 USD/GB-mes, 4,50 USD/millón Clase A y 0,36 USD/millón Clase B. No hay cargo de egress de R2.
- Queues Paid: 1 millón de operaciones/mes incluidas y 0,40 USD por millón adicional; una entrega normal suele consumir escritura, lectura y borrado. Límite publicado: mensajes de 128 KB y retención configurable hasta 14 días.
- Custom Hostnames: los planes Free/Pro/Business incluyen 100 hostnames y publican 0,10 USD por hostname adicional, con máximo publicado de 50.000; las funciones avanzadas de certificados, wildcard y algunos controles pertenecen a Enterprise.

Conclusión de coste: para un piloto pequeño, el coste base conocido puede comenzar alrededor de 5 USD/mes de Workers Paid, más uso de hostnames y servicios según volumen. No se debe prometer un coste final hasta medir tráfico, imágenes y número de clientes.

Riesgos que deben verificarse en la cuenta:

1. Si Custom Hostnames está habilitado en la zona SaaS.
2. Si el plan permite el flujo de validación/TLS elegido.
3. Cuota actual y umbral de enforcement de hostnames.
4. Zona de fallback y destino CNAME.
5. Presupuesto/alertas de gasto.
6. Retención y exportación de backups de D1.

## 2. D1, R2 y backups

### D1

El esquema local está en `apps/blog/migrations/0001_init.sql`. Ya contiene las tablas multi-tenant para tenants, blogs, domains, categories, articles, article_categories, publish_events y audit_log. Las pruebas confirman aislamiento, idempotencia y atomicidad.

Decisión provisional: D1 compartida para el piloto, no una base por cliente. Esto reduce operación y permite mantener un único esquema de migraciones. D1 tiene límites publicados de 10 GB por base en Paid y 2 MB como máximo para un string/BLOB/fila; por eso el HTML debe mantenerse razonable y las imágenes nunca deben guardarse en D1.

### R2

R2 debe almacenar imágenes y recursos, nunca el cuerpo binario en D1. El adaptador pendiente debe:

- aceptar solo MIME de imagen permitido;
- limitar tamaño y dimensiones;
- generar una clave interna `tenant/<tenant_id>/<article_id>/<revision>.<ext>`;
- no aceptar una clave R2 enviada libremente por el cliente;
- devolver una URL pública estable o una URL servida por el Worker;
- conservar la imagen anterior al actualizar, hasta completar retención/limpieza.

### Backups

No hay backup operativo configurado todavía. D1 Paid publica Time Travel de 30 días y Free de 7 días, pero eso no sustituye una exportación recuperable probada. Antes de producción hay que ejecutar una exportación, restaurarla en una base de prueba y documentar el procedimiento.

## 3. Dominio de prueba

No existe todavía una zona Cloudflare ni un dominio de prueba configurado en el worktree. El servidor local usa `blog.demo-salud.localhost` y `blog.demo-casa.localhost`, que ya validan el aislamiento y las rutas.

Prueba real pendiente, en este orden:

1. Crear/seleccionar una zona SaaS propia, por ejemplo `blogs.<dominio-operativo>`.
2. Crear un fallback origin proxied.
3. Crear un CNAME target opcional y documentar el destino que verá el cliente.
4. Crear un Custom Hostname para un subdominio de prueba.
5. Obtener los registros de validación DCV desde el segundo `GET` recomendado por Cloudflare.
6. Esperar hostname + certificado activos.
7. Comprobar SSR, HTTPS, sitemap, canonical y 503 con el hostname real.

Una simple entrada CNAME no basta para afirmar que HTTPS funciona; Cloudflare exige completar la validación del hostname y del certificado.

## 4. GSC, Analytics y Bing

Las conexiones existentes están en SEO Total y no necesitan una segunda autorización para BLOG IA. El repositorio confirma:

| Fuente | Estado existente | Uso para BLOG IA | Cambio necesario |
|---|---|---|---|
| Google Search Console | OAuth existente, scope `webmasters` | señales/editorial y verificación del sitemap del subdominio | añadir flujo para seleccionar/verificar la propiedad del blog; no duplicar conexión |
| Google Analytics | OAuth existente, scope `analytics.readonly` | señales/editorial | definir si el blog usará GA4 del cliente; el blueprint no pide dashboard nuevo |
| Bing Webmaster | OAuth existente, scope `webmaster.manage` | señales/editorial y sitemap/indexación | registrar/verificar la propiedad del subdominio |

Callbacks existentes por defecto:

- GSC: `/api/search-integrations/google/callback`
- GA: `/api/google-analytics/callback`
- Bing: `/api/search-integrations/bing/callback`

Hallazgo importante: las conexiones actuales están centradas en el dominio del sitio principal y `Title.articleUrl` solo guarda la URL publicada. Para BLOG IA, la URL del blog debe ser aceptada por los flujos de indexación y por cualquier publicación social que lea Open Graph. No se debe enviar el sitemap del blog como si perteneciera al sitio antiguo.

## 5. Mapeo final de campos

| Blueprint | Fuente actual SEO Total | Destino BLOG IA | Estado |
|---|---|---|---|
| tenant_id | `User.id` / nuevo `BlogIaBlog.tenantId` | `tenants.id` | resuelto localmente |
| source_article_id | `Title.id` | `articles.source_article_id` | resuelto en publisher |
| revision | no existe como campo editorial dedicado en `Title` | `articles.revision` | usa `1` inicialmente; falta definir incremento en ediciones |
| title | `Title.text` / resultado generado | `articles.title` | resuelto |
| slug | no existe como campo persistido | `articles.slug` | se genera con `slugify`; falta contrato para cambios de slug |
| excerpt | `Title.summary` / resultado generado | `articles.excerpt` | resuelto |
| body_html | no se persiste hoy; lo devuelve `generateCustomArticle` | `articles.body_html` | resuelto en publisher |
| category_ids | `Run.category` actual | `categories` + `article_categories` | adaptador local resuelto |
| cover_image | `Title.imageUrl` / OG del artículo | R2 + `articles.cover_image_url` | pendiente R2 |
| author | datos de `User` | `articles.author` | resuelto |
| published_at | `Title.publishedAt` | `articles.published_at` | resuelto |
| updated_at | `Title.processedAt` o evento | `articles.updated_at` | falta definir semántica de edición |
| seo_title/meta_description | no hay campos dedicados en `Title` | columnas BLOG IA | resultado generado/adaptador pendiente |
| canonical_url | se deriva de `articleUrl` | canonical del hostname primario | resuelto en render; falta probar dominio real |
| language | `Run.contentLanguage` o `User.contentLanguage` | `articles.language` | resuelto |
| status | `Title.status` | `articles.status` + evento | resuelto para publish/unpublish |

## Bloqueadores de cuenta real

Estos no se pueden cerrar desde el repositorio:

- acceso a la cuenta Cloudflare o token de solo lectura;
- identificación de la zona SaaS y dominio de prueba;
- confirmación del plan Cloudflare y presupuesto mensual;
- una propiedad de prueba en GSC/Bing y, si se desea medir tráfico, GA4;
- acceso a DNS del dominio de prueba para completar DCV.

## Próxima ejecución local

La Fase 1 local ya quedó cerrada después de esta auditoría: contrato de medios/R2 simulado, metadatos de medios, CSP, rate limit, plantilla Wrangler, lockfile y 44/44 pruebas. La integración también bloquea publicaciones durante una suspensión con respuesta 503 reintentable y vuelve a aceptar el mismo flujo al reactivar. La sincronización local desde `ProductEntitlement` quedó implementada y validada con las dependencias generadas del checkout. Mientras no estén esos accesos, el trabajo autónomo continúa con:

1. adaptador R2 local y pruebas de imágenes;
2. conexión de la sincronización suspend/resume al proveedor de facturación real, cuando exista ese flujo;
3. corrección del entorno de enlaces Prisma/shared del worktree;
4. CSP y rate limit de la API;
5. pruebas de accesibilidad y carga antes del piloto.

## Fuentes oficiales consultadas

- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Queues pricing: https://developers.cloudflare.com/queues/platform/pricing/
- Cloudflare for SaaS plans: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/
- Cloudflare custom hostnames: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/create-custom-hostnames/
- Cloudflare for SaaS setup: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/
