# TRASPASO — SEPARACIÓN DE SEO TOTAL ARTÍCULOS Y SEO TOTAL REDES

> **Para Codex (o cualquier agente que retome esto):** este archivo es el punto de entrada.
> Léelo completo, luego `MASTER_BLUEPRINT_SEPARACION_SEO_TOTAL_ARTICULOS_Y_REDES.md` (la especificación) y
> **obedece sin omitir nada el protocolo de `COORDINACION_CLAUDE_CODEX.md`** (no lo leas entero: es de ~650 KB;
> lee la sección «PROTOCOLO OBLIGATORIO DE NO DESTRUCCIÓN» y «METODOLOGÍA DE TRABAJO EN PARALELO Y CAPITÁN DE ARCHIVO»).
> Orden de Milton: **leer el documento de coordinación y obedecerlo.**

Última actualización: 2026-10-01 · Responsable de este traspaso: **Claude, control de proyecto** (sesión «SEPARACION DE SEO TOTAL DE REDES TOTALES»). **Canal vivo entre Claude y Codex: `CONTROL_SEPARACION_SEO_TOTAL.md` (tablero y buzones, lectura cada 5 min). Si hay diferencia entre este archivo y el control, manda el control.** El HUB es otro proyecto y queda **fuera de alcance** (orden de Milton): no tocar su rama ni sus archivos.

---

## 1. Qué se está construyendo (en tres frases)

Hoy SEO Total es una sola app (`seototal.lasolucionweb.com`). Se separa **de cara al cliente** en dos productos:
**SEO Total Artículos** y **SEO Total Redes** (el nombre «Redes Totales» está descartado). Una interfaz superior, el **HUB**
(otro proyecto, aún no existe), será dueña del login, la facturación y el encendido/apagado de cada producto; este
trabajo deja la app lista y define el protocolo para entregarle el control sin dejar fuera a nadie.

## 2. Decisiones de Milton (cerradas, no reabrir sin preguntarle)

1. Subdominios: `seototal.articulos.lasolucionweb.com` y `seototal.redes.lasolucionweb.com`.
   **Nacen al público el día del corte**; antes se preparan en privado.
2. **Hoy no se programa nada que le quite autoridad al login actual.** Manda hasta el día de corte que Milton decida. Nadie queda fuera antes.
3. El día del corte: la autoridad del login pasa al HUB; nacen los subdominios; el dominio viejo lleva al HUB **solo a las personas** (no se redirige a ciegas: ver blueprint 9.5). Los usuarios entran al HUB **con las mismas credenciales** (hoy bcrypt en `User.passwordHash`).
4. Entrada HUB→app: **token firmado de un solo uso** (ES256, POST autoenviado, verificado en route handler Node).
5. Gracia de **5 días** por app, editable o quitable por Milton por usuario en Administración. Artículos: todos los usuarios actuales. Redes: solo quien ya tenga alguna red aprobada.
6. Se crea **ya** un activador de Artículos (encendido para todos por defecto) y se hace la separación visual y **por función** desde el inicio, dentro de la app actual.
7. Conexiones (Google Search Console, Composio, redes): **por cuenta, nunca por app**. Conectada en una = conectada en la otra.
8. El HUB debe ver los tipos de usuario. Hoy nadie paga; al pasar al HUB pagarán.

## 3. Hallazgos de auditoría que cambian el diseño (no olvidar)

- Callbacks de Google (GSC, Analytics, Business Profile) y Bing están **escritos a mano** en `seototal.lasolucionweb.com` (`apps/web/src/lib/google-oauth.ts`, `google-analytics-oauth.ts`, `bing-oauth.ts`). Otras redes usan el host de la petición.
- El servidor MCP/OAuth2 (`/api/mcp`, `/api/oauth2/*`, `/.well-known/*`) vive en ese host y lo usan Alexa+/Claude. **Mover el dominio al HUB sin puente los rompe.**
- El **worker no revisa** los permisos de Redes (`allow*Publishing`); solo la web.
- Derechos: **nunca** decidir acceso con lo que trae el token; leer `ProductEntitlement` local en cada petición.
- Debe existir acceso de emergencia de administradores y «Acceder como» en los tres modos de login (`legacy`/`dual`/`hub`).
- El middleware (`apps/web/src/middleware.ts`) es zona protegida: aplicar la **ADVERTENCIA CRÍTICA SOBRE VERCEL** antes de tocarlo.

