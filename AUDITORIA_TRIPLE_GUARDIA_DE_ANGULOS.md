# Triple auditoría — Guardia de ángulos

> ## PRINCIPIO RECTOR (Milton, 2026-11-01)
> **Primero, que la persona reciba propuestas para publicar. La guardia solo ordena y prefiere lo más nuevo; es una preferencia, nunca una barrera.** Si hay conflicto entre «no repetir» y «entregar contenido», gana entregar contenido. Una solicitud con candidatos de la IA **nunca termina sin títulos**.

Fecha: 2026-11-01. Auditor: Claude, sobre su propio plan (`PLAN_GUARDIA_DE_ANGULOS.md`). Método: medir con datos reales de producción (88 títulos únicos: 63 ofrecidos + 36 publicados de una cuenta, solo lectura) y leer el código vigente (`title-generation.ts`, `title-generation-core.ts`). Veredicto: **el enfoque híbrido es el mejor disponible, pero el plan original tenía 3 errores que esta auditoría corrige.**

## Auditoría 1 — ¿Funciona el detector? (medición real)
| Prueba | Resultado |
|---|---|
| Parecido simple por palabras (el del plan original) | Marca **288 pares** a partir de 34 %. La mayoría son falsos: en un sitio de «Coral Gables», las palabras *coral, gables, home, selling* están en casi todos los títulos y empujan todo hacia arriba. Con umbral 60 % se rechazaría «Understanding Coral Gables Home Prices» contra «Downsizing Your Home… Coral Gables» (60 %), que son preguntas distintas. **El umbral del plan era incorrecto.** |
| Parecido ponderado por rareza (palabras comunes del propio sitio valen casi 0) | Baja a **27 pares** a partir de 30 %. Todos los de ≥ 60 % son repeticiones genuinas (7 de 7): «Tips for Embracing Change: Downsizing…» con y sin «in Coral Gables» (96 %), «Prepare… Quick Sale» (73 %), «Buy / Choose a Condominium… New York» (68 %), «Coordinating Your Sale and Next Move» (67 %), «Current Condo Market Trends» (67 %), «Steps to Prepare… Sale» (66 %), «Post-Closing Occupancy Agreements» (63 %). |
| Zona dudosa 38–59 % | Solo ~9 pares en 88 títulos. Ejemplos reales: «¿Es buen momento de vender?» vs «Beneficios de vender ahora» (51 %); «Buy a Condo… Weston» vs «…Miami» (46 %, misma plantilla con otra ciudad). Aquí decide el juez de IA. |
| Se adapta a cualquier negocio | Sí: la rareza se calcula con los títulos de cada sitio, así que las palabras comunes de CADA negocio pesan poco sin listas escritas a mano. |
| Límite que NO se resuelve con palabras | **Sinónimos**: «vender rápido su casa» vs «venta veloz del inmueble» comparten casi ninguna palabra y escapan al detector. Por eso el juez de IA no puede limitarse a la zona dudosa. |

## Auditoría 2 — ¿Es robusto y seguro para todos los usuarios?
| Riesgo hallado | Corrección |
|---|---|
| **Hueco en el código actual:** `loadAvoid` solo lee títulos creados por la plataforma y lo ya ofrecido. **No lee `SiteArticleTitle`** (artículos que ya existen en el sitio, del sitemap) ni los descartados, y **no filtra por sitio** (mezcla sitios distintos de una misma cuenta). Esto afecta a TODAS las cuentas. | La guardia lee: publicados + ofrecidos + sitio (`SiteArticleTitle`) + descartados, **del sitio elegido**. |
| Descartar para siempre puede dejar sin material a un nicho pequeño o a temas de temporada | Lo descartado bloquea **90 días**, no para siempre. |
| La rareza necesita corpus: con pocos títulos (menos de ~30) es poco fiable | Con corpus chico se usa solo la lista de palabras vacías y se exige parecido mayor para rechazar; el juez de IA decide el resto. |
| Español: los datos de calibración están en inglés | La línea base en TODAS las cuentas (decisión 6) es obligatoria **antes** de activar; hasta entonces solo modo sombra. Palabras vacías y plurales de ambos idiomas. |
| Falla la llamada de IA del juez | Falla hacia lo seguro: se decide solo con el código (≥ 60 % rechaza, el resto pasa marcado «no verificado»). Nunca bloquea la solicitud. |
| Falso positivo que frena la publicación | Se mantiene la guardia exacta del worker tal cual; la nueva solo actúa al **generar**, no al publicar. No se toca el área del otro programador. |
| Resultado vacío o relleno | Si tras guardia y reintento quedan menos de 5, se completan con los mejores «dudosos» con su razón visible; si más de la mitad se rechaza, aviso honesto de «tema muy cubierto». |
| Costo | 1 llamada corta extra por solicitud (fracción de centavo), mismo modelo, mismo tope de 3 solicitudes al día. 9–14 candidatos × ~6.000 títulos = cálculo trivial. |

