# Triple auditoría — Guardia de ángulos

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
