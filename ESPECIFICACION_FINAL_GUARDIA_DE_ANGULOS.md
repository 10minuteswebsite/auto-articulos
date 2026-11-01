# ESPECIFICACIÓN FINAL — Guardia de ángulos (fuente única de verdad)

Fecha: 2026-11-01. Estado: auditada, sin código. **Reemplaza por completo** a `PLAN_GUARDIA_DE_ANGULOS.md` y a las capas de `AUDITORIA_TRIPLE_GUARDIA_DE_ANGULOS.md`, que quedan como historial. Si algo difiere, manda este documento.

## 1. Principio rector (Milton, 2026-11-01)
**Primero, que la persona reciba propuestas para publicar. La guardia ordena, prefiere lo más nuevo y avisa; nunca es una barrera.** Si «no repetir» choca con «entregar contenido», gana entregar contenido, con una nota honesta de parecido.

## 2. Alcance
- **Se aplica solo** a la sugerencia de ideas de títulos con IA: `generateTitlesForUser` (`/api/title-generation`, usada por la web y por el MCP). Fase 4 (después, con mini-auditoría propia): candidatos de CONTENIDO GENERADO POR IA.
- **No se toca nunca:** títulos que la persona escribe o pega (`/api/runs`), reintentos, ejecución de oportunidades, publicación, worker y la guardia exacta que ya existe. Verificado en el código.
- Es para **todos los usuarios**; Inés fue solo la primera evidencia medida.

## 3. Parámetros (un solo valor por concepto)
| Parámetro | Valor |
|---|---|
| Rechazo automático por parecido | ≥ **85 %** |
| Zona del juez de IA | **38 % a 84 %** |
| Pasa limpio | < **38 %** |
| Sin juez disponible: se considera «parecido» a partir de | **60 %** (salvo cuando el vecino más cercano es solo un título del sitio) |
| Peso mínimo de una palabra común | **0,15** |
| Mezcla de parecido simple | **30 %** del parecido cuenta todas las palabras por igual (el 70 % restante es el ponderado por rareza); evita que una sola palabra rara decida |
| Palabras | 3+ letras; siglas de 2–5 mayúsculas; códigos con letras y dígitos (EB-5, H-1B, 401k) enteros; números sueltos ignorados; restos de URL («buyers39») limpios; cortador conservador (plurales, -ing, -ed, -e, doble consonante salvo l/s/z/f) |
| Candidatos que se piden a la IA | **14** para **9** cupos |
| Entrega | máximo **9**, mínimo **5** (si hay al menos 5 candidatos válidos) |
| Juez | 1 llamada agrupada, `gpt-4o-mini`, solo si pasaron < 30 s, tope de 10 s |
| Freno por cuenta | **2** solicitudes seguidas completadas con notas por culpa de la guardia → la siguiente se entrega sin guardia, **24 horas**, y se avisa al administrador |
| Caducidad en la memoria | ofrecidos y nunca publicados: **60 días**; descartados: **90 días**; publicados y del sitio: no caducan |
| Pedido repetido | tema ≥ 60 % parecido a un pedido de los últimos 7 días de la misma categoría: solo aviso |
| Activación (de sombra a activo) | ≥ 48 h y ≥ 20 solicitudes observadas; veto medio ≤ 30 % de los candidatos; ningún lote con menos de 5 títulos; ≤ 20 % de los lotes completados con notas |