## Auditoría 3 — ¿Hay una opción mejor?
| Alternativa | Veredicto |
|---|---|
| Solo mejorar el prompt (más títulos a evitar) | **Rechazada como única medida**: la IA ya recibe «no repitas ni reformules» y aun así reformula (78 %). Se conserva como una pieza. |
| Juez de IA para cada candidato contra todo el historial | **Rechazada**: lento y caro. Se usa una sola llamada agrupada contra los vecinos más cercanos y lo más reciente. |
| Vectores (embeddings) | **Aplazada, no descartada**: son la mejor medida de significado, pero exigen almacenar vectores, migración y una dependencia nueva. El ponderado + juez ya separa bien los datos reales. Se reconsidera en la Fase 5 solo si la sombra muestra repeticiones que se escapan. |
| Híbrido: detector ponderado + juez agrupado + mapa de ángulos + registro con razón | **Elegida.** Es explicable, no cambia de modelo, no requiere infraestructura nueva y cumple la regla: *todo parecido aceptado lleva su razón guardada*. |
| Un solo punto de entrada | Comprobado: la web y el MCP llaman al mismo `/api/title-generation`; basta una integración en su bucle (`selectValidTitles` → guardia) para cubrir ambos. |

## Veredicto y cambios al plan
1. Umbrales **nuevos** con parecido ponderado: **≥ 60 % repetido**, **38–59 % dudoso**, **< 38 % pasa**. (El 60 % del plan original sobre palabras sueltas se descarta.)
2. El juez de IA corre **siempre una vez** (agrupado) sobre los candidatos finales, para atrapar sinónimos; no solo en la zona dudosa.
3. La guardia incluye **sitio + descartados (90 días) filtrado por sitio**, corrigiendo el hueco actual.
4. El orden de fases no cambia; la Fase 1 incluye estas mediciones como pruebas automáticas (los 88 títulos reales como prueba de oro) y la línea base multi-cuenta antes de activar.
5. Decisiones propuestas finales: 1) umbrales anteriores; 2) descartados 90 días; 3) sombra mínimo 48 h y al menos 20 solicitudes observadas; 4) el aviso de pedido repetido solo informa; 5) tabla `TitleGuardReport` aplicada por Milton antes de fusionar; 6) línea base en todas las cuentas, solo conteos.

---

# RONDAS 2 a 8 — auditorías repetidas hasta cero errores (2026-11-01)
Regla de Milton: si una pasada encuentra un error, se corrige y se **reinician las tres pasadas**. Cada pasada se hizo con ejecución real (prototipo del detector probado en producción en solo lectura) o lectura del código vigente.

