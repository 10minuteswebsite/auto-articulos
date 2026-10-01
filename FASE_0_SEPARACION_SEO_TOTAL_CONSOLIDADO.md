# FASE 0 CONSOLIDADA — para aprobación de Milton

Proyecto: SEPARACION DE SEO TOTAL DE REDES TOTALES · Autor: Claude (control de proyecto) con Codex · Fecha: 2026-10-01
Estado: **LISTA PARA TU APROBACIÓN. No hay código, ni migraciones, ni cambios en producción.**
Detalle técnico: `FASE_0_SEPARACION_SEO_TOTAL_PARTE_A_CLAUDE.md` (Claude) y `FASE_0_SEPARACION_SEO_TOTAL_PARTE_B_CODEX.md` (Codex). Especificación: `MASTER_BLUEPRINT_SEPARACION_SEO_TOTAL_ARTICULOS_Y_REDES.md`.

---

## 1. En cinco líneas

1. SEO Total se separa **de cara al cliente** en **SEO Total Artículos** y **SEO Total Redes**; el código sigue siendo uno solo.
2. Se añade **una tabla de derechos** (quién tiene qué producto, con gracia de 5 días) que tú controlas desde Administración.
3. Nace **apagada**: primero solo registra lo que bloquearía (modo sombra) y se enciende cuando tú lo decidas. **Nadie queda fuera por error.**
4. El login actual **no pierde autoridad** hasta el día de corte que tú elijas.
5. Los dos agentes (Claude y Codex) revisaron el trabajo del otro y **no quedan contradicciones materiales**.

## 2. Qué se aprueba con esta Fase 0

Aprobar la Fase 0 significa: **autorizar que empiece el código de los lotes**, uno a uno, cada uno con sus tres auditorías, y **cada paso a producción lo sigues autorizando tú** (esa puerta no cambia). Nada se despliega por aprobar este documento.

## 3. Cumplimiento de la lista obligatoria de la Fase 0 (blueprint §17)