## 4. Decisión (orden exacto)
1. **Limpiar:** quitar vacíos y repetidos entre los propios candidatos.
2. **Duplicado exacto = nunca se entrega.** Un candidato idéntico (normalizado) a un título **publicado, del sitio o ya ofrecido** se descarta siempre, igual que hoy (publicarlo fallaría con «ya existe»). El **descartado** exacto no cuenta como duplicado duro: puede entregarse si hace falta, con nota.
3. **Memoria activa** = publicados + del sitio + ofrecidos (< 60 días) + descartados (< 90 días), **del sitio de la categoría**. Regla de año: un candidato con año solo se compara con títulos del mismo año o de los últimos 12 meses.
4. **Parecido** = suma de pesos de palabras compartidas ÷ suma de pesos de todas las palabras (pesos por rareza dentro del propio corpus del sitio).
5. **Veredicto:** < 38 % → **limpio**. 38–84 % → lo decide el **juez**. ≥ 85 % → **parecido**, salvo que el vecino sea solo un título del sitio (puede ser una página de categoría): entonces va al juez. Juez caído, lento o ausente → decide el código con el umbral de 60 %; un vecino solo-del-sitio nunca se marca «parecido» sin juez.
6. **Entrega:** los **limpios** ordenados del más nuevo (parecido más bajo) al menos nuevo, hasta 9. Si hay menos de 5 limpios, se completan con los **parecidos menos parecidos** hasta 5 (o hasta todos los que haya si son menos), **cada uno con una nota**: «Se parece a tu artículo “…”; úsalo si quieres cubrirlo con otro enfoque.» Nunca un parecido antes que un limpio.
7. **Si no queda ningún candidato válido** (la IA devolvió solo duplicados exactos o nada): se conserva el error actual `NO_VALID_TITLES`, sin gastar cupo, tal como hoy.
8. **Si hay muchos parecidos** se añade un aviso de una frase junto a los títulos (no un error): «Este tema ya está muy cubierto en tu sitio; abajo van las mejores opciones. Para otros ángulos, prueba otro tema o escribe tus propios títulos en CONTENIDO PROPIO.»
9. **Modos** (en `SystemSetting`, cambiables desde un endpoint de administrador): `apagado` (defecto; comportamiento y pruebas actuales intactos) · `sombra` (calcula y registra, entrega exactamente lo de hoy) · `activo`.
10. **Cualquier fallo** de la guardia (excepción, tabla ausente, tiempo): se entrega como hoy.

## 5. Piezas de apoyo
- **Mapa de ángulos en el prompt:** los títulos cubiertos se agrupan en código por parecido y se le dice a la IA «ángulos ya cubiertos» y que proponga ángulos nuevos (en vez de 60 títulos sueltos).
- **Pedido repetido:** aviso de una frase en la pantalla y en la respuesta del MCP; la IA recibe la orden de trabajar ángulos no cubiertos. Nunca bloquea.
- **Registro con razón:** tabla aditiva `TitleGuardReport` (RLS, `IF NOT EXISTS`, clave `requestId`) guarda qué se descartó, qué se aceptó con nota y por qué. Alimenta «¿Por qué estos títulos?», que dirá con sinceridad cuáles llevan nota.
- **Administrador:** endpoint para cambiar el modo, sección «Guardia de ángulos» dentro de «Detalle para el administrador» (qué habría rechazado la sombra) y endpoint de línea base (solo conteos, sin datos personales).
- **Cambios de código acotados:** añadir `siteDomain` al `select` de la categoría; `loadAvoid` pasa a leer además `SiteArticleTitle` y descartados y a filtrar por sitio; `MAX_JUDGE_CALLS = 1` aparte de `MAX_AI_CALLS = 2`.

## 6. Pruebas exigidas (antes de cualquier activación)
- Ocho propiedades verificadas con 4.000 casos aleatorios y escenarios fijos (simulador de la auditoría): máximo 9; nunca un duplicado exacto de publicado/sitio/ofrecido; mínimo 5 si hay candidatos; con ≤ 5 candidatos se entregan todos; todo parecido lleva nota; limpios antes que parecidos; modo apagado/sombra idéntico al actual; resultado determinista.
- Conjuntos etiquetados: 18 contrastes legítimos (ninguno ≥ 85 %, máximo 69 %) y 9 repetidos (todos ≥ 38 %); 88 títulos reales; serie homogénea (57 %, antes 31 %).
- **El juez** debe acertar ≥ 90 % de los 27 pares etiquetados y no marcar ninguno de los 18 contrastes como «misma pregunta» antes del modo sombra.
- Pruebas actuales (329) intactas con el modo apagado.

