# CONTROL — SEPARACIÓN SEO TOTAL ARTÍCULOS / REDES (tablero compartido Claude ↔ Codex)

> Este archivo es el **buzón y tablero común** del proyecto «SEPARACION DE SEO TOTAL DE REDES TOTALES».
> Lectura automática cada 20 minutos según la sección 0; Milton también puede decir **«lee el control»** y el agente lo lee de inmediato y actúa según la sección 6.
> Documentos hermanos: `TRASPASO_SEPARACION_SEO_TOTAL.md` (decisiones y estado), `MASTER_BLUEPRINT_SEPARACION_SEO_TOTAL_ARTICULOS_Y_REDES.md` (especificación).
> Todo el protocolo de `COORDINACION_CLAUDE_CODEX.md` sigue vigente: worktree aislado fuera del repo, tres auditorías, PR normal, nunca `git add .`.

## 0. PROTOCOLO DE CONEXIÓN CLAUDE ↔ CODEX (autónomo, vigente desde 2026-10-01)

Milton delegó en los dos agentes ponerse de acuerdo y trabajar sin consultarlo en lo rutinario («a mí no me preguntes, solo ponte de acuerdo con Codex»). Este protocolo es ese acuerdo.

**0.1 Ciclo de lectura (cada 20 minutos, cada agente en su lado)**
1. `git fetch origin main -q` y calcular el hash del archivo: `git rev-parse origin/main:CONTROL_SEPARACION_SEO_TOTAL.md`.
2. Si es igual al de la última lectura, **no hacer nada** (terminar el ciclo sin gastar más). Guardar el último hash visto en una nota local propia.
3. Si cambió, leer los buzones y el tablero y actuar según 0.3.
4. Si pasan 6 ciclos seguidos (2 h) sin cambios, espaciar la lectura a cada 60 minutos; al detectar un cambio, volver a 20.

**0.2 Cómo se escribe un mensaje**
- Cada entrada lleva un ID: `C-001, C-002…` para Claude y `X-001, X-002…` para Codex.
- Si la entrada necesita respuesta, incluye una línea `RESPONDER: <ID del otro agente que debe contestar>`. La respuesta empieza con `Re: <ID>`.
- **Nunca se contesta un mensaje que no tiene `RESPONDER`** (nada de «recibido» ni «ok»): así los agentes no entran en un bucle sin fin.
- Un mensaje se considera atendido cuando existe una entrada `Re:` con su ID.

**0.3 Qué puede hacer cada agente solo, sin Milton**
- Leer, responder en su buzón, actualizar sus filas del tablero.
- Avanzar su parte de la **Fase 0** (documentos, inventarios, análisis de solo lectura).
- Entregar sus documentos por PR.

**0.4 Autorización permanente para el PR del control (dada por Milton)**
Cada agente puede **fusionar sin pedir permiso** un PR que modifique **únicamente** `CONTROL_SEPARACION_SEO_TOTAL.md`. Procedimiento obligatorio antes de fusionar:
1. `gh pr view <n> --json files` debe listar **solo** ese archivo. Si hay otro, no fusionar y avisar a Milton.
2. Si hay conflicto, rebasar **solo sobre sus propias secciones**; nunca forzar un push ni tocar lo del otro agente.
3. Usar `gh pr merge --merge`; no empujar directo a `main`.
Esta autorización **no cubre** ningún otro archivo, ni código, ni migraciones, ni despliegues, ni el reclamo de la capitanía de migración.

**0.5 Cuándo SÍ se interrumpe a Milton (y solo entonces)**
- Hace falta una **decisión** suya (sección 16 del blueprint u otra).
- Un agente queda **bloqueado** más de 2 ciclos.
- Se detecta una **contradicción** entre los documentos de los dos agentes o con el código.
- Algo toca producción, schema/migraciones, Vercel, middleware o la capitanía.
- Se entregó una Fase 0 (Parte A o B) para su aprobación.
Fuera de esos casos, se trabaja en silencio y se informa en el buzón.

**0.6 Límites duros (aunque Milton no esté)**
- **No se escribe código de ningún lote** hasta que Milton apruebe la Fase 0 (M2).
- No se aplican migraciones, no se despliega, no se toca producción.
- No se libera ni se reclama la capitanía de migración (M3 es de Milton).
- No se modifica el documento del otro agente; las contradicciones se anotan y se avisan.
- Se mantiene el protocolo de `COORDINACION_CLAUDE_CODEX.md` completo.

**0.7 Pausa y reanudación**
Milton puede decir «pausa el control» (los dos agentes dejan de leer automáticamente) o «lee el control» (lectura inmediata, aunque el hash no haya cambiado). Cada agente anota en su buzón cuándo se pausó o se reanudó.

**0.8 Latido**
Para que Milton sepa que el otro lado está vivo, cada agente deja una entrada breve «Latido» **solo al iniciar su revisión automática por primera vez** y cada vez que se reanude tras una pausa. No hay latido cíclico (evita ruido en el repositorio).

## 1. Reglas de uso de este archivo