## Bitácora de errores encontrados y corregidos
| Ronda · Pasada | Error encontrado | Corrección |
|---|---|---|
| 2 · A | Con palabras de 4+ letras, «Buy a Condo» vs «Sell a Condo» daba 63 % → se rechazaría (falso positivo). «buy» se descartaba por corta. | Se aceptan palabras de 3+ letras; las siglas de 2–5 mayúsculas se conservan. |
| 2 · B | La ruta `/api/title-generation` tiene `maxDuration = 60 s` y ya permite 2 llamadas de hasta 40 s; una llamada más de IA sin límite de tiempo empeoraría el riesgo de corte. | Presupuesto de tiempo: el juez solo corre si ya pasaron menos de 30 s, con tope de 10 s y sin bloquear si falla. |
| 2 · B | Los títulos del sitio (`SiteArticleTitle`) se deducen del slug de la URL y traen restos como «buyers39». | Se quitan 1–3 dígitos pegados al final de una palabra en minúscula y sin guion (restos de entidades), y se conservan códigos reales (EB-5, H-1B, 401k, FHA203k). |
| 4 · A | «EB-5» vs «H-1B» daba 71 % porque los códigos cortos se perdían. | Regla de códigos: palabras con letras+dígitos con guion, mayúscula o que empiezan por dígito se conservan enteras. |
| 5 · A | «10 errores al comprar un bote» vs «…vender…» daba 64 %: un solo verbo decisivo no basta con umbral de 60 %. | **Dos umbrales**: el código rechaza solo sin juez ≥ **85 %** (casi idéntico); de **38 % a 84 %** decide el juez de IA. Con 60 % se habrían rechazado 5 de 12 contrastes legítimos. |
| 5 · B | Las pruebas de integración existentes cuentan las llamadas a la IA (`calls.length`); una llamada extra siempre activa las rompería. | El juez es un contador aparte (`MAX_JUDGE_CALLS = 1`), apagado por defecto: con el interruptor en «apagado» el comportamiento y las pruebas actuales no cambian. |
| 5 · B | La categoría de la generación no trae `siteDomain`, que la guardia necesita. | Se agrega `siteDomain` al `select` (con valor vacío si falta). |
| 6 · C | Faltaban 3 piezas operativas: cómo cambiar el modo (apagado/sombra/activo), cómo ver lo que la sombra habría rechazado, y cómo medir la línea base multi-cuenta (el token local no puede subir workflows). | Se agregan: endpoint de administrador para el modo, sección «Guardia de ángulos» en el detalle de administrador, y endpoint de administrador de línea base (solo conteos, sin datos personales). |
| 7 · A | El cortador de palabras fallaba: «home» y «homes» no coincidían; «selling» daba «sel». | Cortador conservador (plurales, -ing, -ed, doble consonante salvo l/s/z/f, -e final): 30 de 30 pares de prueba coinciden. |

## Ronda 8 (final) — tres pasadas sin errores
**Pasada A — algoritmo (ejecutada):** 18 pares de contraste legítimos (comprar/vender, alquilar/alquilar en otra ciudad, EB-5/H-1B, 401k/403b, antes/después, pros/contras, otros rubros y español): máximo 69 %, **0 rechazos automáticos**. 7 de 7 pares repetidos entran a rechazo automático o a revisión del juez. Con los 88 títulos reales: 1 par a rechazo automático y 17 a juez; por lote de Inés, 0–3 candidatos van al juez (costo mínimo). Rendimiento medido sin pre-tokenizar: 0,77 s para 14 candidatos × 6.000 títulos; con pre-tokenización es una fracción de eso.
**Pasada B — integración (verificada en el código):** punto único `generateTitlesForUser` (web y MCP); `loadAvoid` corregida; pruebas existentes intactas con el modo apagado; las de integración usan base real `*_test` y se omiten por defecto; contrato web/MCP solo con campos opcionales nuevos; si la tabla falta o la IA falla, todo sigue como hoy; el cupo diario se libera si no hay títulos útiles (comportamiento actual).
**Pasada C — producto y operación (verificada):** mensajes de una frase en español sencillo; el detalle vive solo en «¿Por qué estos títulos?» y en el detalle de administrador; sin datos nuevos hacia OpenAI (ya se envían títulos previos hoy); tabla nueva con RLS, aislada por usuario; worker intacto; interruptor, visibilidad y línea base incluidos; documentación y manual en cada fase.

## Límites honestos (no son errores, pero Milton debe saberlos)
1. **El juez de IA no está probado todavía**: esta auditoría validó el detector y el diseño, no el prompt del juez. Condición de la Fase 1: el juez debe acertar ≥ 90 % de los 25 pares etiquetados de esta auditoría y **0 de los 18 contrastes** deben salir como repetidos, antes de pasar a modo sombra.
2. Sinónimos con casi ninguna palabra en común contra títulos antiguos fuera de los 20 más recientes pueden escaparse; se mitiga con el mapa de ángulos en el prompt y se mide en la sombra.
3. Español e inglés calibrados con pares sintéticos; la línea base en todas las cuentas es obligatoria antes de activar.
4. La Fase 4 (CONTENIDO GENERADO POR IA) no se auditó a nivel de código (1.425 líneas); tendrá su propia mini-auditoría antes de programarse.
5. Dos solicitudes simultáneas de la misma cuenta no se ven entre sí (comportamiento ya existente).