## 7. Fases
1. Módulo puro + pruebas + validación del juez (sin cambiar el comportamiento).
2. Tabla `TitleGuardReport` (la aplica Milton antes de fusionar) + endpoints de administrador + modo **sombra**.
3. Modo **activo** (si cumple la activación) + aviso de pedido repetido + explicación enriquecida.
4. CONTENIDO GENERADO POR IA (mini-auditoría de código antes).
5. Evaluación de 7 días y ajuste de umbrales con datos de todas las cuentas.
6. Vectores (embeddings) solo si la sombra muestra repeticiones que se escapan.

## 8. Recorridos de extremo a extremo (comprobados con el simulador y el código)
| Recorrido | Resultado |
|---|---|
| Cuenta nueva, sin historial | La guardia no hace nada; entrega como hoy. |
| Candidatos limpios | Entrega hasta 9, ordenados del más nuevo. |
| Casi todo parecido y el juez dice «misma pregunta» | Entrega 5, cada uno con nota; aviso de tema muy cubierto. |
| La IA devuelve solo duplicados exactos | Error actual `NO_VALID_TITLES`, sin gastar cupo. |
| Descartado exacto hace 10 días y no hay más | Se entrega con nota (no es duplicado duro). |
| Ofrecido hace 80 días, nunca usado | Ya no cuenta como cubierto. |
| Evento anual (2025 → 2026) | Se permite. |
| Vecino solo del sitio y juez caído | Pasa limpio (puede ser categoría). |
| Dos solicitudes seguidas con notas | La tercera se entrega sin guardia por 24 h y se avisa al administrador. |
| Titulo escrito o pegado por la persona | No pasa por la guardia. |
| Modo apagado o sombra | Idéntico a hoy. |

## 9. Límites honestos
1. El juez de IA aún no está probado con llamadas reales: es condición de la Fase 1.
2. Sinónimos sin palabras en común frente a títulos antiguos fuera de los 20 más recientes pueden escaparse; se mitiga con el mapa de ángulos y se mide en la sombra.
3. Calibrado con pares en inglés y español sintéticos y datos reales en inglés: la línea base de todas las cuentas es obligatoria antes de activar.
4. Dos solicitudes simultáneas de una misma cuenta no se ven entre sí (comportamiento actual).

## 10. Bitácora de la auditoría de consistencia (2026-11-01)
**Ronda 1** (pedida por Milton tras hallar una contradicción con el principio rector):
- *Pasada A, documentos:* 6 contradicciones entre capas viejas del plan y la auditoría (freno de 3 contra 2 solicitudes; error sin títulos contra el principio; umbrales 60/40–59 contra 85/38–84; «lo descartado nunca se vuelve a proponer» contra preferencia con caducidad; juez caído que «rechaza ≥ 60 %» contra mínimo de 5; métrica de aceptación con parecido simple). **Corrección:** esta especificación única y banner «histórico» en los dos archivos anteriores.
- *Pasada B, simulador:* 4.000 casos aleatorios sin fallas en las 8 propiedades, pero el escenario de una serie muy homogénea dejaba pasar como limpio un título casi igual (31 %, por debajo de la zona del juez) porque una sola palabra rara pesaba demasiado. **Corrección:** peso mínimo de palabras comunes de 0,05 a 0,15 (serie homogénea 57 %; contrastes, repetidos y datos reales sin cambios).
- *Pasada C, recorridos:* se detectó que la regla «re-entran los ≥ 85 %» incluía por error a los duplicados idénticos de lo publicado, que fallarían al publicar. **Corrección:** duplicado exacto de publicado/sitio/ofrecido nunca se entrega (regla 2).

