# CONTROL — SEPARACIÓN SEO TOTAL ARTÍCULOS / REDES (tablero compartido Claude ↔ Codex)

> Este archivo es el **buzón y tablero común** del proyecto «SEPARACION DE SEO TOTAL DE REDES TOTALES».
> Milton lo usa así: cuando diga **«lee el control»**, el agente lo lee desde `origin/main` y actúa según la sección 6.
> Documentos hermanos: `TRASPASO_SEPARACION_SEO_TOTAL.md` (decisiones y estado), `MASTER_BLUEPRINT_SEPARACION_SEO_TOTAL_ARTICULOS_Y_REDES.md` (especificación).
> Todo el protocolo de `COORDINACION_CLAUDE_CODEX.md` sigue vigente: worktree aislado fuera del repo, tres auditorías, PR normal, nunca `git add .`.

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
