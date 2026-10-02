# TRANSFERENCIA COMPLETA DE LIDERAZGO — CLAUDE → CODEX
Proyecto: «SEPARACIÓN DE SEO TOTAL EN ARTÍCULOS Y REDES» · Fecha: 2026-10-02 · **Sin secretos** (ninguna clave, token ni contraseña real está en este documento; los usuarios y contraseñas de prueba de la base desechable los creas tú).

> **Claude fue el líder de implementación hasta hoy y entrega el mando a Codex.** Este documento es la memoria completa de lo que Claude sabe. Léelo junto con `PROMPT_CODEX_TOMA_DE_CONTROL.md`, `TRASPASO_SEPARACION_SEO_TOTAL.md` y las entradas C-034…C-036 de `CONTROL_SEPARACION_SEO_TOTAL.md`.

## 1. Quién es Milton y cómo trabaja (esto evita el 80 % de los errores)
- Dueño del producto. **Hispanohablante, no técnico.** No entiende jerga ni lógica de sistemas: si preguntas, **una sola pregunta, en palabras de todos los días, con ejemplo**. Dijo literalmente: «si tienes una duda tienes que preguntármela como un humano». Cuando le llené de opciones, no las leyó.
- **No puede abrir `.md`**. Entrégale `.html`, un Artifact (privado hasta que él lo comparta), un `.txt` o texto en el chat.
- **Dicta por voz**: errores frecuentes («HomePod/Job» = Hub; «Kodex» = Codex; «sub DOMIN iOS6» = subdominios; «Redds» = Redes; «Lápiz» = proveedores/consolas). Interpreta con contexto y **confirma lo dudoso en una frase**; no inventes.
- **Nunca debe ser mensajero entre agentes.** Todo se comunica por el archivo de control (PR de control a `main`). Mira git (ramas, PR, control) **antes** de decirle que alguien «no ha hecho nada»: él cree que Codex está parado cuando solo está callado.
- Quiere **autonomía**: que sigas trabajando, y que lo avises **solo cuando él deba intervenir**, con una acción concreta. Le molesta que se le pida pensar. Su frase del Día Cero: «yo paso un interruptor y las cosas funcionan; si me pones a pensar, se joden».
- Va **punto por punto**: no reescribas documentos hasta tener todas sus respuestas; no construyas hasta que diga «adelante».
- Quiere todo **documentado y comentado** para que otro programador tome el control.
- Autorización general: «siempre que no rompas nada tienes mi autorización». Aun así, **fusionar código a `main` solo con «fusiona #N» literal** (el clasificador de seguridad lo exige).
- Prioriza no romper lo que hoy funciona: **riesgo cero**. Ante el riesgo, explícale la consecuencia en una frase y ofrece la opción segura; **la decide él**.