**Ronda 2 (tras corregir): tres pasadas sin errores.**
- *A:* búsqueda mecánica de valores viejos en la especificación (3 solicitudes, 50 %, 0,05, 40–59, «nunca se vuelve»): 0 coincidencias; cada parámetro tiene un solo valor; el freno es 2 en la tabla y en el recorrido.
- *B:* 4.000 casos aleatorios con juez nulo, siempre «igual», siempre «distinto», mixto y caído: **0 fallas, 0 resultados vacíos**; escenarios fijos E1–E7 y extras (cuenta nueva, orden de limpios, modo sombra) correctos; E1 ahora entrega 5 con nota.
- *C:* los 11 recorridos del apartado 8 verificados contra el simulador y contra el código (`NO_VALID_TITLES` existente, liberación de cupo en `finally`, `loadAvoid`, selección de la categoría, `maxDuration`).
Simulador y pruebas: `docs/guardia-de-angulos/` (`guard-sim.mjs`, `guard-props.mjs`, `guard-extra.mjs`; se ejecutan con `node`).

## 11. Bitácora de la Fase 1 (2026-11-01)
- **Hecho (sin conectar a ningún flujo):** `lib/angle-guard-core.ts` (detector y decisión, puros), `lib/angle-guard-judge.ts` (prompt, lector de respuesta y llamada con falla segura), `lib/angle-guard-labeled-pairs.ts` (27 pares neutros: 18 distintos y 9 repetidos), pruebas (`angle-guard-core.test.ts`: 16; `angle-guard-judge.test.ts`: 5) y `GET /api/admin/title-guard/judge-validation` (solo administrador, sin escribir nada).
- **Hallazgo de la implementación:** con un único candidato en el corpus, la serie homogénea daba 35 % (por debajo de la zona del juez). **Corrección:** mezcla del 30 % de parecido simple (serie con 1 candidato 51 %, con 9 candidatos 66 %). Verificado con la suite automática: contrastes máximo 75 % (0 rechazos automáticos), mismos 14/18 contrastes y 8/9 repetidos en la zona del juez.
- **Pendiente de la Fase 1:** ejecutar la validación del juez en producción como administrador (necesita la clave de IA del servidor): debe dar ≥ 90 % de aciertos y 0 distintos marcados «misma pregunta».

## 12. Validación del juez (2026-11-01)
- **Intento 1 (en producción, con administrador):** 23 de 27 (85 %), **0 falsos «misma pregunta»** (error seguro), 4 repetidos no detectados: el mismo título con un sufijo de lugar («… en Coral Gables»), el número de una lista (5/7), el singular/plural y un año añadido. **No cumple el 90 %.** No se baja la vara.
- **Análisis:** dos de esos cuatro (5/7 y singular/plural) ya los rechaza el código sin juez (100 %); los otros dos (sufijo de lugar y año añadido) dependen del juez. El prompt tenía una regla contradictoria («cambia el lugar») y no dejaba claro qué NO cambia la pregunta.
- **Corrección:** prompt reescrito con la lista explícita de lo que no cambia la pregunta y de lo que sí, y seis ejemplos distintos de los 27 pares (para no «enseñar a la prueba»). Se repite la validación tras desplegar.
- **Intento 2 (prompt v2):** 24 de 27 (89 %), **1 falso «misma pregunta»** («Rent Out Your Condo» frente a «Rent a Condo»: dueño frente a inquilino) y 2 repetidos no detectados (singular/plural y pregunta/afirmación, aunque el prompt lo decía expresamente). **No cumple.** Diagnóstico: el modelo pequeño no aplica de forma fiable una lista larga de reglas dentro de una sola decisión.
- **Rediseño v3:** la IA ya no decide «misma pregunta»; contesta **cinco preguntas sencillas** por par (misma acción, mismo público, mismo lugar, mismo producto, mismo enfoque) y el **código** concluye: solo es repetido si las cinco son iguales. Se fija `seed` para repetibilidad.
- **Honestidad de método:** un ejemplo del prompt v3 («Rent Out Your Garage» / «Rent a Garage») se parece al par que falló. Para que la validación siga siendo honesta se añaden **10 pares independientes** (`HELDOUT_PAIRS`) que no aparecen en el prompt; el endpoint los reporta aparte y no debe haber falsos «misma pregunta» en ellos.
- **Intento 3 (v3) no se pudo leer:** el endpoint devolvió 502 (Cloudflare lo mostró como «Bad gateway»). Causa: 37 pares con el formato de cinco respuestas superan los 1.200 tokens permitidos, la respuesta se cortó y no era JSON válido. **Corrección:** `max_tokens` proporcional al número de pares (200 + 80 por par), motivo de máximo 10 palabras, 25 s de tiempo para la validación y respuesta 200 con `ok:false` en lugar de 5xx.
- **Intento 3 corregido (v3, `gpt-4o-mini`):** 19 de 27 (70 %), **0 falsos «misma pregunta»**; independientes 6 de 10, 0 falsos. El rediseño de cinco preguntas **empeoró** al modelo pequeño (inventa diferencias en cosas triviales como 5/7 o singular/plural). Resumen de los tres intentos: v1 85 % (0 falsos), v2 89 % (1 falso grave), v3 70 % (0 falsos). Conclusión: el límite es la capacidad del modelo para esta tarea, no el texto del prompt. El error es siempre del lado seguro (deja pasar, no bloquea).
- **Medición sin cambiar producción:** `judge-validation?modelo=gpt-4o|gpt-4.1|gpt-4.1-mini` prueba otro modelo solo en la validación de administrador. El modelo de producción NO cambia sin aprobación de Milton.