## Especificación final (manda sobre el plan anterior)
- **Detector** (`lib/angle-guard-core.ts`, puro, con pruebas): normaliza sin tildes; palabras de 3+ letras sin palabras vacías (inglés y español); siglas y códigos conservados; números sueltos ignorados; cortador conservador; peso por rareza calculado con el corpus del propio sitio (mínimo 0,05); parecido = peso compartido / peso total.
- **Decisión:** ≥ 85 % rechazo automático · 38–84 % al juez · < 38 % pasa. Si el juez no está disponible (falla, tiempo, tabla, modo): se decide solo con el código y se rechaza ≥ 60 %, los demás pasan marcados «sin verificar».
- **Juez:** una sola llamada agrupada, `gpt-4o-mini`, solo si pasaron < 30 s, tope de 10 s. Compara cada candidato contra sus 5 vecinos más cercanos por código + los 20 títulos más recientes de la misma categoría + todo lo que cayó en la banda. Regla del juez: dos títulos son repetidos solo si un lector con la misma necesidad quedaría satisfecho con cualquiera; si cambian la acción (comprar/vender, alquilar/rentar), el público, el lugar o el tipo de producto, son distintos. Devuelve sí/no + una frase de razón por pareja.
- **Memoria:** publicados + ofrecidos + `SiteArticleTitle` + descartados (90 días) del sitio de la categoría (corrige `loadAvoid`). Pre-tokenizada una vez por solicitud.
- **Mapa de ángulos** (grupos formados en código con el mismo parecido) en el prompt en lugar de 60 títulos sueltos.
- **Generar → verificar → reponer** dentro del límite actual de 2 generaciones; si quedan < 5 se completan con los mejores «dudosos» con su razón; si más de la mitad se rechaza: error `NO_VALID_TITLES` con mensaje «Este tema ya está muy cubierto en tu sitio…», sin gastar cupo.
- **Tabla** `TitleGuardReport` (aditiva, `IF NOT EXISTS`, RLS) con la razón de cada rechazo y de cada parecido aceptado, clave `requestId`; alimenta «¿Por qué estos títulos?».
- **Modo** `apagado` (defecto) / `sombra` / `activo` en `SystemSetting`, cambiado desde un endpoint de administrador; sombra: mínimo 48 h y 20 solicitudes observadas.
- **Pedido repetido:** compara el `tema` con los pedidos de 7 días de la misma categoría; ≥ 60 % → aviso de una frase (web) y texto en la respuesta del MCP; nunca bloquea.
- **Visibilidad de administrador:** sección «Guardia de ángulos» en el detalle de administrador y endpoint de línea base (solo conteos).
- **Fases:** 1) módulo + pruebas + validación del juez con los pares etiquetados · 2) tabla, endpoints de administrador y modo sombra · 3) activo + aviso de pedido repetido + explicación enriquecida · 4) CONTENIDO GENERADO POR IA (con mini-auditoría previa) · 5) evaluación de 7 días y ajuste · 6) vectores solo si hace falta.

---

# AUDITORÍA DE RIGIDEZ — ¿puede la guardia frenar o empobrecer la creación y selección de artículos? (2026-11-01)

Pregunta de Milton: que la reparación NO afecte la selección ni la creación de artículos «por rigidez del programa». Método: tres pasadas con datos reales y código, y si una pasada halla un hueco, se corrige y se reinicia.

