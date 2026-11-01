# MASTER BLUEPRINT — Historial forense de Artículos

Estado: PLAN para aprobación. No se ha escrito código. Fecha: 2026-11-01.
Origen: caso INES (cuenta de Inés) — dice que se repiten temas aunque los borra; hoy no hay forma de comprobarlo.

## 1. Propósito
Dar a Milton (y a cada usuario sobre lo suyo) evidencia completa de qué pasó con cada título de Artículos: publicado, fallido, cancelado, en curso, repetido, **descartado/borrado**, y **por qué se creó**. Sin esa evidencia no se puede auditar el algoritmo de selección de temas.

## 2. Reglas críticas (repetir al ejecutar)
1. **No tumbar producción.** Todo cambio de base es ADITIVO (tablas nuevas, `CREATE TABLE IF NOT EXISTS`, sin tocar columnas existentes). La migración se aplica ANTES o junto con el merge (incidente previo: código sin migración tumbó /dashboard).
2. **Tolerancia a fallos:** si la tabla nueva no existe o falla un INSERT, el flujo actual (borrar, publicar) sigue igual. Lecturas y escrituras nuevas van en try/catch, nunca bloquean.
3. **Los históricos que funcionan hoy no se tocan.** Las secciones nuevas van DEBAJO de las existentes.
4. **Producción es la verdad:** verificar en producción con la cuenta de Inés (solo lectura, con autorización de Milton) antes de declarar terminado.
5. Actualizar el manual (`manual-usuario.ts`) en el mismo lote. Texto para el usuario: claro, botones cortos.
6. Marca blanca: Tagcrush no debe mostrar "10minutesWebsite" (revisar textos nuevos).
7. Antes de cualquier push: protocolo del capitán; PR normal (no push directo a main).

## 3. Hallazgo que condiciona el diseño
Al ejecutar una oportunidad se **borran** `OpportunityGroup` y `OpportunityTitle` (rutas `execute`, `execute-all`, `execute-batch`), y con ellas su `rationale`. El `Title` solo conserva `opportunityCreatedAt`. Por eso, para poder explicar el "por qué" meses después, hay que **capturar el razonamiento en el momento de convertir** (Fase 2). Para títulos anteriores, la explicación solo podrá usar el contexto que sí existe (categoría, evidencia cacheada, títulos del sitio) y debe decir con honestidad que el razonamiento original ya no existe.

## 4. Parte A — Históricos forenses (debajo de lo existente)
Ubicación: `apps/web/src/app/dashboard/historial/page.tsx`, dentro de `HistorialEjecuciones`, debajo de "Artículos publicados" y las dos secciones actuales. Siempre visibles aunque vacías ("0"), cada una colapsable.

| Sección | Fuente | Columnas mínimas |
|---|---|---|
| No se pudieron publicar | `Title.status=error` (incluye los de ejecuciones que sí publicaron otros) | título, categoría, run, intentos, `errorMessage`, último `TitleEvent`, fechas creado/procesado, reintentar |
| Cancelados | `Title.status=cancelled` | título, categoría, run, fechas, quién/cuándo |
| En curso o en cola | `pending`/`processing` | título, run, intentos, desde cuándo |
| Descartados y borrados | tabla nueva (Parte B) | título, categoría, motivo/origen (descartar título, descartar categoría, descartar todo, borrar historial), fecha, de qué oportunidad venía |
| Temas propuestos | `TitleGenerationRequest` | día, slot, categoría, entradas del usuario, títulos ofrecidos |
| Línea de tiempo por título | `TitleEvent` completo | todos los eventos, no solo el último |

Requisitos:
- Más allá de 20 ejecuciones: paginación/“ver más” en `/api/runs` (hoy `take: 20`), sin romper el contrato actual de `GET /api/runs`; endpoint nuevo `GET /api/historial/forense?seccion=&cursor=` para no cargar la respuesta existente.
- Exportar a CSV cada tabla (ingeniería forense). Todas las columnas, incluidos ids.
- Respetar el filtro por `selectedSiteDomain` igual que hoy; agregar interruptor "todos mis sitios".
- Botón «Borrar historial» actual: no debe destruir la evidencia; opción A (recomendada): sigue borrando ejecuciones pero antes copia sus títulos fallidos/cancelados a la tabla de archivo (Parte B).
- Vista admin (Milton): poder ver estas secciones de otro usuario con "Acceder como" (solo lectura).

## 5. Parte B — Tabla de descartados/borrados (sin tumbar producción)
Tabla nueva, solo inserciones, nunca se edita:

`ArticleTitleDiscard`
- `id`, `userId`, `siteDomain`, `categoryId?`, `categoryName`
- `titleText`, `titleKey` (normalizado, para detectar repetición)
- `source`: `opportunity_title` | `opportunity_group` | `opportunity_all` | `run_deleted` | `title_cancelled`
- `opportunityRationale?`, `groupRationale?`, `impressions?`, `clicks?` (lo que se sabía al descartar)
- `originOpportunityCreatedAt?`, `discardedAt`, `actor` (user/admin/mcp)
- índices: `(userId, discardedAt)`, `(userId, titleKey)`

Puntos de captura (cada uno: INSERT en try/catch ANTES del delete; si falla, se sigue):
- `api/opportunities/titles/[id]` DELETE · `api/opportunities/groups/[id]` DELETE · `api/opportunities` DELETE (todo)
- `api/runs` DELETE (borrar historial): copiar títulos error/cancelled
- herramienta MCP de descartar (`lib/mcp/tools/actions.ts`) pasa por las mismas rutas.

