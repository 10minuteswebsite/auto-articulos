# PROMPT PARA CODEX — SEPARACIÓN DE SEO TOTAL ARTÍCULOS Y SEO TOTAL REDES

Pega todo lo que sigue, tal cual, en una conversación nueva de Codex abierta en `/Users/miltondavila/Creador de articulos`.

---

Vas a quedar en **modo espera** para el proyecto «SEPARACION DE SEO TOTAL DE REDES TOTALES». Todavía NO ejecutes nada.

**Ahora, solo esto:**
1. Lee `TRASPASO_SEPARACION_SEO_TOTAL.md` (raíz del repo) completo. Es tu punto de entrada.
2. Lee `MASTER_BLUEPRINT_SEPARACION_SEO_TOTAL_ARTICULOS_Y_REDES.md` completo. Es la especificación.
3. Del archivo `COORDINACION_CLAUDE_CODEX.md` (pesa ~650 KB, **no lo leas entero**) lee únicamente: «PROTOCOLO OBLIGATORIO DE NO DESTRUCCIÓN», «METODOLOGÍA DE TRABAJO EN PARALELO Y CAPITÁN DE ARCHIVO», «INCIDENTE CRÍTICO Y PROTOCOLO OBLIGATORIO» (schema + migración) y la «ADVERTENCIA CRÍTICA SOBRE VERCEL». Obedécelas ciegamente, sin omitir ninguna.
4. Responde únicamente con: (a) un resumen de 8 líneas de lo que entendiste, (b) las 5 reglas que más te preocupa romper, (c) la frase «Listo, esperando "toma el control".» No modifiques archivos, no crees ramas, no hagas commit, no toques producción.

**Cuando Milton diga «toma el control», haz esto, en orden:**
1. `git status --short` y `git log -5 --oneline` en el checkout principal (solo lectura). **No toques los cambios ajenos sin commitear** (`COORDINACION_CLAUDE_CODEX.md`, `.worktrees/`, `docs/`).
2. Abre la **bitácora** (sección 8) y la **tabla de estado** (sección 5) de `TRASPASO_SEPARACION_SEO_TOTAL.md`: ahí está hasta dónde llegó Claude. Continúa desde ese punto exacto; no repitas lotes ya cerrados ni reabras decisiones de la sección 2.
3. Si la tabla dice que el Lote 0 (Fase 0) está pendiente, tu primera tarea es **entregar la Fase 0** para que Milton la apruebe: arquitectura, stack, modelo de datos, flujos, mapa de navegación, estructura de carpetas, roadmap, riesgos y mejoras, más el inventario de callbacks OAuth por proveedor (para que Milton los registre ya), el algoritmo de contraseñas, el plan de DNS/certificados y el guion del corte con reversa. **No escribas código hasta que Milton apruebe la Fase 0.**
4. Para cualquier lote de código: crea un worktree aislado **fuera** del repo (p. ej. `/private/tmp/separacion-seo-total-loteN`), nunca anidado en `.worktrees/`; reclama capitanía con `bash scripts/migration-coordinator.sh claim "Codex" "motivo"`; reserva tus archivos en el documento de coordinación; schema y migración en el mismo commit; nunca `git add .` ni `-A`.
5. Antes de producción: tres auditorías independientes documentadas, build desde el mismo directorio que usa Vercel, y la declaración «Subiré a producción de acuerdo al Protocolo de No Destrucción.» Entrega por PR normal.
6. Al cerrar cada paso: actualiza la bitácora y la tabla de estado del traspaso, libera la capitanía y los archivos, y actualiza `manual-usuario.ts` si hubo cambio visible.

**Reglas que no puedes olvidar:**
- Hoy **nada** le quita autoridad al login actual; el corte lo decide Milton.
- No redirigir todo el dominio viejo al HUB: rompe callbacks de Google/Bing/Analytics y el servidor MCP (Alexa/Claude). Ver blueprint 9.5.
- Los derechos se leen de la base en cada petición, nunca del token. El worker también debe hacerlos cumplir.
- Tagcrush es marca blanca: nada visible que diga «10minutesWebsite».
- Ante cualquier contradicción o duda sobre autoridad del login, **detente y avisa a Milton**.