## Ronda 1 — huecos encontrados
| Pasada | Hallazgo | Hueco |
|---|---|---|
| 1 · Rendimiento (replay en orden temporal de las 7 solicitudes reales, memoria de 1 a 89 títulos, suponiendo que el juez vetara TODA la banda dudosa) | Sobran **9, 9, 9, 8, 9, 6 y 7** títulos de 9; mínimo 6; 0 rechazos automáticos. (Mi primer intento estaba mal: la memoria incluía artículos publicados DESPUÉS del lote y daba 4–5 «repetidos» falsos. Se descartó y se rehízo sin fuga de futuro.) | Pero la banda crece con la memoria (de 1/9 a 3/9 por lote entre 60 y 80 títulos): en un nicho muy estrecho y con cientos de títulos podría quedar por debajo de 5. **G1, G2, G3.** |
| 2 · Rutas que NO deben tocarse (verificado en el código) | La lógica de ideas con IA (`generateTitlesForUser`, `selectValidTitles`, `buildAvoidSet`) solo la usa `/api/title-generation` (y el MCP a través de esa ruta). Los títulos que la persona escribe o pega (`/api/runs`), los reintentos, la ejecución de oportunidades, el worker y la guardia exacta existente NO pasan por la guardia nueva. | Estructuralmente, **la guardia no puede bloquear títulos escritos a mano ni la publicación.** Hueco menor: **G4** (títulos del sitio deducidos de URLs pueden ser páginas de categoría). |
| 3 · Matriz de escenarios | Cuenta nueva, nicho saturado, temporada/anual, pedido repetido por un asistente, juez caído, tabla ausente, modo apagado, corpus enorme, URLs que no son artículos, títulos escritos a mano, reintentos, español/inglés. | **G5** (títulos anuales), **G6** (qué pasa si el juez es demasiado estricto), **G7** (salida para quien igual quiere ese tema). |

## Los 7 huecos y su corrección (pasan a la especificación final)
| # | Corrección |
|---|---|
| G1 | **Sobre-generación:** se piden 14 candidatos para 9 cupos (ya cabe en el mismo prompt; unas decenas de tokens más). |
| G2 | **Caducidad de lo no usado:** los títulos que solo se OFRECIERON y nunca se publicaron dejan de contar como «cubiertos» a los 60 días. Publicados y del sitio no caducan; los descartados, a los 90 días. Evita que lo que nadie usó cierre un tema para siempre. |
| G3 | **Freno de seguridad por cuenta:** si 3 solicitudes seguidas quedan con menos de 5 títulos por culpa de la guardia, se desactiva para esa cuenta durante 24 horas (entrega como hoy) y se avisa al administrador. Simulado: el daño máximo es de 3 solicitudes seguidas. |
| G4 | Los títulos deducidos del sitio **nunca se rechazan automáticamente**; solo pueden mandar el título al juez, que recibe la nota «puede ser una página de categoría». |
| G5 | **Regla de año/temporada:** un candidato que trae un año se compara solo con títulos del mismo año o de los últimos 12 meses; un evento anual puede repetirse al año siguiente. |
| G6 | **Criterio de activación:** no se pasa de «sombra» a «activo» salvo que, con al menos 20 solicitudes observadas, el veto promedio sea ≤ 30 % de los candidatos y ningún lote quede con menos de 5 títulos. Interruptor de apagado inmediato siempre disponible. |
| G7 | **Salida siempre abierta:** si un tema está de verdad cubierto, el mensaje dice «Este tema ya está muy cubierto en tu sitio. Si igual quieres un artículo sobre él, escribe tú el título en CONTENIDO PROPIO; ahí nadie te lo frena.» |

## Ronda 2 (tras corregir) — tres pasadas
- **Pasada 1 · Rendimiento (matemática con las fracciones reales):** con 14 candidatos y el 33 % de banda real del peor lote, sobreviven **12,6** títulos con un juez realista (veta 30 % de la banda) y **9,3** aun si vetara toda la banda (con 9 candidatos serían 6). Estrés ×2 (67 % de banda): 11,2 realista, 4,7 en el peor caso extremo. Estrés ×3 (todo en banda y veto total): 0 — en ese caso extremo actúa el freno G3, simulado: tras 3 solicitudes escasas entrega normal 3 solicitudes más y vuelve a vigilar.
- **Pasada 2 · Rutas:** sin cambios; los hallazgos de la Ronda 1 se confirman. La guardia solo vive en `generateTitlesForUser`.
- **Pasada 3 · Escenarios con las correcciones:** ver tabla. **Sin huecos nuevos.**