| Requisito | Dónde está | Estado |
|---|---|---|
| Arquitectura completa | Parte A §3 (producto, tres puntos de aplicación) y Parte B B3–B4 (acceso y dominios) | ✅ |
| Stack tecnológico | §6 de este documento (**no se añade ninguna tecnología nueva**) | ✅ |
| Modelo de datos | Parte A §2 (`ProductEntitlement`, bitácora de eventos, interruptor, backfill) | ✅ |
| Flujos de usuario | Parte A §4 (F1–F8) | ✅ |
| Mapa de navegación | Parte A §5 | ✅ |
| Estructura de carpetas | §7 de este documento | ✅ |
| Roadmap por fases | §8 de este documento | ✅ |
| Riesgos técnicos | §9 de este documento (más Parte A §8 y blueprint §13) | ✅ |
| Propuestas de mejora | §10 de este documento | ✅ |
| Inventario de callbacks OAuth | Parte B B1 (corregido en el PR #303) | ✅ |
| Algoritmo de contraseñas | Parte B B2 (bcrypt) | ✅ |
| Plan de DNS y certificados | Parte B B4 | ✅ |
| Guion del corte con reversa | Parte B B5 | ✅ |

## 4. Decisiones que necesitamos de ti (con mi recomendación)

Responde con la letra o el número; si no respondes una, se aplica la recomendación.

| # | Decisión | Recomendación |
|---|---|---|
| D1 | Quien compre **solo Redes**: ¿ve el asistente de configuración inicial de Artículos? | Un asistente propio y más corto para Redes (idioma + conexiones de red) |
| D2 | Producto sin derecho: ¿tarjeta atenuada con «Activar», o se oculta? | Atenuada con «Activar» |
| D3 | Antes del corte, ¿«Activar» lleva a un contacto o queda deshabilitado? | Contacto al administrador, sin enlace de pago |
| D4 | Nombre visible de los productos para la marca blanca **tagcrush** | Mismo esquema, con el nombre de marca de tagcrush |
| D5 | Usuarios «PRUEBAS» y de registro de prueba: ¿entran en la tabla de derechos? | Sí |
| D6 | Gracia vencida con trabajos en curso | **No** se cortan los ya iniciados; no se inician destinos nuevos |
| D7 | `composio` en Configuración: ¿administración o compartida? | Compartida, oculta a no administradores |
| D8 | Al comprar Redes, ¿se aprueban solas las redes? | No: las aprobaciones por red siguen siendo de Administración |
| D9 | Dominio estable para las rutas de máquina (Alexa/Claude/MCP) y el puente del dominio viejo | `callbacks.lasolucionweb.com` |
| D10 | Antes de encender el bloqueo real: ¿una semana de modo sombra como mínimo? | Sí, una semana |

## 5. Lo que te toca a ti (solo tú puedes hacerlo)

| Tarea | Cuándo | Detalle |
|---|---|---|
| **M2 — Aprobar esta Fase 0** | Ahora | Arranca el código de los lotes |
| **M3 — Capitanía de migración** | **Antes del Lote 1** (lleva migración) | Hoy está reclamada por la sesión «MCP autónomo» desde las 14:40 UTC; parece vieja (su PR #280 ya está fusionado). Tú decides si se libera |
| **M1 — Registrar callbacks** en las consolas de Google, Meta, LinkedIn, Pinterest, Tumblr, X, Bing y Composio | Tras confirmar D9 y los subdominios | Lista exacta por proveedor en Parte B B1. Se registran los **dos hosts nuevos** además del actual. **Google y Meta pueden tardar días**: conviene empezar pronto |
| Autorizar cada paso a producción | Por lote | Con las tres auditorías y la declaración del Protocolo de No Destrucción |

## 6. Stack (sin tecnología nueva)

Se mantiene todo lo existente: Next.js (con las particularidades de su versión, ver `apps/web/AGENTS.md`), Prisma sobre PostgreSQL, Vercel para la web y el worker actual. **No se añaden dependencias** para este proyecto. La firma del token usa la criptografía estándar de Node/Web Crypto.

## 7. Estructura de carpetas (propuesta, por lote)

*(Las rutas marcadas † son propuestas y se confirman al empezar cada lote.)*

**Lote 1 — base invisible**
- `packages/db/prisma/schema.prisma` + `packages/db/prisma/migrations/<fecha>_add_product_entitlements/migration.sql` (mismo commit)
- `apps/web/src/lib/product-access.ts` y `product-access.test.ts` †
- `apps/web/src/lib/product-enforcement.ts` † (interruptor y registro de sombra)
- `apps/web/src/app/api/admin/users/[id]/entitlements/route.ts` †
- cambios en `apps/web/src/app/dashboard/usuarios/page.tsx`, `apps/web/src/app/api/me/route.ts`, creación de usuarios y el manual de usuario

**Lote 2 — separación visual** (sin migración)
- `apps/web/src/lib/modules.ts` (campo `product`, `productOfPath`), `apps/web/src/lib/menu-names.ts` (`PRODUCT_NAMES`)
- `apps/web/src/components/DashboardNav.tsx` (selector de producto), `ProductSwitcher.tsx` †
- `apps/web/src/app/dashboard/articulos/page.tsx` †, `apps/web/src/app/dashboard/redes/page.tsx` †, inicio selector
- Configuración, Conexiones (`ConexionesView.tsx`), Historial y Progreso (vista por producto), «Mi cuenta»

**Lote 3** — helper `requireProductAccess` en las APIs, el layout de servidor y el worker (`apps/worker/src/*`)
**Lote 4** — receptor del acceso del HUB `apps/web/src/app/api/auth/hub-handoff/route.ts` † (diseño en Parte B B3; la ruta pública entra en `middleware.ts`)
**Lote 5** — subdominios y callbacks por host; derivación por lista blanca en `google-oauth.ts`, `google-analytics-oauth.ts` y `bing-oauth.ts`
**Lote 6** — ensayo del corte, sin código nuevo de producto

## 8. Roadmap y reparto (hora de trabajo, con Claude y Codex en paralelo)

| Lote | Qué | Quién | Depende de | Tiempo |
|---|---|---|---|---|
| 1 | Base invisible: derechos, activador de Artículos, gracia en Administración | Claude | M2, M3 | 2–3 h |
| 4 | Receptor del acceso del HUB (en `legacy`) | Codex | M2 | 2–3 h |
| 5 | Subdominios, callbacks por host, puente de rutas de máquina | Codex | M2, D9, M1 | 1–2 h de código |
| 2 | Separación visual por función | Claude | Lote 1 verificado | 4–8 h |
| 3 | Derechos exigidos en APIs, layout y worker (en sombra) | Codex | Lote 1 verificado | 2–3 h |
| 6 | Ensayo general del corte | Los dos | todos | 1–2 h |
| Corte | Guion de Parte B B5, contigo presente | Los dos + tú | todo lo anterior | — |

**Puertas:** cada lote necesita sus tres auditorías, la revisión cruzada del otro agente y **tu autorización para pasar a producción**. El tiempo real depende más de tus aprobaciones y de las consolas de los proveedores que de programar.

## 9. Riesgos principales y cómo están cubiertos

1. **Dejar fuera a un usuario actual** → ausencia de fila = comportamiento actual; modo sombra; interruptor de retorno inmediato.
2. **Se rompen las conexiones de Google, Meta, etc.** → callbacks por host de origen (el `state` y la sesión son por host); registrar los dos hosts nuevos **y** conservar el actual hasta comprobar que nadie lo usa.
3. **Se rompe el servidor MCP (Alexa/Claude)** → dominio estable solo para rutas de máquina y puente 308 durante la transición.
4. **Migración sin aplicar tumba producción** (incidente del 2026-09-08) → schema y migración en el mismo commit; capitanía resuelta antes; prueba en worktree aislado.
5. **Cambios en middleware/Vercel** → advertencia crítica de Vercel y tres auditorías; el único cambio al middleware es una ruta pública (Lote 4).
6. **Worker sin revisión de derechos** → comprobación justo antes de cada destino, sin cortar lo ya iniciado.
7. **Marca blanca de tagcrush** → todo texto nuevo pasa por `platformProductName()`.

## 10. Propuestas de mejora (no obligatorias)

1. **Pantalla «Mi acceso»** para el usuario: qué productos tiene, estado y días de gracia que le quedan.
2. **La bitácora de eventos de derechos** sirve de base para la facturación y la auditoría futuras, sin trabajo extra.
3. **Script de verificación de callbacks** que pruebe cada proveedor en cada host antes del corte.
4. **Estadísticas propias de Redes** (hoy Estadísticas solo cuenta Artículos); queda fuera de este proyecto y se puede planificar después.

## 11. Qué pasa si apruebas

1. Resuelves M3 (la capitanía) y respondes las decisiones (o aceptas las recomendaciones).
2. Yo empiezo el **Lote 1** y Codex el **Lote 4** (y el 5 cuando confirmes D9), en worktrees aislados, cada uno con sus tres auditorías.
3. Te presento cada lote para tu autorización de producción con un resumen de cinco líneas.
4. En paralelo, tú registras los callbacks (M1).

## 12. Estado de las revisiones cruzadas

- **Parte B revisada por Claude:** aprobada con un cambio obligatorio (callbacks por host), ya incorporado por Codex en el PR #303.
- **Parte A revisada por Codex:** respondió las 9 preguntas (X-005) y no encontró contradicciones materiales; una propuesta suya (auditoría previa a `enforce`) está incorporada.
- **Ajuste menor pendiente de Codex:** en B4, la frase «aloje o reenvíe los callbacks» debe decir «las rutas de máquina», para ser coherente con su propio B1.
- **El HUB** permanece **fuera de alcance** por orden tuya; ningún documento de esta Fase 0 depende de él.