## 4. Reglas que no se negocian (resumen; el original manda)

- Worktree aislado **fuera** del checkout principal (p. ej. `/private/tmp/<nombre>`); **prohibido** anidarlo en `.worktrees/` dentro del repo.
- Antes de cualquier push: `bash scripts/migration-coordinator.sh status` → `claim "<agente>" "motivo"` → … → `release`. Anotarlo en `COORDINACION_CLAUDE_CODEX.md`.
- Nunca `git add .` ni `-A`; revisar `git status`, diff y diff staged.
- **Schema + migración en el mismo commit; migración antes o junto con el merge** (incidente 2026-09-08 tumbó `/dashboard`).
- **Tres auditorías documentadas** antes de producción; declarar «Subiré a producción de acuerdo al Protocolo de No Destrucción.»
- PR normal (`gh pr create` + merge); el push directo a `main` lo bloquea el clasificador.
- Actualizar `manual-usuario.ts` en el mismo lote que cada cambio visible.
- Tagcrush es marca blanca: nada visible que diga «10minutesWebsite» (`platformProductName()` en `packages/shared/src/platform-servers.ts`).
- Cuenta de pruebas y verificación directa en producción: ver memoria «Cuenta de pruebas: Lorena Álvarez».

## 5. Plan por lotes y estado

| Lote | Contenido | Estado |
|---|---|---|
| 0 | Fase 0: arquitectura, modelo de datos, flujos, mapa de navegación, carpetas, riesgos; inventario de callbacks OAuth por proveedor; algoritmo de contraseñas; plan DNS/certificados; guion de corte con reversa | **ENTREGADA PARA APROBACIÓN (M2) — 2026-10-01.** Parte A (Claude, v0.3) y consolidado en el PR #290; Parte B (Codex) en `main` (PR #295) con corrección B1/B4 en el PR #303. Revisión cruzada hecha en ambos sentidos. **Leer primero `FASE_0_SEPARACION_SEO_TOTAL_CONSOLIDADO.md`.** |
| 1 | Base invisible: `ProductEntitlement` + backfill, activador de Artículos, control y gracia en Administración, helper único de acceso | **EN PR #313 (Claude), sin fusionar, migración sin aplicar.** Tres auditorías en `AUDITORIAS_LOTE_1_SEPARACION_SEO_TOTAL.md`. Espera revisión cruzada de Codex y autorización de Milton |
| 2 | Separación visual por función en el host actual (inicio con dos tarjetas, menús, reparto de Configuración, conexiones compartidas, Historial/Estadísticas por app, «Mi cuenta», manual) | no iniciado |
| 3 | Derechos exigidos en APIs **y worker**; avisos de gracia | **Codex: diseño del worker en modo sombra** (usa `evaluateProductAccess` de `packages/shared`); depende de que el Lote 1 esté verificado |
| 4 | Receptor del HUB: `/api/auth/hub-handoff`, claves, interruptor `legacy`/`dual`/`hub` (en `legacy`), HUB simulado | no iniciado |
| 5 | Subdominios en privado, dominio estable de callbacks/MCP, callbacks únicos por entorno, doble registro en proveedores | **EN PR #311 (Codex), sin fusionar.** Verificado por Claude: typecheck, 85/85 pruebas, build y casos hostiles OK; **2 cambios pedidos** (redirección canónica de Bing para hosts no permitidos y pruebas hostiles en el repo). Checklist de callbacks para Milton en el PR #309 |
| 6 | Ensayo general del corte en preproducción, con reversa | no iniciado |
| Corte | Guion 9.4 del blueprint, con Milton presente | no iniciado |

Pendiente que corre en paralelo y que **hace Milton**: registrar los callbacks nuevos en las consolas de Google, Meta, LinkedIn, Pinterest, Tumblr, X, Bing y Composio (Google/Meta pueden tardar días en aprobar dominios nuevos). La Fase 0 debe entregarle la lista exacta primero.

## 6. Decisiones abiertas (Fase 0, ver blueprint sección 16)