## 13. Bitácora de la Fase 2 (2026-11-01)
- **Modelo del juez: `gpt-4.1`** (validación del mismo día: gpt-4.1 y gpt-4o 27/27 y 10/10 sin errores graves; gpt-4.1-mini 27/27 y 9/10; gpt-4o-mini 70 %). Elegido por Milton («el de mayor nivel»); entre los dos modelos completos se usó el más barato.
- **Hecho:** tabla aditiva `TitleGuardReport` (migración `20261101200000_title_guard_report`, RLS, `IF NOT EXISTS`); modo en `SystemSetting` (`title_guard_mode`: apagado por defecto; hoy solo se puede elegir apagado o sombra); `lib/title-guard-shadow.ts` (memoria del sitio, juez en lote, decisión y registro); integración en `/api/title-generation` con `after()` de Next (corre DESPUÉS de responder y nunca cambia lo entregado); endpoints de administrador `mode`, `reports` y `baseline` (solo conteos); sección «Guardia de ángulos» dentro de «Detalle para el administrador».
- **Seguridad:** con el modo apagado (defecto) solo se hace una lectura de `SystemSetting` por solicitud; con sombra, todo va en `try/catch` y el juez solo corre si la solicitud lleva menos de 30 s. Si la tabla no existe, se ignora. Las pruebas actuales no cambian.
- **Orden de despliegue:** el código puede fusionarse antes de la migración porque nace apagado; la migración debe aplicarse ANTES de pasar a sombra.
- **Pendiente:** aplicar el SQL (Milton), pasar a sombra, observar ≥ 48 h y ≥ 20 solicitudes y medir la línea base; recién entonces la Fase 3.

