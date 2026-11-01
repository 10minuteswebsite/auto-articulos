# Análisis forense — ¿por qué se repiten los temas? (caso INES)

Fecha: 2026-11-01. Cuenta: la de Inés. Fuente: el Historial forense de producción (solo lectura) y el código de `title-generation-core.ts` / `title-generation.ts`. Plan origen: `MASTER_BLUEPRINT_HISTORIAL_FORENSE_ARTICULOS.md`.

## Veredicto
La percepción de Inés es **cierta** en el nivel de ángulos temáticos: los lotes recientes se parecen cada vez más a los anteriores. La causa principal NO es que el algoritmo «elija mal»; son dos cosas que se suman:
1. **Los pedidos de los últimos días son casi el mismo pedido.**
2. **La comprobación anti-repetición solo detecta títulos idénticos**, no títulos que dicen lo mismo con otras palabras.

## Evidencia (7 solicitudes de ideas con IA, 63 títulos ofrecidos)
Parecido de cada lote contra TODOS los lotes anteriores (palabras significativas compartidas; ≥ 50 % = «muy parecido»):

| Lote | Categoría | Muy parecidos (≥ 50 %) | Parecidos (35–49 %) |
|---|---|---|---|
| 23/09 | Coral Gables Condos Activity | — (primero) | — |
| 24/09 | Home Selling Tips | 0 | 0 |
| 28/10 | Coral Gables Condos Activity | 0 | 0 |
| 30/10 mañana | Home Selling Tips | 1 | 4 |
| 30/10 tarde | Real Estate | 1 | 4 |
| 31/10 | Coral gables real estate | **3** | 5 |
| 01/11 | Home Selling Tips | **3** | 1 |

Ejemplos que PASARON el filtro actual: «Steps to Prepare Your Coral Gables Home for a Quick Sale» (31/10) contra «Essential Steps to Prepare Your Coral Gables Home for Sale» (30/10): **78 %**. «Essential Planning Tips for Coordinating Your Home Sale and Next Move» (1/11) contra «Tips for Coordinating Your Sale and Next Move in Coral Gables» (30/10): 55 %.

## Causa 1 — el pedido se repite
Los tres pedidos del 30/10 (mañana), 31/10 y 1/11 piden lo mismo con otras palabras: fijar precio, preparar la venta, negociar y coordinar la venta con la siguiente mudanza, incluyendo acuerdos de ocupación posterior al cierre. Las solicitudes entran siempre a la misma hora local (7:04 a. m.), y el texto del pedido está redactado en inglés pulido y más largo que un formulario manual: es **muy probable** (no confirmado) que un asistente o tarea programada de Inés esté enviando el pedido a diario. Si es así, el algoritmo está cumpliendo fielmente un pedido repetido.

## Causa 2 — la guardia solo ve títulos idénticos
- `selectValidTitles` descarta un título solo si su forma normalizada (minúsculas, sin tildes ni signos) es **idéntica** a una existente (`avoid.has(key)`).
- A la IA solo se le muestran 60 títulos previos (`MAX_AVOID_IN_PROMPT`), priorizando la misma categoría; el resto solo cuenta para el filtro exacto.
- Resultado: la IA recibe «no repitas», pero puede reformular; y el código no lo detecta.
- La guardia de Oportunidades compara de forma igual de literal contra los títulos publicados (`findPublishedTitleMatch`).

## Lo que NO se pudo comprobar
- Que Inés **borre** y por eso reaparezcan: antes del 1/11/2026 los descartes no se guardaban. Desde ahora sí (`ArticleTitleDiscard`).
- Que sea una tarea programada: hay que mirar su conexión de asistente (MCP) desde Administración.

## Propuestas (sin implementar; decide Milton)
| # | Propuesta | Costo de IA | Riesgo |
|---|---|---|---|
| A | Filtro de parecido en código: descartar candidatos con ≥ 60 % de parecido contra lo ya ofrecido/publicado y pedir uno nuevo (como ya hace el reintento) | Ninguno extra | Bajo; con pruebas |
| B | Aviso humano al pedir: «Ya pediste algo muy parecido el 31/10. ¿Quieres otro enfoque?» (no bloquea) | Ninguno | Bajo |
| C | Mostrar al modelo más títulos previos de la misma categoría (de 60 a 120) y los ángulos ya cubiertos | Algo más de texto por solicitud | Bajo |
| D | Revisar la tarea programada de Inés (si existe) para que varíe el tema | Ninguno | Ninguno |

Recomendación: D primero (es la causa de fondo), después A + B. C solo si A no basta.