Clasificación de `movil`/`mcp`/`composio`/`postpeer`; tarjeta bloqueada visible u oculta; nombre visible para tagcrush;
transferencia de hashes al HUB; base compartida o sincronizada; tipos de usuario (incluido «PRUEBAS» de `TO-DO.md`);
gracia que vence a mitad de un lote; host del dominio estable de callbacks y migración de conectores Alexa/Claude; precios (los define el HUB).

## 7. Estado del repositorio al escribir esto

- Rama de la sesión: `claude/fix-categoria-especifica-vs-general`. Árbol con cambios ajenos sin commitear (`COORDINACION_CLAUDE_CODEX.md` modificado por otra sesión, `.worktrees/`, `docs/`): **no tocar ni commitear**.
- Archivos de este proyecto, **sin commit todavía**: `MASTER_BLUEPRINT_SEPARACION_SEO_TOTAL_ARTICULOS_Y_REDES.md` y este traspaso.
- No hay código, migraciones ni cambios en producción de este proyecto.
- Pendiente de decidir con Milton: anotar este proyecto en `COORDINACION_CLAUDE_CODEX.md` cuando ese archivo esté limpio.

## 8. Bitácora (añadir una línea por cada paso real, con fecha, quién y resultado)

- 2026-10-01 — Claude: entrevista MAGO (6 preguntas) cerrada; blueprint escrito; **triple auditoría en 3 rondas** (hechos contra código, seguridad/arquitectura, completitud). Se corrigieron 6 defectos (el grave: redirección total del dominio rompía callbacks OAuth y MCP). Estimación de tiempo corregida a 2–4 días de sesiones de código; el calendario real lo marcan las consolas de proveedores y el HUB. Sin código.
- 2026-10-01 — Claude: arrancó el trabajo en pareja con Codex por el archivo de control (PRs #284–#301, solo documentación). Codex entregó la Parte B (B1–B5, PR #295) y Claude la revisó (aprobada con un cambio: callbacks OAuth **por host de origen**, porque el `state` y la sesión son por host). Claude entregó la Parte A (contrato de datos, arquitectura, flujos, navegación) y Codex la revisó (X-005, sin contradicciones materiales). Hallazgo: existe una integración con el HUB en la rama `codex/hub-seo-total-migration`; Milton ordenó que el HUB queda **fuera de alcance** (C-007). Siguiente paso: aprobación de Milton (M2), resolver la capitanía de migración (M3) y empezar los Lotes 1 (Claude) y 4/5 (Codex).
- 2026-10-01 — Claude: **Lote 1 programado y auditado (PR #313).** Núcleo puro de acceso en `packages/shared/src/product-access-core.ts` (lo usarán web y worker); lectura con base en `apps/web/src/lib/product-access.ts`; interruptor `product_enforcement` (off por defecto, sin pantalla hasta el Lote 3); API `api/admin/users/[id]/entitlements` y panel «Productos». Migración `20261002000000_add_product_entitlements` probada en Postgres 16 desechable sobre el esquema real de `main` (backfill: Mastodon no cuenta, igual que `SOCIAL_PUBLISHING_PERMISSION_KEYS`). **Regla de Redes que ya existía = `hasSocialModuleAccess`** (interruptor maestro + redes aprobadas), no solo las aprobaciones. Hallazgos corregidos en la auditoría: carga perezosa del panel (16→0 peticiones al abrir) y cálculo de días de gracia desde la fecha. Hallazgo ajeno: `migrate deploy` desde base vacía falla en `20260823150000_add_tumblr_integration`.
- 2026-10-01 — Claude: **revisión cruzada del Lote 5 de Codex (PR #311):** aprobada con 2 cambios (C-015). Se instituye el **servicio de verificación**: el entorno de Codex no puede ejecutar `tsx`/Prisma/typecheck, así que sus auditorías no ejecutables se marcan «NO EJECUTADA» y Claude las corre en su entorno.
- Pendiente que depende de Milton: aprobar la Fase 0 de forma explícita y fusionar #290/#303/#309; autorizar la migración y el despliegue del Lote 1 (con capitanía); registrar los callbacks (checklist #309); decidir cómo se conecta con el HUB (Lote 4 en espera).