## 14. Puesta en marcha de la sombra (2026-11-01)
- La app usa el proyecto Supabase `uqqclaezxagukoyiiiol` (verificado desde el diagnóstico de administrador). Las tablas `SiteArticleTitle`, `ArticleTitleDiscard`, `TitleOrigin` y `TitleExplanation` existen; `TitleGuardReport` no existía hasta que Milton aplicó el SQL de la Fase 2 (primer intento no quedó aplicado). Lección: los diagnósticos que tragan errores ocultan hechos; ahora el diagnóstico muestra la causa real, el proyecto y las tablas.
- **Modo: sombra, activado por Claude con el selector de administrador el 2026-11-01.** Registra lo que la guardia decidiría; lo que recibe la gente es exactamente lo de siempre.
- **Línea base (120 días, 36 cuentas con 2+ solicitudes, 219 solicitudes comparadas, 1.971 títulos):** casi idénticos (≥ 85 %) 10 (0,5 %); zona del juez (38–84 %) 430 (21,8 %); solicitudes con 3 o más parecidos 68 (31 %). El problema es general, no de una sola cuenta.
- **Ritmo:** unas 219 solicitudes en 120 días ≈ 2 al día en toda la plataforma. Reunir las 20 solicitudes exigidas para activar tardaría ~10 días sin ayuda; se decide con Milton si se acelera (solicitudes propias, tope 3 por usuario al día) o se ajusta el criterio.

## 15. Hallazgo de la sombra y juez por lista (2026-11-01)
- **Hallazgo (prueba con la cuenta de pruebas de Milton, pedido repetido):** la segunda tanda repitió a la primera con sinónimos («Errores que debes evitar al elegir un seguro de salud…» frente a «Errores que pueden costarte al seleccionar un plan de salud…») y la guardia la marcó limpia (9 de 9). Causa: el código no ve parecido (casi no hay palabras en común) y el juez solo recibía lo que el código ya consideraba parecido. La especificación (apartado 4) pedía además comparar contra las tandas recientes de la categoría; esa pieza no se había construido.
- **Corrección:** `buildNeighborLists` arma, por título nuevo, los 5 vecinos más cercanos por código y los 20 más recientes publicados u ofrecidos de la MISMA categoría (tope 25, sin repetidos); un **juez por lista** (`callListJudge`) dice cuáles de esos hacen la misma pregunta, aunque no compartan palabras. Lo casi idéntico (≥ 85 %) sigue decidiéndolo el código. Si el juez falla, se usa el camino de siempre.
- **Validación propia:** 12 casos (`LIST_CASES`): 6 con «aguja» entre 25 existentes (mismo ángulo con sinónimos) y 6 sin aguja (mismo tema, otra pregunta). Condición: ≥ 5 de 6 agujas y 0 falsos. Se corre con `judge-validation?formato=lista`.
- **Límite de iteraciones (decidido con Milton):** una validación; si falla, UNA corrección; si vuelve a fallar, se detiene y se presentan alternativas.
- **Validación del juez por lista, intento 1 (gpt-4.1):** encontró **6 de 6 agujas** (incluido el caso real de la tanda repetida) y marcó 1 «falso»: «Seguro de salud para trabajadores independientes» frente al relleno «Seguro para trabajadores por cuenta propia: opciones». **El juez tenía razón: el relleno era un sinónimo exacto del candidato; el error estaba en MI caso de prueba.** Corrección única: se reemplaza ese relleno y se agrega una prueba que vigila que ningún relleno sea sinónimo de un candidato sin aguja. Se repite la validación una vez.
- **Validación del juez por lista, intento 2 (tras corregir mi caso): 6 de 6 agujas, 0 falsos — CUMPLE** (gpt-4.1). Herramienta nueva `replay` (solo administrador, sin escrituras): repite la decisión de una solicitud ya registrada con el juez y la memoria de hoy, para probar con casos reales sin gastar solicitudes de nadie.

