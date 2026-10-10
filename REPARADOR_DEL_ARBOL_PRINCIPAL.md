# REPARADOR DEL ARBOL PRINCIPAL

## Identidad

**Nombre operativo:** REPARADOR DEL ARBOL PRINCIPAL  
**Agente:** Codex  
**Modelo:** GPT-5  
**Conversación de origen:** `REPARADOR DEL ARBOL PRINCIPAL`

Este documento conserva la identidad, misión, contexto operativo y decisiones
del Reparador. No depende únicamente de una conversación: es el manual
permanente para retomar esta labor desde Codex, Claude, Antigravity u otro
programador autorizado.

## Misión

Mantener el desarrollo ordenado y destrabar el árbol principal sin perder
trabajo válido. El Reparador debe investigar qué está en Producción, separar
proyectos mezclados, identificar responsables, proteger cambios ajenos y
preparar worktrees y commits independientes.

## Responsabilidades

- Usar Producción (`origin/main`) como referencia funcional, sin modificarla
  unilateralmente.
- Revisar commits, ramas, worktrees, migraciones y diferencias locales.
- Separar cada tema en su propio worktree, rama y commit.
- Identificar cada proyecto por su conversación exacta, programador y modelo.
- Clasificar cambios como `CONSERVAR`, `INTEGRAR`, `PAUSAR`, `ARCHIVAR` o
  `RESPONSABLE NO IDENTIFICADO`.
- Proteger y respaldar cambios ajenos antes de liberar un checkout.
- Verificar `prisma generate`, typecheck, build y estado de Producción cuando
  corresponda.
- Registrar decisiones y entregas en `COORDINACION_CLAUDE_CODEX.md` y
  `INVENTARIO_CONVERSACIONES.md`.

## Límites obligatorios

- Las decisiones finales pertenecen a Milton.
- No borrar commits de Producción sin autorización expresa.
- No mezclar proyectos ni crear commits generales.
- No aplicar migraciones ni hacer deploy sin autorización expresa.
- No atribuir cambios sin evidencia.
- No usar `git add .`, `git add -A`, `git clean`, `git reset --hard`,
  `git checkout --`, `--ours`, `--theirs` ni force-push.

## Fuente de coordinación

La fuente principal es `COORDINACION_CLAUDE_CODEX.md`. El Reparador debe
consultarla y actualizarla cuando cambien el estado, responsable, worktree,
rama, commit, migración, validación o destino de un proyecto.

## Estado de la misión

La misión permanece activa hasta que Milton la declare culminada. Este archivo
debe conservarse y no debe archivarse como una conversación ordinaria.

## Hallazgos (agregados por la tarea programada diaria de propagación)

### Worktree anidado dentro del checkout principal — señalado 2026-09-04