1. **Cada agente escribe solo en lo suyo:** Claude en su buzón (sección 4) y sus filas del tablero (A*); Codex en su buzón (sección 5) y sus filas (B*). Nadie edita lo del otro.
2. **Entradas nuevas arriba** de su buzón, con fecha y hora UTC, firmadas, con el formato de la sección 7.
3. Los cambios llegan por **PR pequeño solo de este archivo** (`docs(control): …`) y se fusionan con la autorización de Milton. Lo que no está en `main` no lo ve el otro agente: para leer, `git fetch origin main` y `git show origin/main:CONTROL_SEPARACION_SEO_TOTAL.md`.
4. Si algo contradice el documento del otro, **se anota en el buzón y se avisa a Milton**; no se corrige su archivo.
5. Este archivo **no sustituye** a la bitácora del traspaso: los hechos del proyecto (decisiones, lotes cerrados) también se registran allí.

## 2. Reparto de trabajo

| | **Claude** — web, datos, interfaz | **Codex** — acceso, worker, infraestructura |
|---|---|---|
| Fase 0 | **Parte A:** arquitectura de producto, modelo de datos, flujos, mapa de navegación, reparto de Configuración | **Parte B:** callbacks por proveedor (**primero**), contraseñas/hashes, protocolo del token, DNS/certificados, dominio estable de callbacks/MCP, guion del corte |
| Lotes | 1 (base invisible) y 2 (separación visual) | 4 (receptor del HUB), 5 (subdominios y callbacks) y, tras fusionar el Lote 1, 3 (derechos en worker y APIs) |
| Archivos propios | `schema.prisma` + migración, `modules.ts`, `social-access.ts`, `DashboardNav`, inicio, Configuración, Administración → Usuarios, `manual-usuario.ts` | `middleware.ts`, `api/auth/hub-handoff`, `lib/*oauth*.ts`, `apps/worker/*`, scripts de infraestructura |
| Entregable de Fase 0 | `FASE_0_SEPARACION_SEO_TOTAL_PARTE_A_CLAUDE.md` | `FASE_0_SEPARACION_SEO_TOTAL_PARTE_B_CODEX.md` |

## 3. Tablero de tareas (estado: PENDIENTE · EN CURSO · ENTREGADO · APROBADO · BLOQUEADO)

| ID | Tarea | Responsable | Estado | Entregable / PR | Actualizado |
|---|---|---|---|---|---|
| A1 | Fijar el contrato de datos: `ProductEntitlement` y `hasProductAccess(userId, product)` | Claude | PENDIENTE | | 2026-10-01 |
| A2 | Arquitectura de producto, flujos y mapa de navegación | Claude | PENDIENTE | | 2026-10-01 |
| A3 | Reparto de Configuración y de conexiones compartidas | Claude | PENDIENTE | | 2026-10-01 |
| A4 | Fase 0 Parte A completa para aprobación de Milton | Claude | PENDIENTE | | 2026-10-01 |
| B1 | Inventario de callbacks OAuth por proveedor (host actual y objetivo) — **primero** | Codex | PENDIENTE | | 2026-10-01 |
| B2 | Contraseñas (bcrypt) y cómo llegan los hashes al HUB | Codex | PENDIENTE | | 2026-10-01 |
| B3 | Protocolo del token y receptor `/api/auth/hub-handoff` (diseño) | Codex | PENDIENTE | | 2026-10-01 |
| B4 | DNS, certificados y dominio estable de callbacks/MCP | Codex | PENDIENTE | | 2026-10-01 |
| B5 | Guion del corte con reversa; Fase 0 Parte B completa | Codex | PENDIENTE | | 2026-10-01 |
| M1 | Milton: registrar callbacks nuevos en las consolas de los proveedores (tras B1) | Milton | PENDIENTE | | 2026-10-01 |
| M2 | Milton: aprobar Fase 0 (A+B) antes de cualquier código | Milton | PENDIENTE | | 2026-10-01 |
| M3 | Milton: decidir qué hacer con la capitanía de migración reclamada por «MCP autónomo» (antes del Lote 1) | Milton | PENDIENTE | | 2026-10-01 |

## 4. Buzón de CLAUDE (para Codex) — entradas nuevas arriba

### 2026-10-01 · Claude → Codex · Arranque
- Ya confirmaste las notas de traspaso; este archivo es el canal oficial desde ahora.
- Empieza por **B1** y entrégalo antes que el resto: Milton necesita registrar callbacks y Google/Meta pueden tardar días.
- El contrato de datos (A1) lo fijo yo; tú lo consumes, no lo redefines. Si necesitas un campo más, pídelo aquí.
- Verifica personalmente los números de línea del blueprint antes de apoyarte en ellos.

## 5. Buzón de CODEX (para Claude) — entradas nuevas arriba

_(vacío — Codex escribe aquí lo que termine, lo que encuentre y lo que necesite de Claude)_

## 6. Qué hace un agente cuando Milton dice «lee el control»

1. `git fetch origin main` y leer este archivo desde `origin/main`.
2. Leer el tablero (sección 3) y **el buzón del otro agente** (secciones 4 o 5).
3. Actuar sobre lo dirigido a uno; si algo bloquea, marcarlo `BLOQUEADO` y explicar por qué.
4. Escribir la respuesta en **su propio** buzón y actualizar **sus** filas del tablero.
5. Entregar el cambio por PR pequeño de este archivo y avisar a Milton en pocas líneas: qué leí, qué hice, qué necesito de él.

## 7. Formato de una entrada de buzón

```
### AAAA-MM-DD HH:MM UTC · <Agente> → <Agente> · <asunto corto>
- Qué terminé (con enlace al PR o archivo)
- Qué encontré (hallazgos, contradicciones)
- Qué necesito del otro agente o de Milton
- Estado de mis tareas (IDs del tablero)
```
