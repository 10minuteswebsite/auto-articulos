# TRASPASO — SEPARACIÓN DE SEO TOTAL EN ARTÍCULOS Y REDES (versión 2)

> **Para Codex (o cualquier agente que retome esto).** Este archivo es el punto de entrada y **sustituye a la versión 1**. Si Claude se queda sin tokens, **tú tomas el control** (ver sección 12). Léelo completo, luego `CONTROL_SEPARACION_SEO_TOTAL.md` (sección 0 y las últimas entradas `C-0xx`), `CONTRATO_HUB_PARA_EL_HUB.md`, `MANUAL_DIA_CERO.md` y `BUZON_HUB_SEO_TOTAL.md`.
> Obedece **sin omitir nada** `COORDINACION_CLAUDE_CODEX.md` (no lo leas entero: ~650 KB; secciones «PROTOCOLO OBLIGATORIO DE NO DESTRUCCIÓN», «METODOLOGÍA DE TRABAJO EN PARALELO Y CAPITÁN DE ARCHIVO», «INCIDENTE CRÍTICO» y «ADVERTENCIA CRÍTICA SOBRE VERCEL»).

Actualizado: 2026-10-02 · Responsable: Claude (control del proyecto) · Dueño: Milton (hispanohablante; **no puede abrir `.md`**: entrégale `.html` o un Artifact).

## 1. Qué se construye
SEO Total se divide, de cara al cliente, en **SEO Total Artículos** y **SEO Total Redes** (**nunca «Redes Totales»**). Un **HUB** (otro proyecto, de **Mario**) será dueño del login, la facturación y el sí/no por producto. SEO Total conserva todo lo operativo (módulos, permisos de cada red, datos).

## 2. Decisiones cerradas de Milton (no reabrir sin preguntarle)
1. **Dominios.** `seototal.lasolucionweb.com` **no se mueve ni cambia a `.net`**. Dos subdominios nuevos en el `.com`: **`articulos.lasolucionweb.com`** y **`redes.lasolucionweb.com`** (sin «seototal.» ni acento). **Mario crea el DNS** y los apunta al **mismo proyecto de SEO Total en Vercel**. Al final, lo que entre por el dominio actual se lleva al HUB **solo si es persona** (`/`, `/login`); Alexa, Claude/MCP y retornos OAuth siguen en el `.com`.
2. **Reparto.** El HUB: identidad, login de usuarios normales (código por correo o Google; **no se migran contraseñas**), **permiso sí/no por producto**, facturación y gracia. SEO Total: módulos, submódulos, permisos de cada red, datos. **SEO Total no convierte a gracia ni cobra.**
3. **Dos productos desde el principio**, cada uno a su subdominio.
4. **Todos los usuarios pasan gratis** al HUB (Artículos y Redes); Milton cierra/abre por usuario desde el HUB y pone las reglas de pago después.
5. **El Día Cero se encienden los permisos de Redes a TODOS los usuarios actuales** (módulo `oportunidades-redes` + los 10 `allow*Publishing`), **con simulación previa y lista guardada para revertir**; y a los nuevos al crearse desde el HUB. Cada usuario conecta sus propias redes.
6. **Administradores y soporte**: **puerta directa con contraseña** (ruta no enlazada, solo cuentas `admin`, con límite de intentos), sin pasar por el HUB, en `articulos` y `redes`; «Acceder como» como hoy. **No hay rol nuevo por producto.** Riesgo conocido: si el HUB cae, los usuarios normales no entran.
7. **Los 7 días de prueba de SEO Total se eliminan** el Día Cero (interruptor, **sin borrar código**: `hasTrialAccess` en `apps/web/src/lib/trial.ts`, `trialUnlocked`, `isTrialSignup`, «Solicitar prueba»). El HUB es la única fuente de acceso.
8. **Callback único** (aprobado en principio, **NO construido; Milton aún no dio «adelante»**): todos los proveedores (LinkedIn, Pinterest, Tumblr, X, Blogger, Bing) conservan **un solo callback** en `seototal.lasolucionweb.com`; la conexión se inicia en `articulos` o `redes`, el origen viaja en el `state` firmado y el callback devuelve al usuario a su pantalla. Requiere cookie de sesión con `Domain=.lasolucionweb.com`. Google y Meta van por **Composio** (no dependen de nuestros callbacks). **El protocolo de paso a Composio es INTOCABLE.**
9. **Encabezado global del HUB** obligatorio (marca «LA SOLUCIÓN IA», Aplicaciones, Facturación, Perfil, Administración, Salir). **Decisión temporal:** por ahora lo ve todo el mundo, incluido **Tagcrush** (marca blanca; contradice su regla; depurar después).
10. Interruptor de aplicación `product_enforcement`: **sigue APAGADO**. Pasar a Sombra lo decide Milton (≥ 7 días antes de Activo); Activo solo desde Sombra y escribiendo **ACTIVAR**.

