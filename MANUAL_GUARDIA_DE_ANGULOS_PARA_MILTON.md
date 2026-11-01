# Guardia de ángulos — manual de una página (para Milton)

**Qué es:** evita que las ideas de títulos con IA (CONTENIDO PROPIO → "Crear con la IA del sistema") se repitan. Mira lo que la persona ya tiene (publicado, sitio, ofrecido antes) y deja fuera lo que repite la misma pregunta. **Siempre entrega al menos 5 títulos.** No repara nada y no toca datos: solo decide qué títulos mostrar.

**Dónde se maneja:** Historial → "Historiales completos" → "Detalle para el administrador" → **Guardia de ángulos**.

## Los tres modos
| Modo | Qué hace | Cuándo usarlo |
|---|---|---|
| **Apagada** | Nada. Todo como antes. | Para frenar al instante si algo no te gusta. |
| **Sombra** | Observa y anota lo que haría. Nadie nota nada. Se apaga sola a los 14 días. | Para medir sin riesgo. Es como está hoy. |
| **Activa** | **Aplica la decisión** al porcentaje de solicitudes que elijas (10 / 25 / 50 / 100 %). | Cuando quieras que de verdad evite repeticiones. |

## Cómo activarla sin riesgo (recomendado)
1. Elige **Activa** al **10 %**. Verás nuevas filas con modo "activo" en la lista de la misma sección.
2. Pasados unos días, mira la lista: ¿cuántas veces "Con nota" > 0? Si casi nunca → sube a 25 → 50 → 100.
3. Si algo no te gusta: elige **Apagada**. Efecto inmediato.

## Lo que la gente ve
- **Casi siempre nada**: solo recibe sus títulos nuevos.
- **Solo si el tema está muy cubierto:** un aviso de una frase y, en algunos títulos, una nota amable ("Se parece a tu artículo «…»; úsalo si quieres cubrirlo con otro enfoque").
- **Nunca** ve errores ni palabras técnicas. Si la guardia falla, recibe lo de siempre.

## Frenos automáticos (no tienes que hacer nada)
- Si una cuenta necesitó notas 2 veces seguidas, la guardia se salta en esa cuenta por 24 h.
- Si 3 de las últimas 10 solicitudes activas fallaron en toda la plataforma, se salta sola.
- En sombra: tope de 60 solicitudes observadas al día (≈ 1 dólar al día) y limpieza de registros de más de 60 días.
- Costo: unos **2 centavos por solicitud** a la que se aplica (modelo gpt-4.1). **Tope duro: 40 solicitudes aplicadas por día ≈ 0,70 dólares al día como máximo**; pasado el tope todo sigue como siempre.
- **Filtro de ahorro:** la guardia no revisa las cuentas con menos de 20 títulos (publicados u ofrecidos) en esa categoría, porque casi no hay qué repetir. Baja el costo cerca de la mitad y no usa IA.
- **Cada persona tiene máximo 3 solicitudes de ideas al día**, así que el gasto no puede dispararse.

## Herramientas de administrador (todas en tu sesión)
- `/api/admin/title-guard/reports` → lo que decidió la guardia en cada solicitud.
- `/api/admin/title-guard/replay?id=…` → repite una decisión con el juez de hoy.
- `/api/admin/title-guard/backtest?limite=20` → repite solicitudes PASADAS de todas las cuentas con el juez de hoy y te dice cuántos títulos habría marcado y cuánto cuesta la prueba (≈ 2 centavos por solicitud). No afecta a nadie.
- `/api/admin/title-guard/baseline` → mide repeticiones en todas las cuentas.
- `/api/admin/title-guard/judge-validation?formato=lista` → comprueba que el juez sigue acertando (debe decir "cumple").

## Lo que NO hace todavía (para que no te sorprenda)
- **No usa Search Console ni Bing** en este camino. Eso es una mejora aparte ("ideas guiadas por la demanda real").
- La subida de 10 % a 100 % es **manual**; todavía no sube sola.
- No avisa por correo cuando se salta sola: solo se ve en la lista de administrador.
- El modo "activo" se probó con casos de prueba y con un caso real repetido (cuenta de Lorena), pero **aún no con tráfico real aplicado**: por eso se empieza al 10 %.

Detalle técnico completo: `ESPECIFICACION_FINAL_GUARDIA_DE_ANGULOS.md`. Historial de decisiones: `CURRENT_STATE.md`.