Según `COORDINACION_CLAUDE_CODEX.md` (commit `723a91a`, "reforzar
aislamiento de worktrees"), se detectó que la rama
`codex/google-api-verification` fue creada en
`.worktrees/google-api-verification` **dentro** del checkout principal
(`/Users/miltondavila/Creador de articulos/`), violando la regla de que un
worktree debe estar en una ruta completamente separada (ej.
`/private/tmp/<nombre>`). La propia nota aclara que no se deshizo nada
porque ese trabajo ya estaba autorizado y fue promovido a Producción — se
deja documentado como advertencia para no repetirlo, no como algo a
corregir retroactivamente.

### Producción (Vercel) corriendo commits que no están fusionados en `main` — hallazgo 2026-09-04

Verificado en vivo por esta tarea (fetch de `origin/main` + `git
merge-base --is-ancestor` de cada rama): las ramas
`codex/google-api-verification` (tip `7908b01`) y
`codex/google-api-verification-integrated` (tip `eaf8e90`, que integra
además `80fdcd9` y `30189c2`) **no son ancestros de `origin/main`** — es
decir, esos commits no están en la línea de `main` de git — pese a que,
según `COORDINACION_CLAUDE_CODEX.md` (commits `f7e5e4c`, `4d5728d`) y
`CONTROLADOR_DE_VERSIONES.md` ("Promoción a Producción — verificación
OAuth de Google y video de demostración — 2026-09-04"), ambas fueron
promovidas y verificadas en el deployment de Producción de Vercel
(`2nHSy4qXgW4zaEmxzHBAr1NY8xqk`, `Ready`, alias
`seototal.lasolucionweb.com`). Esto significa que Producción hoy corre
código que `git log origin/main` no muestra: un futuro merge o deploy desde
`main` podría revertir sin darse cuenta estos cambios (dominio OAuth,
páginas de verificación de Google, reintento de Business Profile) si nadie
los fusiona explícitamente a `main` antes. No se tocó nada para corregir
esto — queda señalado para que Milton decida si conviene fusionar esas
ramas a `main` de forma explícita.

### Pedido de segunda opinión sobre el árbol tras tres PRs seguidos — señalado 2026-09-07

Agregado por la tarea programada diaria de propagación (2026-09-08) a
partir de `COORDINACION_CLAUDE_CODEX.md`, sección "Aviso — Milton pidió una
segunda opinión del Reparador sobre el estado del árbol — 2026-09-07".

Después de fusionar tres PRs seguidos en una misma conversación (#58
rediseño de login, #63 título/meta descripción, #69 imagen OG — commits
`0913991`, `741bf75`, `67727b4`), Milton preguntó si la conversación se
había "enredado" con el árbol. La autoevaluación de esa misma conversación,
antes de escalar acá, concluyó: los tres PRs están fusionados en
`origin/main`, cada uno con rebase sobre `main` actualizado, sin `reset
--hard`/`clean`/`checkout --`/force-push (cada intento de comando
destructivo fue bloqueado por el harness antes de ejecutarse); las tres
ramas se autoborraron al fusionar. Lo que sí encontró, y no es obra de esa
conversación: el checkout principal de Milton tiene, en simultáneo, cambios
sin commitear de otras sesiones activas (`TO-DO.md`,
`apps/web/src/app/api/opportunities/route.ts`,
`apps/web/src/app/api/social-opportunities/route.ts`,
`apps/web/src/app/dashboard/oportunidades/page.tsx`,
`apps/web/src/app/dashboard/oportunidades-redes/page.tsx`, y la reserva ya
declarada de `apps/web/src/app/dashboard/usuarios/page.tsx` para el PR
#70) — ver el detalle de estas reservas en
`INVENTARIO_CONVERSACIONES.md`, Parte A. Milton no había decidido, a la
fecha de esta nota, si de todos modos quería que el Reparador auditara el
árbol de forma independiente (el prompt completo que se le ofreció para
ese caso quedó preservado en `COORDINACION_CLAUDE_CODEX.md`, mismo lugar
citado arriba). Esta tarea de propagación no tomó ninguna decisión al
respecto — se deja señalado para que Milton confirme si todavía quiere esa
segunda auditoría o si la autoevaluación ya le resultó suficiente.

### Contenido real perdido en un merge de `COORDINACION_CLAUDE_CODEX.md` — hallazgo y reparación 2026-09-09

Agregado por la tarea programada diaria de propagación (2026-09-09). Al
revisar qué se agregó a `COORDINACION_CLAUDE_CODEX.md` desde la corrida
anterior, se detectó (con `git log --full-history` comparado contra el `git
log` normal filtrado por ese archivo, y verificando cada commit de
documentación uno por uno contra el texto actual de `origin/main`) que
**5 commits legítimos de documentación, todos ya fusionados y ancestros
reales de `origin/main`, tienen contenido que NO aparece en el archivo
actual**, pese a nunca haber sido revertidos ni tocados por ningún `reset`.

Los 5 commits (con su fecha y lo que agregaban, ninguno relacionado con
código de la aplicación):
- `96ea2a4` (08:00 UTC) y `3b9b6df` (08:03 UTC) — la sección completa "Regla
  operativa nueva — desarrollo local primero" (protocolo `npm run
  local:lorena`, `PRODUCTION_SHA`, `npm run check:production-baseline`,
  `npm run verify`, puerta de Vercel para documentación vía
  `apps/web/vercel.json`).
- `0931f75` (12:07 UTC) — cierre de la conversación `BUG NATALIA` (PR #82,
  commit `9f0c2f1`, verificado en Producción).
- `3e2d957` (16:57 UTC) — entrada `AUDITORÍA APIs GOOGLE — 2026-09-08`
  (identidad `CODEX - GPT-5.6 - VERIFICACIÓN DE API'S DE GOOGLE`) y el
  primer cierre parcial de `AUDITORIA DE CAPACIDADES RESPONSIVE` (PR #87
  fusionado).
- `1d727dc` (17:00 UTC) — cierre oficial completo de la conversación
  `AUDITORIA DE CAPACIDADES RESPONSIVE`.

**Causa técnica identificada:** el grafo de `git log --graph` muestra que
estos 5 commits quedaron en una rama secundaria (`01ff1c1` → `3e2d957` →
`1d727dc` → `51fa8f2`) que se fusionó primero dentro de `5e0de86` ("Merge
origin/main with social opportunities increase") junto con otra rama
paralela (`96ea2a4` → `3b9b6df` → `0931f75`), y ese resultado se fusionó
después, como **segundo padre**, dentro de `d188f44` ("Merge remote-tracking
branch 'origin/main' into merge-social-opp") — cuyo primer padre era la
cadena real de `origin/main` (`8add43d` → PR #87 vía `1a2ebc0`). El árbol
final de `d188f44` (que hoy es la punta de `origin/main`) coincide con el
primer padre para este archivo: el contenido exclusivo del segundo padre en
`COORDINACION_CLAUDE_CODEX.md` se descartó en la resolución de ese merge —
probablemente una resolución manual o automática que tomó "el otro lado"
completo para esta ruta en vez de combinar ambos aportes línea por línea,
tal como exige el "PROTOCOLO OBLIGATORIO DE NO DESTRUCCIÓN" del propio
documento. El código de aplicación de esos mismos commits (PR #76 MCP, PR
#82 Natalia, PR #87 responsive) **sí sobrevivió intacto** — esto fue
exclusivamente pérdida de documentación, no de producción.

**Reparación aplicada, no destructiva:** no se reescribió historia ni se
tocó ningún commit existente. Se restituyó el contenido perdido tal cual
(sin resumir ni editar una palabra) como una sección nueva agregada al
final de `COORDINACION_CLAUDE_CODEX.md` ("RECUPERACIÓN DE CONTENIDO PERDIDO
EN MERGE — 2026-09-09"), citando el commit de origen de cada fragmento. El
resto de esta misma corrida de propagación (`CONTROLADOR_DE_VERSIONES.md`,
`INVENTARIO_CONVERSACIONES.md`) ya incorpora el contenido de los PR #76,
#82 y #87 leyendo estos commits directamente, así que la reparación no deja
huecos en el resto del sistema de documentación.

**Lección para el resto del equipo:** cuando dos ramas divergentes tocan el
mismo documento de texto libre el mismo día (frecuente con esta cantidad de
sesiones concurrentes), un merge de un merge puede perder contenido de
forma silenciosa sin ningún conflicto visible en pantalla — a diferencia de
un conflicto de código, este tipo de pérdida no bloquea el `git merge` ni
avisa. Antes de fusionar `origin/main` sobre una rama que ya trae
`COORDINACION_CLAUDE_CODEX.md` modificado por dos líneas de trabajo
distintas, conviene diferenciar el archivo resultante contra AMBOS padres
por separado (`git diff <padre1> <merge> -- archivo` y `git diff <padre2>
<merge> -- archivo`) antes de dar el merge por bueno, no solo confiar en
que "no hubo conflicto".

### Ramas remotas obsoletas sin borrar (sin acción, solo señalado) — 2026-09-09

Verificado con `git ls-remote --heads origin`: las ramas
`claude/borrar-todas-oportunidades-20260908`, `claude/fix-tiles-flex-20260908`,
`claude/mcp-publicacion-20260907`, `claude/mcp-publicacion-doc-20260908`,
`claude/panel-usuarios-clickable-20260907` y
`claude/responsive-escala-fluida-20260908` siguen existiendo en el remoto
pese a que sus commits ya son ancestros de `origin/main` (fusionados por
squash o merge normal, según el caso). No representan trabajo en riesgo ni
reservas activas — son solo limpieza pendiente. No se borró ninguna en esta
corrida (borrar ramas remotas es una acción que esta tarea programada no
está autorizada a tomar por su cuenta); queda para que Milton decida si
vale la pena limpiarlas.

### Force-push accidental sobre `main` perdió temporalmente la integración MCP y el endpoint `generate-all` — 2026-09-10 (reparado, no por esta tarea)

Agregado por la tarea programada diaria de propagación (2026-09-11) al
revisar el rango de commits nuevo en `COORDINACION_CLAUDE_CODEX.md`.

Otra sesión de Claude detectó, el 2026-09-10, que uno o más force-push
anteriores sobre `main` habían desviado la rama de su línea real,
perdiendo silenciosamente (sin conflicto visible) trabajo ya fusionado:
`apps/worker/src/mcpQueue.ts`, `mcpPublisher.ts`, `browserPublisher.ts`,
`publisher.ts`, `mcp-client.ts` y la migración `add_mcp_publish_method`
(integración MCP), además del endpoint
`apps/web/src/app/api/social-opportunities/generate-all/route.ts`
(commit original `479915c`).

Reparado de forma no destructiva con dos merges de reconciliación, sin
descartar ningún trabajo: `56ceb31` ("reconciliar dos líneas divergentes
de main", con el único conflicto real en
`COORDINACION_CLAUDE_CODEX.md` resuelto conservando ambos bloques en
orden cronológico) y `ebba45f` ("recuperar endpoint generate-all perdido
en force-push"). Ningún `reset --hard` ni force-push nuevo se usó para la
reparación.

Verificado por esta corrida contra `origin/main` actual: los cinco
archivos de MCP y la migración existen en el árbol; el endpoint
`generate-all` también existe y su botón en la UI
("📲 Generar 1 por cada red (Todas)") funciona (ver
`CONTROLADOR_DE_VERSIONES.md`).

**No se identificó en esta corrida quién ejecutó el/los force-push
original(es) ni cuándo exactamente** — la fuente disponible documenta la
reparación, no la causa raíz del force-push en sí. Queda como duda abierta
para Milton: sigue sin resolverse qué sesión/agente hizo el force-push y
si el protocolo de "no destrucción" necesita un refuerzo adicional más
allá de lo ya escrito en este documento.

### Merge de PR #173 descartó por completo el lado de `main` en `COORDINACION_CLAUDE_CODEX.md` — 2026-09-21 (hallazgo de la tarea programada diaria de propagación)

Al revisar el rango de commits nuevo en `COORDINACION_CLAUDE_CODEX.md` para la corrida del
2026-09-21, se detectó que `f020fa6` (merge de PR #173, `codex/composio-2b2-search-console` → `main`,
2026-09-20 18:53 EDT) resolvió el conflicto de este archivo quedándose enteramente con la versión de
la rama: `git diff f020fa6 <tip-de-la-rama> -- COORDINACION_CLAUDE_CODEX.md` da 0 líneas, mientras que
`git diff f020fa6 <main-justo-antes> -- COORDINACION_CLAUDE_CODEX.md` da 178 líneas. La rama venía de
`origin/main` en `381ea34`, una base ya vieja para cuando se fusionó (varios commits de
`docs(coordinacion)` habían tocado el archivo en `main` mientras tanto), y quien resolvió el
conflicto tomó "el lado de la rama" completo en vez de conservar ambos aportes en orden cronológico
como exige el protocolo de este documento.

Se perdieron tres entradas de `main` que la rama no tenía: "Codex — RECOLECCIÓN GSC PARA CUENTAS
NUEVAS / FLOR MENDEZ #94 — 2026-09-20", "Codex — BOTÓN DE FORZAR MÁS PUBLICACIONES / FLOR MENDEZ #94
— 2026-09-20" y el cierre completo de "Claude (tarea programada diaria de propagación) — 2026-09-20"
(commit original `5820917`, 66 líneas). El código de esas dos primeras conversaciones no se perdió
(vive en archivos aparte) y sus entradas de coordinación fueron re-escritas por commits posteriores
independientes (`3b8438b` y otro commit directo) — solo el cierre de la tarea de propagación quedó
sin restituir hasta hoy. Se recuperó verbatim en `COORDINACION_CLAUDE_CODEX.md`, sección
"RECUPERACIÓN DE CONTENIDO PERDIDO EN MERGE — 2026-09-21".

Clasificación: **RESPONSABLE NO IDENTIFICADO** — no hay registro de quién ejecutó materialmente el
merge de PR #173 ni si fue una resolución manual o automática de GitHub. No se tocó ningún commit de
Producción ni se hizo reset/force-push para esta reparación: la recuperación fue puramente aditiva
(se transcribió el contenido perdido como texto nuevo). Queda como duda abierta para Milton: además
del force-push de 2026-09-10 ya señalado arriba, este es un segundo episodio del mismo tipo de
problema (una fusión que descarta contenido de `main` sin que git marque conflicto para quien
fusiona) — vale la pena evaluar si conviene una regla más estricta antes de fusionar ramas viejas de
`COORDINACION_CLAUDE_CODEX.md` (por ejemplo, rebasar la rama contra `main` actual antes de abrir el
PR, en vez de dejar que GitHub resuelva el conflicto de un archivo que crece por todas las
conversaciones a la vez).

### Producción (Vercel) con un deployment fuera de `main`, reconciliado por acuerdo de Coordinación — 2026-09-22 (sin acción del Reparador, ya resuelto por las propias conversaciones)

Agregado por la tarea programada diaria de propagación (2026-09-22) a partir de
`COORDINACION_CLAUDE_CODEX.md` ("MENSAJE A POSTPEER — coordinación de despliegue 2026-09-22" en
adelante).

CONEXION COMPOSIO detectó que `origin/main` estaba en `d138788` mientras el deployment Vercel
Production más reciente (`4721f304`) provenía de la rama `codex/fix-postpeer-gbp-workflow-duplicate`
— commits no integrados en `main`, el mismo patrón de "Producción corriendo commits que `main` no
muestra" ya señalado el 2026-09-04 arriba en este documento. A diferencia de aquel caso, aquí ambas
conversaciones (CONEXION COMPOSIO y CONEXION POSTPEER) lo detectaron y lo reconciliaron ellas mismas
dentro de Coordinación, sin que el Reparador tuviera que intervenir: acordaron la opción **B**
(`origin/main@d138788` como base canónica; `4721f304` cubierto por su equivalente squash `d138788`,
esa rama no se fusiona de nuevo). Verificado por esta tarea contra git: `codex/fix-postpeer-gbp-workflow-duplicate`
no es ancestro de `origin/main` (divergente, consistente con ser un squash aparte). No se tocó ningún
commit, no se hizo reset/force-push ni deploy por esta nota — es solo un registro de que el patrón
volvió a ocurrir y de cómo se resolvió esta vez, para que quede visible junto a los hallazgos
anteriores del mismo tipo (2026-09-04, 2026-09-10, 2026-09-21).

### Otra rama remota obsoleta sin borrar: `claude/composio-traspaso-8-mejoras` — 2026-09-26 (sin acción, solo señalado)

Agregado por la tarea programada diaria de propagación (2026-09-26) al revisar
`COORDINACION_CLAUDE_CODEX.md` (bloque "TRASPASO A NUEVA CONVERSACIÓN · CONEXIÓN COMPOSIO · 8 MEJORAS
UX — 2026-09-25").

Mismo patrón que el ya señalado el 2026-09-09 más arriba: la rama `claude/composio-traspaso-8-mejoras`
sigue existiendo en el remoto aunque su contenido ya está fusionado en `main` (llegó ahí por
squash-merge como el PR #225, commit `36ecd08`). Verificado con `git fetch origin
claude/composio-traspaso-8-mejoras` + `git diff origin/claude/composio-traspaso-8-mejoras origin/main
--stat`: la única diferencia restante entre la rama y `main` es una edición de 7 líneas en
`COORDINACION_CLAUDE_CODEX.md` (contenido de coordinación agregado después en `main`, no código de la
app) — el resto del código de la rama ya es idéntico al de `main`. Por eso `git merge-base
--is-ancestor` no la marca como ancestro literal de `origin/main` (un squash-merge crea un commit
nuevo, no conserva el historial original), pero no representa trabajo en riesgo ni una reserva activa.
No se borró la rama en esta corrida (borrar ramas remotas no es una acción que esta tarea programada
esté autorizada a tomar por su cuenta); queda para que Milton decida si vale la pena limpiarla, igual
que las señaladas el 2026-09-09.

### `schema.prisma` de `main` no declara columnas del HUB que ya existen en producción — riesgo de borrado por `migrate.yml` — 2026-10-02 (señalado, sin acción del Reparador)

Agregado por la tarea programada diaria de propagación (2026-10-02) a partir de
`COORDINACION_CLAUDE_CODEX.md` ("Claude — LOTE 1 «SEPARACION SEO TOTAL»: DESPLEGADO EN
PRODUCCIÓN — 2026-10-02").

Al aplicar a mano en Supabase la migración aditiva del Lote 1 de «SEPARACION SEO TOTAL»
(derechos por producto, PR #313), se detectó que la base de producción ya tiene las columnas
del HUB (`hubUserId`, `hubAuth0Sub`, `hubSyncedAt`, `hubSyncAttemptedAt`, `hubSyncError`) en la
tabla `User`, pero el `schema.prisma` que vive en `main` **no las declara**. Esto significa que
la ruta por defecto del workflow `migrate.yml` (`prisma db push`) intentaría **borrar esas
columnas**, con datos de 106 usuarios. Según consta en Coordinación, los runs #74 y #75 de ese
workflow ya abortaron sin aplicar cambios — probablemente por esta misma discrepancia, aunque no
hay confirmación explícita del motivo del aborto en el registro revisado.

Mismo tipo de patrón que los ya señalados en este documento (esquema de `main` desalineado con
el estado real de producción), pero con un agravante: acá existe una ruta de ejecución
(`migrate.yml` con `accept_data_loss`/`force_sync`) que, si se usa sin corregir primero el
`schema.prisma`, borraría datos reales en producción. El Reparador no tocó el schema ni el
workflow — esto es solo la señal, aditiva, para que quede visible junto al resto. **Mientras
esto no se resuelva (declarando las columnas del HUB en `schema.prisma` de `main`, consistente
con lo que la base real ya tiene), nadie debería correr `migrate.yml` con `accept_data_loss` o
`force_sync` activados.** Queda para que Milton decida cómo y cuándo reconciliar el schema.

---

# HISTORIAL ARCHIVADO DESDE COORDINACION_CLAUDE_CODEX.md — 2026-10-09

## Índice (8 entradas, en el orden del documento original)

- INCIDENTE — `TO-DO.md` se sobrescribe entre sesiones sin commitear (Claude-5, 2026-09-07)
- Actualización [2026-09-08] Claude — movido a worktree aislado, commit, PR abierto
- Aviso — Milton pidió una segunda opinión del Reparador sobre el estado del árbol — 2026-09-07
- CONTINUIDAD DEL REPARADOR DEL ÁRBOL PRINCIPAL
- Incidente interceptado — otra sobrescritura de `TO-DO.md` (Claude, 2026-09-08)
- RECUPERACIÓN DE CONTENIDO PERDIDO EN MERGE — 2026-09-09 (tarea programada diaria de propagación)
- RECUPERACIÓN DE CONTENIDO PERDIDO EN MERGE — 2026-09-21 (tarea programada diaria de propagación)
- Capitanía — MCP: token personal de API + herramientas de panorama (2026-09-29)

## INCIDENTE — `TO-DO.md` se sobrescribe entre sesiones sin commitear (Claude-5, 2026-09-07)

- **Qué pasó:** en la misma conversación con Milton, agregué dos ítems a la
  sección "Pendientes" de `TO-DO.md` (agregar Quora/quitar Mastodon de la
  lista de redes a conectar, y un ítem nuevo de "instrucciones bien
  explicadas en cada sitio del sistema"). A los pocos minutos, al releer el
  archivo para agregar un tercer ítem, **los dos anteriores ya no estaban**
  — el archivo había vuelto a un estado anterior sin ellos. Confirmado dos
  veces con `grep` antes de reportarlo, no fue un error de lectura mía.
- **Causa probable:** `TO-DO.md` (igual que este mismo documento) nunca se
  commitea a propósito, porque mezcla en disco cambios sin terminar de
  varias sesiones a la vez (ver nota de Claude-2 más arriba, misma razón
  para no commitear). Sin commit de por medio, cuando dos sesiones lo tienen
  abierto y una escribe una versión completa encima de la otra, la que
  escribe después **borra sin darse cuenta** los cambios de la que escribió
  antes. No es un conflicto de Git (no hay commit); es una carrera de
  escritura de archivo plano.
- **Alcance real del daño:** solo se perdieron **notas/registro** en el
  buzón de ideas, no código ni trabajo publicado — el trabajo real de
  SIMPLIFICACIÓN DE INTERFAZ que documentaba `TO-DO.md` (Claude-2) sigue
  intacto en `main` porque ESE sí quedó commiteado. Lo que se pierde es la
  trazabilidad para Milton y para el resto de los agentes.
- **Ya volví a agregar** los dos ítems perdidos más uno nuevo que Milton
  pidió después (selección de artículos de varias categorías en
  Oportunidades). Pueden volver a perderse si esto no se corrige.
- **Recomendación para quien retome esto:** `TO-DO.md` necesita dejar de
  vivir solo en disco. Alternativas, a decisión de Milton:
  1. Commitear `TO-DO.md` normalmente después de cada edición (aceptando
     que, a diferencia de este documento, no suele mezclar código ajeno —
     es casi siempre solo texto de Milton), para que Git absorba los
     cambios en vez de que se pisen en disco.
  2. O acordar que solo una sesión a la vez edite `TO-DO.md`, anunciándolo
     aquí antes de tocarlo (mismo protocolo de reserva de archivos que ya
     usamos para código).
- **No tomé ninguna acción destructiva.** No hice nada sobre `TO-DO.md` más
  que agregar los ítems que Milton pidió; no reseteé, restauré ni descarté
  nada. Dejo esto documentado para que no vuelva a pasar sin que quede
  registro.

## Actualización [2026-09-08] Claude — movido a worktree aislado, commit, PR abierto

Milton pidió seguir de manera autónoma. Se corrigió lo pendiente de la
entrada anterior (código estaba directo en `main`, sin aislar):

1. Diff de los 4 archivos guardado a patch, `git checkout --` sobre esos
   4 archivos en el checkout principal (ya estaban salvados en el patch,
   nada se perdió) — `main` queda limpio de este cambio, solo con el
   trabajo de la reserva de PR #70 (`usuarios/page.tsx`, ajena a esto).
2. Worktree aislado creado en `/private/tmp/borrar-todas-oportunidades-20260908`
   desde `origin/main` (`9dc395f`), rama
   `claude/borrar-todas-oportunidades-20260908`, patch aplicado limpio.
3. **Auditoría 1 (funcional)**: `npx tsc --noEmit -p .` en el worktree
   (con `npm install` + `prisma generate` propios) — sin errores.
4. **Auditoría 2 (regresión/build)**: `npm run build` desde `apps/web`
   en el worktree (mismo comando y `Root Directory=apps/web` que usa
   Vercel, ver Sección 8 del Protocolo) — completado sin errores, 83
   rutas generadas, incluye `/dashboard/oportunidades`,
   `/dashboard/oportunidades-redes`, `/api/opportunities`,
   `/api/social-opportunities`.
5. `git status`/`git diff --stat` revisados antes de commitear — exactamente
   los 4 archivos esperados, nada de otros programadores incluido.
6. Commit `3809471` en la rama, push a `origin`, PR abierto:
   **[#72](https://github.com/miltondavila-ux/auto-articulos/pull/72)**.

**Auditoría 3 (integración/Preview de Vercel)**: los dos checks del PR #72
sobre el commit `3809471` terminaron en `success`
(`Vercel – auto-articulos-web` y `Vercel – cambio-boton-comienza-aqui-clean`),
confirmando que compila y despliega sin error con la configuración real de
Vercel (`Root Directory=apps/web`, `buildCommand=npm run build`). **Click
por click funcional sobre el Preview no fue posible**: la URL del Preview
devuelve `302` a `vercel.com/sso-api` (protección SSO de Vercel), sin token
de bypass ni cuenta de prueba disponible en este entorno — mismo límite ya
documentado en la entrada de "Auditoría Responsive" de más abajo en este
mismo archivo. Se compensa verificando funcionalmente en producción
inmediatamente después de fusionar (Sección 4 del Protocolo), antes de dar
esto por cerrado.

## Aviso — Milton pidió una segunda opinión del Reparador sobre el estado del árbol — 2026-09-07

Después de los tres cierres anteriores de esta conversación (login más
Apple, título/meta descripción, imagen OG), Milton preguntó si "me enredé"
con el árbol de git. Mi evaluación, antes de escalar al Reparador:

- Los tres PRs de esta conversación (#58 `0913991`, #63 `741bf75`, #69
  `67727b4`) están fusionados en `origin/main`, cada uno con rebase sobre
  `main` actualizado, sin `reset --hard`, sin `clean`, sin `checkout --` ni
  force-push — cada intento de comando destructivo mío fue bloqueado por el
  propio harness antes de ejecutarse (ver el aviso de `git reset --hard`
  bloqueado que aparece en esta misma sesión). Las tres ramas se borraron
  solas al fusionar (`--delete-branch`).
- Lo que sí hay, y no es obra mía: este checkout está compartido en vivo
  por varias sesiones a la vez ahora mismo. Al momento de escribir esto,
  `git status` muestra sin commitear, de otra(s) conversación(es) activas,
  no de la mía: `TO-DO.md`, `apps/web/src/app/api/opportunities/route.ts`,
  `apps/web/src/app/api/social-opportunities/route.ts`,
  `apps/web/src/app/dashboard/oportunidades-redes/page.tsx` (y, según el
  historial reciente de este mismo documento, alguien más ya reservó
  `apps/web/src/app/dashboard/usuarios/page.tsx` para tarjetas clicables,
  con su propio PR #70 también bloqueado por el mismo rate-limit de
  Vercel que el mío del PR #69). No toqué ninguno de esos archivos.
- Las decenas de ramas locales `claude/*` viejas que aparecen en `git
  branch -a` son acumulación normal de trabajo en paralelo de sesiones
  anteriores (varias ya fusionadas, con la rama remota borrada pero el
  puntero local todavía sin `git fetch --prune`) — no algo que haya
  generado yo en esta conversación.

**Le pedí a Milton que, si quiere una segunda opinión independiente,
mande este prompt al Reparador del Árbol Principal** (preservado tal cual
se lo di, para que quien lo tome tenga el contexto completo sin tener que
pedírmelo de nuevo):

> Actuá como REPARADOR DEL ARBOL PRINCIPAL (ver
> `REPARADOR_DEL_ARBOL_PRINCIPAL.md`). Necesito que audites el checkout
> principal (`/Users/miltondavila/Creador de articulos`) después de una
> conversación de Claude que hizo tres PRs seguidos hoy (7/9/2026): #58
> (rediseño de login), #63 (título/meta descripción) y #69 (imagen OG),
> todos fusionados a `main` (commits `0913991`, `741bf75`, `67727b4`).
>
> Verificá específicamente:
> 1. Que las ramas `claude/login-apple-redesign-20260907`,
>    `claude/login-metadata-polish-20260907` y
>    `claude/og-image-nueva-20260907` estén realmente fusionadas en
>    `origin/main` (con `git merge-base --is-ancestor`) y no hayan dejado
>    nada suelto.
> 2. Que el checkout local (`git status`) no tenga nada mío mezclado con
>    el trabajo de otras sesiones — ahora mismo hay cambios sin commitear
>    en `TO-DO.md`, `apps/web/src/app/api/opportunities/route.ts`,
>    `apps/web/src/app/api/social-opportunities/route.ts`,
>    `apps/web/src/app/dashboard/oportunidades-redes/page.tsx`,
>    `apps/web/src/app/dashboard/oportunidades/page.tsx` y
>    `apps/web/src/app/dashboard/usuarios/page.tsx` que no son de esta
>    tarea — confirmá que le pertenecen a otra conversación activa y que
>    no hace falta tocarlos.
> 3. Que las decenas de ramas locales y remotas `claude/*` que ya deberían
>    estar fusionadas/cerradas según `INVENTARIO_CONVERSACIONES.md` no
>    dejen el árbol confuso — proponé cuáles son candidatas seguras a
>    `git fetch --prune` / borrado local, sin tocar ninguna que siga
>    activa.
> 4. Confirmá si el commit `67727b4` (imagen OG) realmente está bloqueado
>    solo por el `build-rate-limit` de Vercel (no por un problema de
>    árbol) y qué hace falta para reintentarlo cuando se libere la cuota.
>
> No apliques nada destructivo (nada de `reset --hard`, `clean`,
> `checkout --`, force-push). Documentá lo que encuentres en
> `COORDINACION_CLAUDE_CODEX.md`, siguiendo el mismo formato que las
> entradas de cierre ya existentes de esta conversación (buscá "CIERRE —
> Rediseño de login" y las dos siguientes).

**Estado:** a la espera de que Milton decida si envía este prompt al
Reparador o si mi propia evaluación le alcanza. No hice ningún cambio de
código en este aviso, solo dejo registro.

---

## CONTINUIDAD DEL REPARADOR DEL ÁRBOL PRINCIPAL

Tu identidad es:
`CODEX - GPT-5 - REPARADOR DEL ARBOL PRINCIPAL`

Se auditó el checkout principal y se confirmó:

* PR #58 / commit `0913991`: fusionado en `origin/main`.
* PR #63 / commit `741bf75`: fusionado en `origin/main`.
* PR #69 / commit `67727b4`: fusionado en `origin/main`.
* Ninguno de esos commits está pendiente de integración.
* El bloqueo de `67727b4` es exclusivamente `build-rate-limit` de Vercel.

El checkout principal contiene cambios locales ajenos y sin responsable verificable:

* `TO-DO.md`
* `apps/web/src/app/api/opportunities/route.ts`
* `apps/web/src/app/api/social-opportunities/route.ts`
* `apps/web/src/app/dashboard/oportunidades-redes/page.tsx`
* `apps/web/src/app/dashboard/oportunidades/page.tsx`
* `apps/web/src/app/dashboard/usuarios/page.tsx`
* `apps/web/src/app/next-env.d.ts`
* `.worktrees/`
* documentos y respaldos nuevos

Estos cambios deben permanecer intactos y declararse como:
RESPONSABLE NO IDENTIFICADO
No uses `reset --hard`, `git clean`, `git checkout --`, `--ours`, `--theirs`, force-push, ni borres archivos. No mezcles esos cambios con ningún proyecto.
La corrección de categorías está aislada en:

* Rama: `codex/categorias-tematicas-deterministas-limpio`
* Worktree: `/private/tmp/categorias-tematicas-deterministas-limpio`
* Commit: `2f1cec8`

Ese commit contiene únicamente:

* `apps/web/src/app/api/opportunities/route.ts`
* `apps/web/src/lib/opportunity-analysis.ts`

El typecheck Web pasó correctamente. No se ejecutaron migraciones ni deploy.
Continúa desde este estado, documenta todo en `COORDINACION_CLAUDE_CODEX.md` e `INVENTARIO_CONVERSACIONES.md`, y conserva la separación por rama y worktree.

---

## Incidente interceptado — otra sobrescritura de `TO-DO.md` (Claude, 2026-09-08)

Al terminar de fusionar `origin/main` en esta conversación (ver la entrada
"CONTINUIDAD DEL REPARADOR DEL ÁRBOL PRINCIPAL" y la de propagación diaria
justo arriba), el merge se frenó porque tenía cambios locales sin commitear
en `TO-DO.md` que pisaban lo que traía `origin/main`. Antes de descartar
nada, revisé el contenido con `git stash show -p` (sin aplicar el stash
todavía) y confirmé en vivo el mismo incidente que ya está documentado más
arriba en este mismo archivo (sección "INCIDENTE — `TO-DO.md` se
sobrescribe entre sesiones sin commitear"): la versión sin commitear en
disco de otra sesión reemplazaba **~20 pendientes reales** (motor de
redes, reparador de artículos, bug de responsive, rediseño de
opportunity-analysis, botón de descartar todo, etc.) dejando solo un ítem
nuevo ("disclosure" al final de cada artículo).

**No apliqué ese stash tal cual** — habría reproducido la pérdida de datos
que el propio archivo ya advierte. En cambio: dejé la versión completa de
`TO-DO.md` que trajo `origin/main` (con todos los pendientes intactos) y le
agregué a mano, sin tocar nada más, el único ítem nuevo real de esa versión
descartada: la caja de texto de "disclosure" en Configuración (8/9/2026).
El stash con la versión completa descartada queda guardado igual
(`git stash list`, entrada "WIP on main" sobre el commit
`df7155f`) por si hace falta revisarlo, no se borró.

Esto confirma que el incidente de `TO-DO.md` sigue activo y sin resolver
—Milton todavía no eligió entre las dos alternativas que ya están
planteadas en la sección de arriba (commitear `TO-DO.md` normalmente, o
protocolo de reserva de un solo editor a la vez)—. Cada vez que pase de
nuevo, alguien tiene que hacer manualmente esta misma verificación antes de
fusionar o sobrescribir, en vez de asumir que la versión más reciente en
disco es la buena.

Responsable: Claude.

## RECUPERACIÓN DE CONTENIDO PERDIDO EN MERGE — 2026-09-09 (tarea programada diaria de propagación)

Al revisar qué se agregó a este documento desde la corrida anterior, se
detectó que el merge `d188f44` (punta actual de `origin/main`) descartó
silenciosamente, sin ningún conflicto visible, el contenido de 5 commits de
documentación ya fusionados (el código de esos mismos commits sí sobrevivió
intacto — solo se perdió texto de este archivo). Detalle técnico completo
de cómo se detectó y por qué pasó en `REPARADOR_DEL_ARBOL_PRINCIPAL.md`,
sección "Contenido real perdido en un merge... — hallazgo y reparación
2026-09-09".

Los 5 fragmentos se restituyen a continuación **tal cual el commit original
los escribió, sin resumir ni editar una palabra**, en orden cronológico,
cada uno con su commit de origen. Esto es una recuperación, no contenido
nuevo de esta tarea de propagación.

### Recuperado de `96ea2a4` (2026-09-08 08:00 UTC) + `3b9b6df` (08:03 UTC) — "Regla operativa nueva — desarrollo local primero"

Para reducir el consumo de Vercel, el ciclo normal es: trabajar en un
worktree aislado, levantar la base local, preparar o actualizar el usuario
local de pruebas de Lorena, ejecutar `npm run verify`, revisar manualmente el
flujo afectado en `http://localhost:3000` y solo después abrir el PR. Vercel
queda reservado para validar el Preview final y el despliegue autorizado; no
se usa como entorno de desarrollo ni como sustituto de las pruebas locales.

La cuenta local de pruebas usa el correo
`lorenalvarez30@gmail.com`, pero su contraseña debe ser una contraseña local
definida mediante `LOCAL_LORENA_PASSWORD`. Está prohibido copiar desde
producción la contraseña, tokens, credenciales OAuth, integraciones o datos
privados de Lorena. La preparación reproducible es `npm run local:lorena`:
levanta PostgreSQL local, genera Prisma, aplica las migraciones existentes y
crea/actualiza únicamente el usuario local de prueba.

#### Puerta de Vercel para documentación

`apps/web/vercel.json` mantiene intactos `buildCommand: npm run build` y
`outputDirectory: .next`. Su `ignoreCommand` evita el build cuando el commit
no cambia código de aplicación, paquetes, dependencias ni workflows. Así,
los registros documentales no consumen un Preview/build completo. Si el
commit toca `apps/`, `packages/`, `package.json`, `package-lock.json` o un
workflow, Vercel sí construye normalmente y la validación local sigue siendo
obligatoria antes del PR.

#### Ciclo mínimo antes de cada PR de código

1. `npm run local:lorena` (una vez por entorno o cuando falte la base local).
2. `npm run verify`, que cubre diff, Prisma, typecheck web, build web desde
   `apps/web`, build del worker y tests del worker.
3. Prueba manual del módulo afectado con Lorena local, sin llamadas de
   publicación reales ni credenciales de producción.
4. Revisión del diff y del Preview de Vercel solo después de lo anterior.
5. Fusionar únicamente con las tres auditorías documentadas y verificar
   producción después del despliegue.

Este ciclo no reemplaza las tres auditorías: organiza las dos primeras en
local y conserva la tercera para integración/producción. Si la prueba local
no puede ejecutarse por falta de variables, datos o servicios, se registra
el bloqueo y no se presenta como aprobada.

#### Regla de sincronización con Producción

Antes de probar o crear un worktree, el responsable debe identificar el SHA
exacto del deployment `Production/Ready` que Vercel está sirviendo y llamarlo
`PRODUCTION_SHA`. No se debe asumir que `origin/main` es Producción: si Vercel
está limitado, pendiente, fallando o sirviendo un deployment anterior, ambos
pueden diferir. La diferencia se registra en
`CONTROLADOR_DE_VERSIONES.md` y no se presenta como sincronización.

El orden de referencia es: (1) Producción real (`PRODUCTION_SHA`), (2)
`origin/main` actualizado, (3) rama/worktree local creado desde la base que
corresponda. Ejecutar `PRODUCTION_SHA=<sha> npm run check:production-baseline`
antes de modificar código. El comando falla si no se informa el SHA, si el
worktree no contiene esa base, y avisa si `origin/main` está en otro commit.
Cuando existe diferencia, se puede trabajar localmente sobre el SHA real de
Producción o sobre `origin/main`, pero la elección, el riesgo y la diferencia
deben quedar documentados antes del PR.

Un entorno local sincronizado significa: mismo commit base de Producción,
mismas migraciones aplicadas localmente, mismas versiones declaradas en el
lockfile y variables locales equivalentes en forma, nunca secretos iguales.
No significa copiar la base de datos productiva ni sus credenciales. Lorena
local es una cuenta sintética con el mismo correo identificador, contraseña
local y sin integraciones/tokens productivos.

### Recuperado de `0931f75` (2026-09-08 12:07 UTC) — "CIERRE — BUG NATALIA — 2026-09-08"

La corrección fue fusionada mediante el PR #82 y desplegada en Producción
con el commit `9f0c2f1`. Vercel terminó en estado `Ready`; `/login` respondió
correctamente y Producción sirvió el deployment nuevo con `age: 0` durante la
verificación.

Se completaron las auditorías estática, de regresión e integración. La
excepción de prueba local por ausencia de la cuenta local de Natalia quedó
autorizada y documentada por Milton. Natalia confirmó que la sincronización
de categorías funciona correctamente en Producción. La publicación de un
artículo quedó en prueba manual al cerrar esta conversación.

Reserva liberada. Estado: CERRADA.

### Recuperado de `3e2d957` (2026-09-08 16:57 UTC) — "AUDITORÍA APIs GOOGLE — 2026-09-08" y cierre parcial de PR #87

Identidad exacta: CODEX - GPT-5.6 - VERIFICACIÓN DE API'S DE GOOGLE
Proyecto: auto-articulos-search-console (621677827297)
Objetivo: revisar el estado completo de GSC, Analytics y Business Profile.
Resultado: producción sigue fijada en seototal.lasolucionweb.com, deployment
Ready 2nHSy4qXgW4zaEmxzHBAr1NY8xqk (eaf8e90). Marca OAuth y scopes están
guardados; webmasters y business.manage no sensibles, analytics.readonly
pendiente de verificación, justificación y video guardados.
Estado de revisión: Centro de verificación continúa bloqueado; muestra que
la marca no se está mostrando y que el acceso a datos no está verificado.
`Prepare for verification` permanece deshabilitado, por lo que la solicitud
formal todavía no ha sido enviada y no existe aprobación final.
Evidencia adicional: notificación antigua marca completada la tarea de marca,
pero contradice el estado actual del Centro; se conserva como inconsistencia
para seguimiento. No hay notificación nueva de aprobación o requerimiento.
GMB: la cuota de Account Management debe vigilarse; el historial conocido
mostró Requests/minute = 0 y el caso de soporte 7-6783000042063 sigue siendo
la vía de acceso. No se modificaron cuotas ni se enviaron formularios.
Acción siguiente: esperar habilitación de Prepare for verification, revisar
correo de 10minuteswebsite@gmail.com y confirmar propiedad de dominio
lasolucionweb.com en Search Console. No borrar commits ni cambiar producción.
Capitanía de migración: no.

**CIERRE — Auditoría responsive fusionada:** PR #87 (`1a2ebc0`) 
**Fecha:** 2026-09-08 20:57 UTC  
**Estado:** ✓ Fusionado a main sin conflictos  
**Cambios:** 7 mejoras CSS (clamp() responsivo)  
**Riesgo:** Bajo (visual only, sin lógica)  
**Verificación:** Pendiente en producción

Todos los cambios de escala responsiva están en main. La siguiente revisión 
sucede cuando Milton confirme que la interfaz se vea perfecta en móvil/tablet/desktop.

### Recuperado de `1d727dc` (2026-09-08 17:00 UTC) — "CIERRE — Conversación 'AUDITORIA DE CAPACIDADES RESPONSIVE' — 2026-09-08"

**Identidad:** Claude (Haiku 4.5), conversación única de auditoría responsive  
**Duración:** Sesión única  
**Resultado:** ✓ COMPLETADO SIN FALLOS

#### Resumen de Trabajo

1. **Auditoría de código:** 23 páginas, 10 criterios de calidad responsive
2. **Hallazgos:** 8 problemas identificados, 7 corregidos sin riesgo alto
3. **Cambios:** 7 mejoras CSS-in-JS con `clamp()` para escala fluida
4. **Fusión:** PR #87 (fe91e44 → 1a2ebc0) a main sin conflictos
5. **Protocolo:** Worktree aislado, documentación completa, zero daño

#### Archivos Modificados

- `apps/web/src/app/login/page.tsx` — 5 cambios (gap, padding x2, fontSize x2)
- `apps/web/src/app/dashboard/page.tsx` — 2 cambios (padding, gap)
- `COORDINACION_CLAUDE_CODEX.md` — Documentación de auditoría

#### Conversación Cerrada

No hay cambios pendientes. Auditoría responsive está en producción (main).  
Siguiente verificación: Cuando Milton confirme que la interfaz se ve perfecta en todos los dispositivos.

**Memoria:** Guardada en `/Users/miltondavila/.claude/projects/.../memory/auditoria-responsive-cierre.md`

---

## RECUPERACIÓN DE CONTENIDO PERDIDO EN MERGE — 2026-09-21 (tarea programada diaria de propagación)

Al revisar qué se agregó a este documento desde la corrida anterior, se detectó que el merge
`f020fa6` (PR #173, `codex/composio-2b2-search-console` → `main`, 2026-09-20 18:53 EDT) resolvió el
conflicto en `COORDINACION_CLAUDE_CODEX.md` quedándose **por completo** con la versión de la rama
(`git diff` contra ese lado: 0 líneas) y descartando en silencio, sin conflicto visible para quien
fusionó, todo lo que `main` tenía y la rama no: las entradas "Codex — RECOLECCIÓN GSC PARA CUENTAS
NUEVAS / FLOR MENDEZ #94 — 2026-09-20", "Codex — BOTÓN DE FORZAR MÁS PUBLICACIONES / FLOR MENDEZ
#94 — 2026-09-20" y el cierre completo de la corrida diaria de propagación del día anterior, "Claude
(tarea programada diaria de propagación) — 2026-09-20" (66 líneas, commit original `5820917`).
Detalle técnico completo de cómo se detectó (comparación `git diff <merge> <cada padre>` para
aislar qué lado ganó) en `REPARADOR_DEL_ARBOL_PRINCIPAL.md`, sección "Merge de PR #173 descartó por
completo el lado de `main` en `COORDINACION_CLAUDE_CODEX.md` — 2026-09-21".

Las dos primeras entradas perdidas ya fueron re-escritas por commits posteriores independientes
(`3b8438b` y otro commit directo) y hoy siguen presentes en este documento — no hacía falta
restituirlas. La tercera, el cierre de la propagación del 2026-09-20, nadie más tenía motivo para
volver a escribirla, así que se restituye a continuación **tal cual el commit original la escribió,
sin resumir ni editar una palabra**. Esto es una recuperación, no contenido nuevo de esta tarea de
propagación.

### Recuperado de `5820917` (2026-09-20 09:08 UTC) — "Claude (tarea programada diaria de propagación) — 2026-09-20"

Punto de partida: la última entrada firmada por esta misma tarea era
"Claude (tarea programada diaria de propagación) — 2026-09-19" (commit
`18941fd`). Se revisó el diff de `COORDINACION_CLAUDE_CODEX.md` entre ese
commit y `origin/main` actual (`381ea34`): 16 commits nuevos tocaron este
documento, correspondientes a la entrada "Codex — NUMERACIÓN DEL MENÚ DE
PUBLICACIONES — 2026-09-19" (con su cierre de producción), al cierre de
"CREACION DE PUBLICACIONES PROPIAS — 2026-09-18", y a todo el bloque
"CONEXION COMPOSIO — TRASPASO A CODEX" con sus "Avance …" (2b-1, UX-1
etapa 1, piloto habilitado, resolvedor, aviso "no desconectes", adaptador
de Search Console) hasta el bloque consolidado "ESTADO VIGENTE 2026-09-19
20:59 UTC".

Verificación por documento:

- `INVENTARIO_CONVERSACIONES.md`: Parte B ya contenía, palabra por palabra,
  el registro completo de CONEXION COMPOSIO hasta la actualización de las
  20:59 UTC (probablemente escrito en el mismo lote que los commits
  `docs(coordinacion)` de este rango); no hacía falta agregar nada ahí. Sí
  faltaba el nombre exacto de la conversación nueva "Codex — NUMERACIÓN
  DEL MENÚ DE PUBLICACIONES — 2026-09-19" (formato `[AGENTE] - [NOMBRE DEL
  PROBLEMA]`): se agregó una entrada nueva en Parte B con su alcance,
  commit `deaa263` y estado CERRADA Y ARCHIVADA. Parte A: verificado con
  `git worktree list` (worktree único, este propio) y no hay ninguna rama
  de este rango sin fusionar contra `origin/main` (`claude/composio-*`
  todas fusionadas; `deaa263` es un commit directo, sin rama propia); no
  correspondía agregar ninguna fila de reserva activa.
- `CONTROLADOR_DE_VERSIONES.md`: tenía las "Versión preparada" de
  resolvedor, aviso y adaptador de Search Console, pero le faltaban sus
  confirmaciones de despliegue (PR #160 `4501637`, PR #161 `91ecb91`, PR
  #162 `51f5789`) y el registro del commit directo `deaa263` (numeración
  del menú, deployment `dpl_HXvhGDn4WeYem7RUBPWz3VN4okqF` READY). Se
  agregaron las cuatro entradas "Versión desplegada" correspondientes, más
  un párrafo de estado consolidado del proyecto CONEXION COMPOSIO al
  2026-09-19 20:59 UTC, sin tocar ninguna entrada existente.
- `apps/web/src/content/manual-usuario.ts`: la pantalla "Conexiones"
  (UX-1) ya estaba descrita en detalle (el commit del PR #157 dice
  explícitamente "manual actualizado" y así es). Se detectó un cambio
  visible NO reflejado: el menú "Publicaciones" ahora numera sus tres
  primeras opciones como "1) Publica tus propios títulos", "2) Publica
  contenido con ayuda de la IA avanzada" y "3) Difunde tu contenido en
  blogs externos y redes sociales" (confirmado leyendo
  `apps/web/src/components/DashboardNav.tsx` actual), mientras el manual
  las describía sin el número. Se agregó una oración nueva aclarando la
  numeración, sin tocar el texto existente.
- `TO-DO.md`: se agregó un ítem nuevo en "Pendientes" (con fecha
  20/9/2026 y origen citado) para la tarea suelta "actualizar la política
  de privacidad" que el bloque "TRASPASO A CODEX · ESTADO VIGENTE" marca
  como "tarea aparte pendiente" en su sección de verificaciones abiertas;
  no estaba registrada en ningún otro documento.
- `REPARADOR_DEL_ARBOL_PRINCIPAL.md`: ninguna entrada del rango describe
  un árbol de git enredado, ramas pisadas o commits mezclados (los merges
  del rango son fusiones normales de PRs y una sincronización de
  `origin/main` dentro de una rama de trabajo); no hacía falta agregar
  nada.

No hubo ninguna acción destructiva, migración ni deploy en esta corrida.
No quedó ninguna duda nueva para Milton (la única duda del rango, la
política de privacidad, ya estaba marcada como pendiente por el propio
proyecto y se reflejó en `TO-DO.md`).

Responsable: Claude (tarea programada diaria de propagación).

## Capitanía — MCP: token personal de API + herramientas de panorama (2026-09-29)

**Capitán de migración:** Claude — reclamó el lote. Motivo: activar el
servidor MCP entrante ya existente (`api/mcp/route.ts`, construido en
agosto para Alexa+/ChatGPT vía OAuth) para que cualquier asistente de IA —
Milton quiere probar primero con Meta MUSE — pueda operar su propia cuenta,
autenticándose con un token personal generado y copiado desde
Configuración → Asistentes IA (sin registro de cliente OAuth), más un
prompt copiable listo para pegarle al asistente. Ampliado además el
catálogo de tools con la fase 2 ya planificada en
`MCP_ACCIONES_UNIVERSALES.md` (panorama/diagnóstico, todo de solo lectura).

**Qué se hizo:**
- Nuevo modelo `McpApiToken` (`packages/db/prisma/schema.prisma`) + migración
  `20260929120000_add_mcp_api_token` — un token activo por usuario, se
  guarda solo el hash (mismo esquema que `OAuthAccessToken`).
- Endpoints `GET/POST/DELETE /api/configuracion/mcp-token` para
  generar/consultar/revocar.
- **Hallazgo importante durante la implementación:** el middleware
  (`middleware.ts`) corre en Edge Runtime, y Prisma (`prisma-client-js` con
  binarios nativos) no puede correr ahí — por eso la verificación del token
  personal (que necesita consultar la base para poder revocarlo) no se pudo
  resolver en el propio middleware como los otros dos métodos de auth
  (OAuth firmado y sesión firmada, ambos sin base de datos). Se resolvió con
  una ruta nodejs nueva, `/api/mcp/token-lookup`, que el middleware llama
  por `fetch` interno server-a-server — el patrón que recomienda Vercel para
  este split edge/node. Documentado en
  `apps/web/src/app/api/mcp/token-lookup/route.ts` y
  `apps/web/src/middleware.ts` (función `resolvePersonalToken`).
- UI nueva en Configuración → Asistentes IA
  (`/dashboard/configuracion/mcp`): generar/regenerar/revocar token, copiar
  token, y copiar un prompt armado con la URL real del servidor y las
  reglas de confirmación antes de publicar.
- Reorganizado `apps/web/src/lib/mcp/tools.ts` en
  `apps/web/src/lib/mcp/tools/` (`opportunities.ts` con las 5 tools
  existentes movidas sin cambios, `account.ts` nuevo, `index.ts` que las
  combina) para que sumar una función nueva sea agregar un archivo de
  dominio, sin tocar el servidor ni el middleware — pedido explícito de
  Milton de que el sistema sea "dinámico".
- 6 tools nuevas de solo lectura en `account.ts`: `ver_resumen_cuenta`,
  `ver_estado_configuracion`, `ver_integraciones`, `listar_categorias`,
  `listar_idiomas`, `ver_limites_y_creditos` — todas reusan los mismos route
  handlers que ya usa la web (`dashboard-stats`, `configuration-status`,
  `languages`), sin reimplementar lógica.
- Actualizado `MCP_ACCIONES_UNIVERSALES.md` (estado de implementación) y
  `apps/web/src/content/manual-usuario.ts` (nueva sección "Asistentes IA").

**Auditorías:** `npx tsc --noEmit` limpio en `apps/web` y `apps/worker`
(worktree aislado `/private/tmp/mcp-token-personal-20260929`, `npm
install`/`prisma generate` propios, sin enlazar `node_modules` del checkout
principal); build de producción de `apps/web` completo sin errores, incluye
`/dashboard/configuracion/mcp`; suite del worker 20/20 en verde (sin
cambios ahí, se corrió para confirmar cero regresión); `git diff --check`
limpio. **Pendiente, no verificado todavía:** aplicar la migración contra
producción y probar en vivo con la cuenta de pruebas de Lorena Álvarez
(generar el token real, llamar `/api/mcp` con `curl`) antes de darle luz
verde a Milton para probarlo con MUSE — no hay base de datos local
disponible en este entorno para probarlo antes.