Despliegue seguro (orden obligatorio):
1. Script SQL idempotente (`CREATE TABLE IF NOT EXISTS` + índices). Revisarlo Milton, aplicar vía el procedimiento de migración del repo (el clasificador bloquea SQL directo a producción).
2. Verificar la tabla existe en producción.
3. Recién entonces fusionar el código. El código además detecta si la tabla falta y se comporta como hoy.
4. Rollback: revertir el PR; la tabla queda inerte (no se borra).
Limitación a decir al usuario: solo registra desde la fecha de despliegue; lo ya borrado no se recupera.

## 6. Parte C — Explicación bajo demanda («¿Por qué estos títulos?»)
Reglas:
- **Solo corre cuando el usuario la pide** (botón por ejecución/lote en Historial). Nunca automático.
- Salida: **máximo dos párrafos**, resumen ejecutivo en español claro: (1) de dónde salió la información (GSC, GA4, Bing, historial del sitio, entradas del usuario, IA) y por qué se tomó la decisión; (2) cómo se evitó la canibalización/repetición (comparación contra títulos del sitio `SiteArticleTitle`, publicados y descartados) y qué límites tiene.
- **Se guarda con fecha de solicitud** y no se reescribe: nueva solicitud = nueva fila.
- Honestidad: no inventar. Si el razonamiento original ya no existe (títulos previos a la Fase 2), el texto lo dice y explica solo con lo verificable.

Tabla nueva `TitleExplanation`: `id`, `userId`, `runId`, `titleIds[]`, `requestedAt`, `summary` (≤2 párrafos), `evidenceUsed Json` (qué fuentes y datos se pasaron al modelo, para auditar), `model`, `status` (ok/error), `errorMessage?`. Índice `(userId, runId, requestedAt)`.

Entrada del modelo (armada por código, no por el usuario): títulos del lote, categoría, `rationale` capturado (Fase 2) o aviso de que no existe, evidencia cacheada (`OpportunityEvidenceCache`), resultado de la guardia anti-canibalización (títulos del sitio más parecidos y su puntaje), `TitleGenerationRequest.inputs` si vino de Publicar, historial de descartados del mismo usuario.

Endpoints: `POST /api/historial/explicacion` (crea), `GET` (lista las guardadas). Control de costo: tope por usuario y día; modelo según configuración existente (no cambiar de modelo sin investigación — regla vigente de Milton).

## 7. Fase 2 — Capturar el "por qué" al convertir
Al ejecutar una oportunidad (`execute`, `execute-all`, `execute-batch`), antes de borrarla, guardar su `rationale`, impresiones/clics y puntaje de canibalización en el `Title` o en una tabla aditiva `TitleOrigin` (`titleId`, `groupRationale`, `titleRationale`, `evidenceSnapshot Json`, `guardResult Json`). Misma regla: try/catch, aditivo, migración primero.

## 8. Fase 0 obligatoria (antes de código)
Entregar para aprobación: arquitectura, SQL de migración, flujos, mapa de navegación (qué sección dónde), estructura de archivos tocados, roadmap, riesgos, mejoras. **No se escribe código hasta aprobar.** (Este documento es el borrador de esa entrega.)

## 9. Roadmap
1. **Fase 1 (sin migración, riesgo bajo):** secciones de errores, cancelados, en curso, temas propuestos, línea de tiempo, paginación, CSV.
2. **Fase 2 (migración):** `ArticleTitleDiscard` + capturas + `TitleOrigin`.
3. **Fase 3 (migración):** `TitleExplanation` + botón + endpoint.
4. **Fase 4:** análisis forense del caso Inés con los datos reales (tasa de repetición por `titleKey`, tiempo entre repeticiones, qué fuente las originó) y revisión del algoritmo.
5. Cada fase: auditar, PR, verificar en producción, manual, CURRENT_STATE/CEREBRO/CHECKPOINTS.

## 10. Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Migración tumba producción | Solo aditiva, `IF NOT EXISTS`, aplicada antes del merge, código tolerante |
| INSERT de captura rompe el borrado | try/catch, nunca bloquea |
| Consultas pesadas de Historial | paginación, índices, secciones cargan al abrir |
| Explicación inventa | entrada armada por código, `evidenceUsed` guardado, aviso cuando falta evidencia |
| Costo de IA | solo bajo demanda, tope diario |
| Privacidad | cada usuario solo ve lo suyo; admin solo lectura |
| Datos viejos no existen | decirlo claramente en pantalla |

## 11. Criterios de aceptación
- En la cuenta de Inés se ven todas las secciones, con datos reales o "0".
- Descartar una oportunidad en producción crea una fila en `ArticleTitleDiscard`; si la tabla falta, el descarte funciona igual.
- Pedir explicación genera ≤2 párrafos, queda guardada con fecha, y una segunda solicitud crea otra fila.
- Los históricos existentes se ven y funcionan igual que antes.
- Producción verificada (`/login` 200, `/dashboard` sin error, MCP 401 sin token) antes y después.
- Manual y documentos del proyecto actualizados en el mismo lote.

## 12. Decisiones pendientes de Milton
1. ¿«Borrar historial» archiva errores/cancelados antes de borrar (recomendado) o deja de borrarlos?
2. Tope diario de explicaciones por usuario (propuesta: 5).
3. ¿Las secciones forenses las ve el usuario final o solo admin? (propuesta: el usuario ve lo suyo; CSV solo admin).
4. Autorización para entrar en solo lectura a la cuenta de Inés.
