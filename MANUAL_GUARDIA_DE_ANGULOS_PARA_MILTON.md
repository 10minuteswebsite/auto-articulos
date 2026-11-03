# Guardia de ángulos — manual de una página (para Milton)

**Qué es:** evita que se repitan los títulos de los DOS módulos: las ideas con IA de CONTENIDO PROPIO ("Crear con la IA del sistema") y las oportunidades de CONTENIDO GENERADO POR IA. En el módulo 2 solo quita títulos repetidos DESPUÉS de que el razonamiento con Search Console y Bing hizo su trabajo: no cambia ninguna señal ni justificación y nunca deja un grupo vacío. Mira lo que la persona ya tiene (publicado, sitio, ofrecido antes) y deja fuera lo que repite la misma pregunta. **Siempre entrega al menos 5 títulos.** No repara nada y no toca datos: solo decide qué títulos mostrar.

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
- Costo: unos **2 centavos por solicitud** a la que se aplica (modelo gpt-4.1). **Topes duros, por separado:** módulo 1 = 40 clics revisados al día (≈ 0,70 dólares al día como máximo); módulo 2 = **sin IA y sin costo** (decisión del 2026-11-01, plan B: solo código quita los títulos casi idénticos; el sorteo es por ejecución, así con 50 % se protege cerca de la mitad de las veces de cada usuario). **Techo total ≈ 0,70 dólares al día.** Pasado el tope todo sigue como siempre. El costo es de TODA la plataforma, no por usuario, y ningún usuario paga nada por esto.
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


## Mejor de dos mundos (2026-11-01)
- **Siempre salen títulos:** módulo 1 entrega 5 o más; módulo 2 conserva al menos 3 por grupo cuando hay de dónde rellenar con los menos parecidos (nunca con casi idénticos ni duplicados exactos) y nunca deja un grupo vacío.
- **Prevenir antes de filtrar:** con la guardia activa, a la IA se le muestran hasta 100 títulos ya cubiertos (antes 60) para que proponga otros ángulos.
- **Juez medido de nuevo:** 8 solicitudes pasadas, marcó 36,1 % (antes 57 %), solo 1 de 8 necesitó completar con notas. Costo de la prueba ≈ 0,14 dólares.

- **Botón 2, títulos del sitio (2026-11-01):** sin juez, un título que se parece 75 % o más a uno que ya está en el sitio también se quita (antes nunca). Los parecidos a lo publicado u ofrecido ya se quitaban desde 60 %. El mínimo de 3 por grupo protege la entrega.

- **Reporte por cuenta (2026-11-01):** en Guardia de ángulos hay un selector «Ver una cuenta»; muestra los últimos 60 reportes de esa cuenta, con el modo y, en «Ver títulos afectados», qué títulos se quitaron o salieron con nota y contra qué se parecían. Solo administrador, solo lectura, sin costo.

- **Corrección de rigidez (2026-11-02):** botón 2: entregar manda. Si tras quitar repetidos quedan menos de 3 por grupo o menos de 5 en total, vuelven los menos parecidos (incluso casi idénticos; nunca duplicados exactos). Antes podía quedar 1 solo título.

- **Bing y caché (2026-11-02):** una consulta fallida de Bing o GA4 ya no se guarda como «0 filas» durante 14 días, y una caché sin filas no se reutiliza. Caso real: Bing de una cuenta falló con «NotAuthorized» el 28/10 y quedó guardado como vacío hasta el 11/11; hay que reconectar Bing en Conexiones.

- **Botón 2: segunda pasada (2026-11-02):** si el análisis termina con menos de 5 títulos, hace UNA segunda pasada con la misma evidencia y las mismas validaciones, mostrando a la IA lo ya aceptado para que proponga necesidades distintas. Medido: cuenta con 2850 filas de evidencia, 31 propuestas, 21 repetidas, quedó 1. Serie diaria real (45 días): el botón 2 produce ~3,6 artículos por cuenta al día, estable antes y después de la guardia.