## 3. Estado de producción (verificado el 2026-10-02 con `scripts/smoke-production.sh`: «Smoke test OK»)
Desplegado y **apagado** (nadie lo nota): tabla `ProductEntitlement` + `ProductEntitlementEvent` (106 usuarios con Artículos; 9 con Redes; RLS activo); paneles de Administración (derechos por usuario, gracia, interruptor); vista por productos (módulo opt-in `vista-productos`, solo administradores o «Habilitado»); `requireProductAccess` en 24 rutas y worker en sombra; hosts permitidos de retorno OAuth; botones de 44 px (#373).
**Migraciones se aplican a mano en Supabase.** El botón normal de migraciones (`db push`) es **peligroso**: producción tiene 5 columnas del HUB en `User` (`hubUserId`, `hubAuth0Sub`, `hubSyncedAt`, `hubSyncAttemptedAt`, `hubSyncError`) que `schema.prisma` de `main` no declara; los runs #74 y #75 abortaron sin cambios. **Nunca** `accept_data_loss`, `force_sync` ni `db push` contra producción.

## 4. PR abiertos y su estado (esperan a Milton; **solo él ordena fusionar código**)
| PR | Qué es | Nota |
|---|---|---|
| **#381** | `MANUAL_DIA_CERO.md`, `CONTRATO_HUB_PARA_EL_HUB.md` (v2) y carta/prompt para Mario | Rama `claude/manual-dia-cero`. Pendiente «fusiona #381» |
| **#368** | Declara en `schema.prisma` las 5 columnas del HUB (opción B, **recomendada**; sin migración) | Milton aún no decide |
| **#372** | `me-client` (caché de `/api/me` de 3 s) | **No fusionar**: no cumple su objetivo (siguen 5 llamadas) y añade riesgo de datos viejos. Rehacer con invalidación al guardar |
| **#380** | Checklist de callbacks acortado (Google/Meta por Composio) | Solo documento |
Ya fusionados hoy: #367, #371, #373, #375, #376 (documentos, prueba de completitud, botones 44 px). #370 cerrado.

## 5. Qué falta construir (nada de esto está iniciado; **Milton debe decir «adelante»** y el orden de menor a mayor riesgo es el siguiente)
1. **Hosts permitidos:** en `apps/web/src/lib/oauth-redirect.ts` (`DEFAULT_ALLOWED_HOSTS`) cambiar `seototal.articulos.lasolucionweb.com` / `seototal.redes.lasolucionweb.com` por **`articulos.lasolucionweb.com`** / **`redes.lasolucionweb.com`**; actualizar `oauth-redirect.test.ts`.
2. **Perfil inicial y encendido de permisos de Redes:** función pura `redesProfile` (módulo `oportunidades-redes` + los 10 `allow*Publishing`; ver `hasLegacySocialModuleAccess` en `packages/shared/src/product-access-core.ts` y `apps/web/src/lib/modules.ts`) usada (a) al crear cuenta desde el HUB y (b) en un script de Día Cero que **simula primero** (cuántos cambian), guarda la lista de afectados y solo aplica con confirmación explícita (patrón de `scripts/corte/conversion-a-gracia.sql`: seguro por defecto, `-v apply=yes`).
3. **Puerta directa de administradores:** ruta no enlazada, solo `role = admin`, con límite de intentos, en ambos hosts. «Acceder como» debe seguir funcionando en los dos.
4. **Desactivar la prueba de 7 días** con un interruptor (`SystemSetting`), sin borrar código; con permiso del HUB la regla antigua se ignora.
5. **Aplicar el permiso del HUB:** función `applyHubEntitlements(userId, {product, allowed, grace_until?}, source=HUB)` que escribe `ProductEntitlement` (sube `version`, inserta evento). Reutiliza `computeNextEntitlement` (`apps/web/src/lib/product-entitlement-transition.ts`). Nunca revoca por omisión.
6. **Encabezado global del HUB** (UI; estilo Apple de Milton, ver memoria «Estilo Apple»; Tagcrush: temporal).
7. **Callback único + cookie `.lasolucionweb.com`** (lo más delicado: cambia la sesión de todos; probar con pruebas puras y navegador, apagado hasta el Día Cero, con reversa). Hoy cada callback usa cookie de sesión y de `state` ligadas al host y arma `redirectUri` con el host de la petición (ver `app/api/search-integrations/tumblr/callback/route.ts` y `lib/session.ts`).
8. Rehacer `me-client` bien (opcional).
**Lo que NO hay que construir:** conversión a gracia (`scripts/corte/conversion-a-gracia.sql` ya no se usa), desvío 308, mover el dominio, dominio estable nuevo.

## 6. Comunicación con el HUB (Mario) — sin que Milton sea mensajero
- Canal: **`BUZON_HUB_SEO_TOTAL.md`** (entradas `H-001`…`H-003` ya publicadas; esperamos **`H-004`** del programador del HUB con las 9 preguntas de `CONTRATO_HUB_PARA_EL_HUB.md` §12). Se responde con PR que toque **solo ese archivo**. **No des órdenes al HUB: cuéntale cómo está construido SEO Total** (decisión de Milton). **No toques `codex/hub-seo-total-migration`** (rama de Mario; solo lectura).
- Su documento (leído): HUB en `https://hub.lasolucionweb.net`; `/auth/hub?code=` (código de un solo uso, 5 min), `POST /api/product-launch`, `POST /api/integrations/auto-articulos/{access,user-sync}`; secretos solo como variables protegidas. Discrepancias abiertas con nuestro diseño: producto único `seo-total` (nosotros dos), `trialUnlocked` que su revalidación escribe, cuentas 104/85/19, y que su `/auth/hub` crea cuentas locales **vacías**.
- Preguntas aún abiertas: contrato §12 (9 preguntas). Respuesta de Mario y su programador esperada en el buzón.
- Página privada para Mario (Artifact): `https://claude.ai/artifact/5cx6foBsG8CLZMhb13d2UE` (Milton debe compartirla).

## 7. Cómo se verifica (servicio de verificación; tu entorno de Codex no puede ejecutar `tsx`/Prisma/`tsc`)
Cuando Claude no esté, **tú debes poder verificar tú mismo** o marcar «NO EJECUTADA»:
1. Worktree **fuera** del repo (`/private/tmp/<nombre>`), nunca en `.worktrees/`. `node_modules`: copia con `cp -cR` desde otro worktree que ya los tenga (p. ej. `/private/tmp/separacion-lote1`); `prisma generate` con `DATABASE_URL=postgresql://x:x@localhost:1/x`.
2. `cd apps/web && npx tsc --noEmit` y `npx tsx --test src/lib/*.test.ts` (hoy 153/153); `npm run build` desde `apps/web` (lo que usa Vercel).
3. Navegador/API de prueba: Postgres local desechable en el puerto **54329** (BD `lote2`, usuarios `admin@t`, `normal@t`, `blogger@t`, `solo-mastodon@t`, `maestro-habilitado@t`); inicializar con `LC_ALL=en_US.UTF-8`; `.env.local` en `apps/web` con `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `CREDENTIALS_ENCRYPTION_KEY` (copia de `/private/tmp/separacion-lote1/apps/web/.env.local`). **Nunca contra producción.** `migrate deploy` desde vacío falla (migración histórica de Tumblr): para pruebas usa `db push` en la base desechable.
4. Producción: solo lectura con `scripts/smoke-production.sh` (9 comprobaciones; debe terminar «Smoke test OK»).

## 8. Reglas de colaboración y trampas conocidas
- **Capitán de archivo:** `bash scripts/migration-coordinator.sh claim "<agente>" "motivo"` antes de empujar; es un candado local a cada copia. Anotar en `COORDINACION_CLAUDE_CODEX.md`.
- **PR normal** (`gh pr create` + merge). **El clasificador de seguridad bloquea** fusionar PR de código sin orden literal de Milton («fusiona #N»), despliegues a producción, y pegar SQL/credenciales de producción. **Solo los PR que tocan únicamente documentos de control se han podido fusionar sin él.** No pidas a Milton acciones que el sistema bloqueará; **nunca reintentes por otro camino**.
- Nunca `git add .` / `-A`. Schema + migración en el mismo commit. **Migración antes o junto con el merge** (incidente 2026-09-08 tumbó `/dashboard`).
- Actualizar `apps/web/src/content/manual-usuario.ts` en el **mismo lote** que cada cambio visible (**no uses acentos graves/backticks dentro de ese template literal**).
- **Tagcrush** es marca blanca: nada visible que diga «10minutesWebsite» (`platformProductName()` en `packages/shared/src/platform-servers.ts`); hoy la excepción temporal del encabezado del HUB (ver 2.9).
- **zsh en macOS:** `$B:ruta` se interpreta como modificador `:a` (usa `${B}:ruta` o la ruta literal); `echo ======` falla; `sed -i ''`.
- **Hooks de commit** (`.githooks/post-commit`) avisan «falta `tsx`/DATABASE_URL»: no es fallo del cambio.
- **Un PR cuya base es otra rama** se fusiona en esa rama, no en `main`: verifica `--base main` antes de fusionar.
- Para tus entradas del control: **abre PR de control a `main`** (si no, nadie las ve).
- Milton cree que Codex «está parado» cuando está callado: **mira git (ramas, PR, control) antes de responderle**.

## 9. Cuenta de pruebas y producción
Cuenta real de pruebas: ver memoria «Cuenta de pruebas: Lorena Álvarez» (todo se verifica directo en producción, solo lectura salvo orden). Administradores siempre pasan los derechos. Redes se ve siempre como tarjeta (sin permiso, el clic lleva a un aviso claro).

## 10. Mapa de archivos clave
`packages/shared/src/product-access-core.ts` (`evaluateProductAccess`, `PRODUCTS`, `parseEnforcementMode`) · `apps/web/src/lib/{product-access,product-enforcement,product-enforcement-transition,require-product-access,product-routes,product-page-gate,product-entitlement-transition,oauth-redirect,session,trial,modules}.ts` · `apps/web/src/components/{ProductAccessGuard,ProductHome,DashboardNav,ModuleGuard}.tsx` · `apps/web/src/app/dashboard/{articulos,redes,mi-acceso,usuarios}/…` · `apps/web/src/app/api/admin/{product-enforcement,users/[id]/entitlements}/route.ts` · migración `packages/db/prisma/migrations/20261002000000_add_product_entitlements/`. Documentación: `ARQUITECTURA_FINAL_DERECHOS_POR_PRODUCTO.md`, `GUIA_ADMIN_DERECHOS.md`, `ENSAYO_REVERSA.md`, `AUDITORIA_RUTAS_SIN_BARRERA.md`, `MATRIZ_DECISIONES_VS_IMPLEMENTACION.md`, `CHECKLIST_CALLBACKS_MILTON.md`, `CHECKLIST_MILTON_AL_DESPERTAR.md`, `RUNBOOK_CORTE.md` (anterior; sustituido por `MANUAL_DIA_CERO.md`).

## 11. Pendientes que SOLO puede hacer Milton
1. Decir «fusiona #381» (documentos) y decidir **#368** (columnas del HUB).
2. Compartir la página de Mario y darle al programador del HUB **acceso de escritura a ramas** del repositorio para el buzón.
3. Pasar el interruptor a **Sombra** cuando quiera (reloj de ≥ 7 días).
4. Registrar retornos en LinkedIn, Pinterest, Tumblr, X, Blogger y Bing **solo si se descarta el callback único**.
5. Decir «adelante» para empezar a construir la sección 5, y elegir el orden.
6. Decidir la fecha del Día Cero cuando las puertas del manual estén en verde.

## 12. Si Claude se queda sin tokens: cómo toma el control Codex
1. Lee este archivo, el control (`CONTROL_SEPARACION_SEO_TOTAL.md` §0.9–0.13), el contrato, el manual y el buzón.
2. Escribe en el control **«CODEX TOMA EL CONTROL»** con fecha y abre PR de control. Revisa cada ~10 min el buzón y los PR.
3. **No construyas la sección 5 sin el «adelante» de Milton.** Mientras tanto: atender el buzón, verificar PR, mantener documentos al día, y preparar (en rama, sin fusionar) las piezas puras con pruebas.
4. Todo cambio se documenta y comenta en el código para el siguiente. Si dudas, **pregunta a Milton como a un humano** (una sola pregunta, en palabras simples; él no entiende jerga).
5. Nunca toques producción ni la rama del HUB; nunca ejecutes SQL de producción; el interruptor sigue **Apagado**.

## 13. Bitácora
- 2026-10-01 — Entrevista MAGO, blueprint triple-auditado, Fase 0, Lote 1 en producción.
- 2026-10-02 — Lotes 2, 3, 3b, 3c y 5, paneles y botones de 44 px en producción (interruptor Apagado). Contrato v2, manual v2, buzón con el HUB, carta y prompt para Mario. Seis puntos de decisión cerrados con Milton (sección 2). Traspaso v2 (este archivo).