## 16. Costo, velocidad y frenos de la sombra (2026-11-01)
- **Costo estimado por solicitud observada** (9 candidatos × 25 vecinos ≈ 4.800 tokens de entrada y 900 de salida): gpt-4.1 ≈ US$ 0,017 (unos 2 centavos); gpt-4o-mini ≈ US$ 0,001. Al ritmo actual (~2 solicitudes al día en toda la plataforma) ≈ US$ 1 al mes. Peor caso sin freno: 300 solicitudes al día ≈ US$ 5 al día. **Con el tope de 60 al día: máximo ≈ US$ 1 al día.**
- **Velocidad para la persona: ninguna.** El juez corre con `after()`, después de responder; mide 1,1–2,2 s y solo ocupa el servidor unos segundos más por solicitud. Si la generación ya tardó más de 30 s, la sombra se salta el juez.
- **Otros costos de dejarla abierta:** lecturas de base de datos (hasta ~15.000 filas por solicitud en cuentas grandes), crecimiento de la tabla `TitleGuardReport` (~4 KB por registro) y que genera datos sin beneficio para nadie mientras no se active.
- **Frenos agregados:** (1) tope de 60 solicitudes observadas por día; (2) la sombra **se apaga sola a los 14 días** si nadie la renueva; (3) limpieza perezosa de registros de más de 60 días.

## 17. Fase 3 — modo activo (2026-11-01)
- **Hecho:** modo `activo` con porcentaje (`title_guard_percent`, 0–100; cubeta estable por solicitud); en las solicitudes elegidas se piden 14 ideas, se evalúa con el juez por lista y se entregan hasta 9 (mínimo 5) con notas amables y aviso cuando el tema está muy cubierto; los títulos efectivamente entregados son los que cuentan como «ofrecidos». Notas y aviso se muestran en la pantalla de CONTENIDO PROPIO y en la respuesta del asistente MCP. Cualquier fallo de la guardia entrega exactamente lo de siempre.
- **Frenos automáticos:** freno por cuenta (2 solicitudes seguidas con notas → 24 h sin guardia) y freno global (3 fallos en las últimas 10 solicitudes activas → se salta).
- **Control de administrador:** modo y porcentaje (10/25/50/100) desde «Guardia de ángulos»; nace APAGADO/en sombra, sin cambios hasta que Milton elija «activo».
- **Pendiente:** subida automática del porcentaje, aviso por correo, y probar el modo activo con tráfico real (se empieza en 10 %).

## 18. Medición retrospectiva y la ÚNICA corrección del juez por lista (2026-11-01)
- **Medición sin mirar el futuro (24 solicitudes pasadas, 216 títulos, sin títulos del sitio de hoy):** el juez marcó 124 títulos (57,4 %); 23 de 24 solicitudes entregarían menos de 9; 17 de 24 tendrían menos de 5 limpios. Costo de la prueba: US$ 0,41. (Con los títulos del sitio de hoy daba 63,9 %: sesgado por incluir artículos posteriores.)
- **Lectura de los ejemplos:** unos dos tercios de las marcas parecen correctas (misma pregunta concreta); cerca de un tercio son excesivas: el juez agrupa por TEMA y no por la pregunta exacta («evitar» frente a «comparar» frente a «entender» costos; «fijar el precio» frente a «coordinar la mudanza»).
- **Corrección única (acordada con Milton):** regla clave en el prompt («compartir el tema general NO basta; misma pregunta CONCRETA»), contraejemplos neutros de ese tipo y 4 casos de validación nuevos sin aguja (16 en total: 6 con aguja y 10 sin ella). Se repiten la validación por lista y la medición retrospectiva. Si la medición no mejora claramente, se detiene y se presentan alternativas; la guardia sigue en sombra y no se activa.

## 19. Cierre de pruebas de costo (2026-11-01) — NO repetir
- **`gpt-4.1-mini` en el juez por lista: DESCARTADO.** Con el prompt vigente y 16 casos encontró las 6 agujas pero marcó **9 falsos**, incluso títulos sin relación; con el prompt anterior marcó 5 de 12. No sirve para el formato de lista (sí sirvió en el formato de pares).
- **`gpt-4.1` con la corrección única (16 casos): 6 de 6 agujas y 1 falso discutible** («evitar costos extra» frente a «entender costos ocultos», que además coincide con un ejemplo del propio prompt, así que el caso no es independiente). Estado: aceptable, no perfecto. No se hacen más rondas de ajuste del prompt por ahora.
- **Decisión de Milton (cuidar el gasto):** dejar el sistema como está. La guardia sigue en **sombra** (≈ 4 centavos al día al ritmo de hoy; tope 60 al día) y **no está activada**. Gasto acumulado de las pruebas de hoy ≈ 1,3–1,4 dólares.
- **Ideas de ahorro pendientes, sin ejecutar:** lista compartida entre los 9 títulos (≈ 5× menos texto), aplicar solo en cuentas con muchos títulos, y búsqueda por significado (embeddings). El modelo pequeño ya no es una opción para la lista.
- **Medición retrospectiva sin sesgo (24 solicitudes):** 57,4 % marcado, ~1/3 excesivo con el prompt anterior; NO se repitió con la corrección para no gastar (≈ 14 centavos con 8 solicitudes si se quiere medir más adelante).

