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
