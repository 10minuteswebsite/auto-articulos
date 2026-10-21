# Diseño — Wizard de BLOG IA (Fase 2, local)

Fecha: 2026-10-21 · Autor: Claude · Estado: DISEÑO; sin código aplicado. Pendiente de pasar a `DISENO_WIZARD_BLOG_IA_FASE_2.md` en el checkout BLOG IA cuando haya acceso de escritura.

## 1. Navegación
Pantalla única `/dashboard/blog-ia` (producto ARTICULOS). Módulo `blog-ia` **opt-in** (lo ven admins y cuentas con «Habilitado»): nadie más nota cambios; BROWSER/MCP intactos. Progreso guardado en servidor; se retoma al volver.

## 2. Pasos
1. Mi sitio web: URL https del sitio principal + nombre comercial.
2. Así se verá: color de acento, idioma, WhatsApp, tagline; confirmación explícita (`config.confirmedAt`).
3. Conectar dominio: hostname, registro DNS exacto (CNAME → `BLOG_IA_CNAME_TARGET`), «Verificar conexión».
4. Activar: exige dominio + HTTPS + marca confirmada + acceso vigente. Escribe `status=active`, `activatedAt`, `User.publishMethod=BLOG` (blueprint paso 4; al desactivar NO se revierte: decisión pendiente).
Fuera de alcance (pendiente, no inventado): análisis automático del sitio del cliente; entrada manual por ahora.

## 3. Permisos
Sin sesión → 401. Sin módulo `blog-ia` (y no admin) → 403. Sin acceso a ARTICULOS cuando la aplicación de derechos está activa → 403. El registro siempre se resuelve por la sesión; ids de usuario/tenant del cuerpo se ignoran. Solo admin puede LEER otra cuenta (`GET ?userId=`); nunca modificarla.

## 4. Endpoints (force-dynamic)
`GET /api/blog-ia` estado · `POST /api/blog-ia` crear/continuar (idempotente, `tenantId` determinista) · `PUT /api/blog-ia/config` · `PUT /api/blog-ia/domain` · `POST /api/blog-ia/verify` · `POST /api/blog-ia/activate`.

## 5. Estados de `BlogIaBlog`
`draft_setup → pending_dns → pending_tls → active ⇄ suspended`; `domain_error` si el CNAME apunta a otro destino. «Listo para activar» = `pending_tls` con `dnsVerified && tlsReady` (no se guarda). `active` solo lo escribe «Activar». `suspended` lo escribe la sincronización de derechos; al reanudar vuelve a `active` solo si hay `activatedAt`.

## 6. Hostname
Minúsculas, sin esquema/ruta/puerto, ≤253, etiquetas RFC, ≥3 etiquetas (CNAME no vale en raíz), TLD alfabético, sin IP ni localhost, no dominios de la plataforma (lasolucionweb.*, 10minuteswebsite.*, tagcrush.*). Único global: de otra cuenta → 409.

## 7. Eventos al Worker (firmados, idempotentes)
- Primer hostname válido: `blog.provision` (marca, idioma, sitio) · id `provision:{userId}`.
- Cambio de marca ya aprovisionado: `blog.settings.update` · `settings:{userId}:{hash(config)}`.
- Hostname nuevo o resultado de «Verificar»: `blog.domain.change` · `domain:{userId}:{host}:{dns}:{tls}`.
- Suspensión/reanudación: ya existen en `blog-ia-subscription.ts`.

## 8. Errores y recuperación
Red/5xx/429 (`BlogIaError.retryable`): el cambio local queda guardado, se anota `lastError`, la API responde 502 `retryable:true`; reintentar reenvía el MISMO `eventId`. 4xx: no reintentable, mensaje claro. Si `provisionedAt` es nulo, cualquier acción posterior reintenta `blog.provision` primero. Fallo de consulta DNS (timeout) ≠ «no apunta»: no cambia estado. Sin `BLOG_IA_API_URL`/`BLOG_IA_SECRET`/`BLOG_IA_CNAME_TARGET`: guarda borradores y dice «aún no disponible» al conectar.

## 9. Verificación (sin Cloudflare real)
DNS: CNAME == `BLOG_IA_CNAME_TARGET`. HTTPS: `https://hostname/robots.txt` con certificado válido. Ambos inyectables. **Configuración/código verificados; E2E pendiente.**

## 10. Pruebas
`apps/web/src/lib/blog-ia-wizard.test.ts` con dependencias inyectadas: no autenticado, sin módulo, sin acceso a Artículos, sin registro, creación idempotente, hostname inválido/duplicado, tenant ajeno, pending_dns, pending_tls, active, suspended, domain_error, errores de red, reintentos idempotentes, activación bloqueada; regresión BROWSER/MCP con `modules.test.ts` y `mcp.test.ts` (actualizar la lista de opt-in).

## 11. Auditoría de los cambios de Claude en el checkout BLOG IA
- `schema.prisma`: coherente con este diseño (hostname opcional + 6 columnas). Impacto: `apps/worker/src/blogIaQueue.ts:100` usa `blog.hostname` en una plantilla; con `String?` hay que protegerlo (`status==='active'` implica hostname, pero tipado exige guarda).
- Migración `20261021120000_blog_ia_wizard`: aditiva e idempotente (DROP NOT NULL + ADD COLUMN IF NOT EXISTS). Va después de `20261016120000_add_blog_ia`. Sin aplicar.
- El índice único de `hostname` admite varios NULL en Postgres: correcto.