## 20. Tráfico real, costo y filtro de historial (2026-11-01)
- **Tráfico real (lectura de la base):** 280 solicitudes de ideas con IA desde el 20/09, en 54 cuentas; últimos 7 días ≈ 16 al día (15, 15, 22, 19, 18, 17, 8); a mediados de octubre eran 4–5 al día. Mis estimaciones anteriores (2 y 6 al día) estaban mal.
- **Hallazgo de costo:** la SOMBRA observa todas las solicitudes (≈ 16/día × 1,7 centavos ≈ 8 USD al mes) y no beneficia a nadie; en modo ACTIVO al 10 % solo se revisa 1 de cada 10 clics y las demás NO se observan (≈ 0,8 USD al mes).
- **Filtro de historial (hecho):** la guardia no se aplica a cuentas con menos de 20 títulos (publicados u ofrecidos) en la categoría (`GUARD.MIN_HISTORY`, `hasEnoughHistory`, `accountHasHistory`); sin IA. Estimación: ahorra cerca de la mitad. Con el filtro: 10 % ≈ 0,4 USD/mes; 50 % ≈ 2; 100 % ≈ 4.
- **Plan acordado con Milton:** (1) pasar de sombra a ACTIVA al 10 % (baja el gasto y empieza a ayudar); (2) filtro de historial (hecho); (3) lista compartida entre los 9 títulos solo si hace falta (≈ 2 centavos de prueba; ~5× menos texto).

## 21. Módulo 2 (CONTENIDO GENERADO POR IA) — medición y defensa (2026-11-01)
- **Medición de solo lectura (muestra de 37 cuentas, tope de 9.000 artículos en 120 días):** en los últimos 30 días el módulo 2 produce 1.219 artículos y el módulo 1 573 (el 68 % sale del módulo 2). Repetición medida solo con código: módulo 2 → 13,4 % casi idénticos a un título anterior de su cuenta y 63 % en la zona del juez; módulo 1 → 8,1 % y 37,7 %.
- **Decisión de Milton:** aplicar la defensa a AMBOS módulos, sin dañar el razonamiento con Search Console y Bing del módulo 2.
- **Cómo se aplica en el módulo 2 (`lib/opportunity-guard.ts`):** se coloca DESPUÉS de que `analyzeSeoOpportunities` produce los grupos y ANTES de guardarlos; solo QUITA títulos repetidos. No cambia la justificación, las impresiones, los clics ni ninguna señal; conserva el orden; **nunca vacía un grupo** (si todo se parece queda el menos parecido, `dropSimilarKeepOne`); ante cualquier fallo guarda todo como siempre. Mismo interruptor (solo en modo ACTIVO), mismo porcentaje (cubeta por cuenta y día), mismo filtro de historial por categoría y mismos frenos. Sin veredicto del juez solo se quita lo casi idéntico (≥ 85 %). Tope de gasto: 2 llamadas del juez por análisis (≈ 80 títulos, ~10 centavos como máximo) y cada análisis aplicado cuenta para el tope diario de 40.
- **Estado:** construido y probado, **NO activado** (la guardia sigue en sombra y en sombra el módulo 2 no se toca).