| Escenario | Qué pasa con la guardia corregida |
|---|---|
| Cuenta nueva sin historial | No hace nada: no hay con qué comparar. |
| Nicho estrecho y muy lleno | Over-generación + mapa de ángulos; si de verdad no quedan ángulos, mensaje honesto con salida a CONTENIDO PROPIO; freno tras 3 escasos. |
| Evento anual (Halloween 2026 vs 2027) | Regla G5: se permite. |
| Asistente que repite el mismo pedido cada día | Aviso de una frase, ángulos nuevos o tema cubierto; nunca bloquea el pedido. |
| Juez caído, lento o sin tabla | Falla hacia lo seguro: decide el código (≥ 60 % rechaza) o entrega como hoy; nunca detiene la solicitud. |
| Modo apagado (defecto) | Comportamiento idéntico al actual. |
| Titular escrito a mano / pegado | No pasa por la guardia: nunca se bloquea. |
| Reintentos, publicación, worker | No pasan por la guardia. |
| Corpus de miles de títulos | Tope de 5.000 por fuente, pre-tokenizado, medido en fracción de segundo. |
| Sitio con URLs que no son artículos | Solo pueden mandar al juez, nunca rechazar solos (G4). |
| Español e inglés | Palabras vacías y cortador de ambos; calibración con la línea base antes de activar. |
| Varias solicitudes simultáneas | Comportamiento actual (no se ven entre sí); sin riesgo nuevo. |

## Veredicto de rigidez
**La guardia no puede, por diseño, bloquear la creación ni la selección de artículos:** (1) vive solo en la sugerencia de ideas con IA; (2) lo que la persona escribe o elige siempre pasa; (3) ante cualquier falla del juez, la tabla o el tiempo, entrega como hoy; (4) tiene freno automático por cuenta, interruptor de apagado inmediato y modo sombra obligatorio antes de activar. **Riesgo residual honesto:** un juez demasiado estricto podría empobrecer el resultado hasta que el freno actúe; por eso el criterio G6 mide el veto real en modo sombra antes de activar, y el juez no se enciende sin pasar su prueba con los pares etiquetados.


---

# CORRECCIÓN POR EL PRINCIPIO RECTOR (2026-11-01)
Contradicción hallada: la especificación decía que, si más de la mitad se rechazaba, se devolvía el error `NO_VALID_TITLES` («tema muy cubierto») **sin títulos**. Eso contradice el principio. Queda así, y manda sobre lo anterior:

1. **Siempre se entregan títulos.** Después de la guardia, los candidatos se ordenan de **más nuevo a menos nuevo** (parecido más bajo contra lo existente). Se entregan los mejores hasta 9.
2. **Si no alcanzan 9 sin repetidos claros**, se completan con los **menos parecidos** del resto, hasta un mínimo de 5, y cada uno lleva al lado una nota de una frase en español sencillo: «Se parece a tu artículo “…”; úsalo si quieres cubrirlo con otro enfoque.» La persona decide; nada se oculta ni se bloquea.
3. **Solo los casi idénticos (≥ 85 %) o los que el juez marca «misma pregunta» con claridad** se descartan primero; aun así, si con eso quedaran menos de 5, vuelven a entrar en orden de menor parecido con su nota. La única razón para entregar menos de 5 es que la IA no haya devuelto candidatos.
4. **El mensaje «tema muy cubierto»** pasa a ser un **aviso que acompaña a los títulos**, no un error: «Este tema ya está muy cubierto en tu sitio; abajo van las mejores opciones. Para otros ángulos, prueba otro tema o escribe tus propios títulos en CONTENIDO PROPIO.»
5. **El freno por cuenta (G3) se refuerza:** si 2 solicitudes seguidas necesitaron completar con notas por culpa de la guardia, la tercera se entrega como hoy (sin guardia) y se avisa al administrador.
6. **Modo sombra y activación:** además de los criterios anteriores, no se activa si en la sombra algún lote habría tenido que ser completado con notas más del 20 % de las veces.
7. **Explicación:** «¿Por qué estos títulos?» dirá con sinceridad cuáles llevan nota de parecido y por qué se incluyeron igual.