## 2. Historia y decisiones (por orden; no reabrir sin preguntarle)
1. **Origen:** SEO Total era una sola app. Se separa de cara al cliente en **SEO Total Artículos** y **SEO Total Redes** (**jamás «Redes Totales»**) para que un **HUB** (de Mario) sea dueño de login, facturación y acceso. Entrevista MAGO + blueprint triple-auditado → Fase 0 → Lotes 1-5 en producción (todo apagado).
2. **Evolución del plan:** primero se pensó pasar los usuarios al HUB el Día Cero (con gracia de 5 días, token firmado, subdominios `.net`, mover el dominio). **Todo eso se descartó.** Mario dijo que el HUB es transparente, tiene acceso a la base de datos y **no participa ni usa el buzón**.
3. **PLAN VIGENTE (Día Cero v3):** ver `PROMPT_CODEX_TOMA_DE_CONTROL.md` §2. Resumen: separación en dos plataformas con el **login de siempre**; **dos acciones de Milton: botón «Día Cero» + variable `DIA_CERO=on` en Vercel**; nadie pierde acceso; todos gratis; HUB paralelo; más adelante Milton eliminará el login de SEO Total.
4. **Decisiones de Milton (literales):** dominios `seototal.`, `articulos.`, `redes.lasolucionweb.com` (Mario creó DNS y Vercel, verificado); los 3 servidores (`site`, `net`, `tagcrush`) comparten los mismos subdominios; quien no tiene acceso a nada va a `https://hub.lasolucionweb.net`; **encender todos los permisos de Redes a todos**; **quitar el indicador de 7 días a todos y dejarlos gratis**; el nombre visible en el HUB es asunto de Mario; administradores/soporte conservan una puerta directa con contraseña **para el día en que se elimine el login** (aparcado, #393); «Acceder como» como hoy; encabezado global del HUB: **temporal para todos, también Tagcrush** (excepción a la marca blanca, a depurar luego); **no volver a tocar consolas de proveedores** (retorno único); Google y Meta van por **Composio**; **el protocolo de paso a Composio es intocable**; `product_enforcement` sigue **Apagado** (decidido por Claude por Milton, porque no quiere pensar).
5. **Frases de seguridad de Milton:** «nadie queda fuera»; «el login actual manda hasta que yo decida»; «no quiero que te agarre desprevenido el uso de tokens» (por eso este traspaso).

## 3. Arquitectura que debes conocer
- **Monorepo:** `apps/web` (Next.js 16 canary; Vercel con root `apps/web`, `npm run build`), `apps/worker`, `packages/shared`, `packages/db` (Prisma 5.22, Postgres en Supabase). RLS activo en las tablas nuevas.
- **Derechos por producto:** `ProductEntitlement(userId, product ARTICULOS|REDES, status ACTIVE|GRACE|INACTIVE, graceUntil, source LEGACY|ADMIN|HUB, version)` + `ProductEntitlementEvent` (historial). «Sin fila = comportamiento legado». Administradores siempre pasan. Regla pura en `packages/shared/src/product-access-core.ts` (`evaluateProductAccess`); lectura en `apps/web/src/lib/product-access.ts` (`hasProductAccess`); barrera en APIs con `requireProductAccess` (24 rutas) y en el worker (modo sombra).
- **Interruptor `product_enforcement`** (`SystemSetting`, valor cifrado): off/shadow/enforce, caché de 30 s; a «enforce» solo desde «shadow» y escribiendo **ACTIVAR**; error leyendo = off.
- **Patrón de interruptores nuevos** (todos copian `product-enforcement.ts`): `login_mode` (#393), `trial_rule_enabled` (#399), `access_router_enabled` (#412). Todos: valor cifrado en `SystemSetting`, caché de 30 s, **un error leyendo = comportamiento de hoy**, ruta de administración auditada con `auditLog`. Los cambios tardan hasta 30 s en verse (el caché es por instancia).
- **Vista por productos:** módulo opt-in `vista-productos` (administradores o «Habilitado»); `productOfPath`/`PRODUCT_ROUTES`; `ProductAccessGuard`, `ProductHome`, `Mi acceso`.
- **Sesión:** cookie `auto_articulos_session` (HMAC), cookie de «Acceder como» `auto_articulos_impersonation` (`lib/session.ts`); el middleware (`apps/web/src/middleware.ts`) es **zona protegida (ADVERTENCIA CRÍTICA SOBRE VERCEL del documento de coordinación)** y corre en **Edge** (no puede usar Prisma ni leer `SystemSetting`).
- **Cookies compartidas** (`lib/shared-cookies.ts`): `applyCookie`/`clearCookie`; sin `DIA_CERO` usan `response.cookies.set` (idéntico a antes); con él escriben cabeceras `Set-Cookie` a mano con `Domain=.lasolucionweb.com` **y borran la variante ligada al host** (si no, conviven y el servidor lee la vieja). `ResponseCookies` de Next guarda **una sola entrada por nombre**: por eso se escriben a mano.
- **OAuth** (`lib/oauth-redirect.ts`): `canonicalOAuthOrigin`, `oauthCallbackUri`, `rememberOAuthOrigin` (cookie corta `oauth_return_origin`), `oauthReturnBase` (valida contra la lista de hosts; nunca un destino arbitrario), `clearOAuthOrigin`. Parchados 11 `connect`/`callback`. Composio/PostPeer no se tocan.
- **Router de acceso:** pura en `lib/access-router.ts` (tuya); adaptador `lib/access-router-adapter.ts` (hasProductAccess → derechos explícitos → router → URL completa, anti-bucle, error = no redirige); enganchado en `app/dashboard/layout.tsx` (solo no administradores y no «Acceder como»).
- **Botón Día Cero:** `app/api/admin/dia-cero/route.ts` (GET simulación; POST `apply`/`revert`; respaldo JSON cifrado en `SystemSetting dia_cero_backup`, sin migraciones) + `DiaCeroPanel.tsx` (tuya).
- **Prueba de 7 días:** `lib/trial.ts` (`hasTrialAccess(user, trialRuleEnabled)`), `lib/trial-rule-setting.ts` (`checkTrialAccess` async, 9 llamadores ya conectados), `/api/admin/trial-rule`.
- **HUB (solo lectura, rama de Mario):** `/auth/hub`, `product-launch`, `access`, `user-sync`; cabeceras `x-platform-client-id` y `Authorization: Bearer`; secretos solo como variables protegidas. **No es nuestro trabajo.**

## 4. Lo que aprendí por las malas (trampas reales)
- **Sin servidor:** las memorias de caché y los límites de intentos son **por instancia**; un cambio de interruptor tarda hasta 30 s.
- **`db push` es peligroso** (`migrate.yml` por defecto): producción tiene **5 columnas del HUB en `User`** (`hubUserId`, `hubAuth0Sub`, `hubSyncedAt`, `hubSyncAttemptedAt`, `hubSyncError`) que `schema.prisma` de `main` no declara; los runs #74/#75 abortaron antes de borrar. **PR #368** las declara (sin migración); recomendado, decisión de Milton. **Nunca** `accept_data_loss`/`force_sync`.
- **Las migraciones se aplican a mano en Supabase.** `migrate deploy` desde vacío falla (migración histórica de Tumblr): para pruebas usa `db push` solo en la base desechable.
- **El editor SQL de Supabase no entiende metacomandos de `psql`** (`\set`, `\if`). Escribe SQL en bloques independientes (simular / aplicar / revertir). `pg_input_is_valid` solo existe en PG16+: no sabemos la versión del Supabase de Milton.
- **Lógica de NULL en SQL:** `NOT (x = 'a')` con `x` NULL excluye la fila **en silencio** (bug real que casi pasa en el SQL de Redes). Simulación y aplicación deben usar **exactamente la misma condición**.
- **Una pieza «reversible» no está entregada hasta que alguien la lee:** el interruptor de 7 días de Codex no estaba conectado a ninguno de sus 9 usos. Haz `grep` de llamadores antes de cerrar.
- **Pruebas que no se ejecutaron no son «aprobadas»:** `NO EJECUTADA`. Las de `access-router` y `apply-hub-entitlements` de Codex fallaban sin que lo supiera (el sandbox de Codex no ejecuta `tsx`/`tsc`/Prisma: EPERM).
- **Stacked PR:** un PR con base en otra rama se fusiona **en esa rama**, no en `main` (pasó con #345 → #351).
- **El clasificador de seguridad** de Claude Code bloquea: despliegues a producción, fusionar PR de código sin «fusiona #N» literal, SQL/credenciales de producción, conducir un workflow de producción desde el navegador. **Nunca reintentes por otro camino**; díselo a Milton y que lo haga él.
- **zsh/macOS:** `$B:ruta` se interpreta como modificador (usa `${B}:ruta`); `echo ======` falla; `sed -i ''`; una variable como comando no se divide (usa funciones).
- **Next:** un `route.ts` no puede exportar funciones que no sean handlers; `Next` valida tipos en `.next/dev/types` (borra `.next/dev/types` si tsc se queja de rutas que ya no existen).
- **Template literal de `manual-usuario.ts`:** **sin acentos graves** (rompe el build).
- **Hooks de commit** (`.githooks/post-commit`) avisan «falta `tsx`/`DATABASE_URL`»: no es fallo del cambio.
- **Un tool `Edit` sobre archivos con cambios ajenos:** relee el archivo actual (hubo anclas viejas).
- **Tu rama de control** (`codex/control-x023`) se quedó atrasada y con conflicto varias veces: resuélvelo con `git merge origin/main` conservando **las dos** entradas; ábrela como PR de control.

## 5. Receta de verificación (para que verifiques tú, sin Claude)
1. Worktree fuera del repo: `git worktree add /private/tmp/<nombre> -b <rama> origin/main`. `node_modules`: `cp -cR` desde otro worktree que ya los tenga; `DATABASE_URL=postgresql://x:x@localhost:1/x npx prisma generate --schema packages/db/prisma/schema.prisma`.
2. `cd apps/web && npx tsc --noEmit && npx tsx --test src/lib/*.test.ts` (hoy **176/176**); `npm run build` desde `apps/web`.
3. **Base desechable** Postgres 16 local en el puerto 54329 (`LC_ALL=en_US.UTF-8` al inicializar), base `lote2`, `db push` con el esquema de `main`; `apps/web/.env.local` con `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `CREDENTIALS_ENCRYPTION_KEY` (**valores de prueba generados por ti, nunca de producción**). Crea usuarios de prueba: administrador, normal, uno con módulo deshabilitado como objeto, uno con array histórico, uno con JSON roto, uno con prueba vencida; asígnales una contraseña de prueba con `bcryptjs`.
4. Servidor: `npx next dev -p <puerto>`; simula hosts con `curl -H 'Host: redes.lasolucionweb.com'`; `DIA_CERO=on` para probar cookies/retorno. Mide el bloqueo de la prueba vencida con el texto «Código QR para conversar con Milton por WhatsApp» (pantalla de bloqueo). **Espera 30 s** tras cambiar un interruptor.
5. **Producción: solo lectura:** `bash scripts/smoke-production.sh` debe terminar «Smoke test OK» (9 comprobaciones).
6. Si tu sandbox no ejecuta nada de esto, usa `gh pr checks <N>` (build de Vercel) y **pide a Milton, en una frase, permiso de ejecución completo**.

## 6. Lo que NO está hecho / está abierto (la lista viva está en el prompt §4)
Verificar #412 (build, pantalla, redirección real); permisos de Redes al **crear** cuentas; manual de usuario; traspaso v3; guion del Día Cero en `.html`; decidir #368; aparcados #393, #401, #402; #372 no fusionar. **Dudas conocidas:** el encabezado global del HUB en Tagcrush (temporal); Mario dijo 104 cuentas (85 con acceso / 19 sin) y nosotros cargamos 106: asunto de Mario; el router no se ha probado con redirección real entre hosts (se prueba el Día Cero).

## 7. Cómo es un buen cierre de turno contigo como líder
Resume en 5-8 líneas: qué verificaste (con evidencia), qué corregiste, qué queda, y **qué necesita Milton (solo si necesita algo)**. No le pegues listas largas ni opciones; pregunta una cosa. Registra cada paso real en el control. Si te quedas sin uso, deja **un PR de control con el estado exacto** como hice yo (C-036).

— Claude (líder de implementación hasta el 2026-10-02). Gracias por seguir: el proyecto queda en buenas manos.
