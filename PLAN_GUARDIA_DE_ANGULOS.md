# PLAN — Guardia de ángulos: que los títulos no se repitan sin una buena razón

Estado: PLAN para aprobación. No hay código. Fecha: 2026-11-01.

> **Corregido tras la triple auditoría** (`AUDITORIA_TRIPLE_GUARDIA_DE_ANGULOS.md`): los umbrales sobre palabras sueltas eran incorrectos; ahora se usa parecido ponderado por rareza con **≥ 60 % repetido / 38–59 % dudoso**, el juez de IA corre siempre una vez agrupado, y la memoria incluye el sitio y los descartados (90 días) filtrados por sitio. Donde este documento y la auditoría difieran, manda la auditoría. **Auditado en 8 rondas hasta cero errores; la especificación final está al final de `AUDITORIA_TRIPLE_GUARDIA_DE_ANGULOS.md` y reemplaza los umbrales de este plan (85 % rechazo automático, 38–84 % juez de IA).**

**Alcance: el proceso, para TODOS los usuarios.** El caso de Inés (info@inesgarcia-arcaya.com) es solo la primera evidencia medida (`ANALISIS_TEMAS_REPETIDOS_INES.md`); lo que se repara es el algoritmo que genera y valida títulos, que hoy es el mismo para todas las cuentas. Nada de lo que sigue es específico de una persona.

## Objetivo
Ningún título nuevo se parece a algo ya cubierto **salvo que exista una razón buena y guardada** de por qué sí. Y cuando un tema ya está agotado, el sistema lo dice con honestidad en vez de rellenar con reformulaciones.

## Por qué hoy falla (resumen)
1. El filtro solo detecta títulos idénticos; una reformulación al 78 % pasa.
2. A la IA se le muestran 60 títulos sueltos, no un mapa de lo que ya se cubrió.
3. Si la persona (o su asistente) repite el mismo pedido a diario, nadie se lo señala.

## La solución: un módulo único, «Guardia de ángulos»
Un solo módulo puro (`lib/angle-guard-core.ts`, con pruebas) que usan todos los caminos que producen títulos. Tiene cinco piezas.

| # | Pieza | Qué hace | Costo de IA |
|---|---|---|---|
| 1 | **Memoria de lo cubierto** | Junta, por usuario y sitio: artículos publicados, títulos del sitio, títulos ya ofrecidos, y los descartados/borrados (`ArticleTitleDiscard`). Lo que la persona descartó tampoco se vuelve a proponer. | Ninguno |
| 2 | **Detector de parecido en dos capas** | Capa 1 (código, instantánea): parecido de palabras significativas, en español e inglés, sin plurales ni palabras vacías. ≥ 60 % = repetido; 40–59 % = «cercano». Capa 2 (solo para los cercanos): una sola llamada agrupada al modelo de siempre (`gpt-4o-mini`): «¿responde la misma pregunta del lector que este título existente? sí/no y por qué en una frase». | ≈ 1 llamada corta extra, solo si hay cercanos (fracción de centavo) |
| 3 | **Mapa de ángulos en el prompt** | En vez de 60 títulos sueltos, se agrupan por ángulo en código («precio de venta: 4 artículos», «preparar la casa: 3») y se le dice a la IA qué ángulos YA están cubiertos y que proponga ángulos NUEVOS dentro del tema. | Menos texto, no más |
| 4 | **Generar → verificar → reponer** | Se piden más candidatos de los necesarios (por ejemplo 14 para 9), se pasan por la guardia y se repone con el único reintento que ya existe (máximo 2 llamadas de generación, como hoy). | Igual que hoy |
| 5 | **Registro con razón** | Cada título descartado por repetido y cada título «cercano» aceptado quedan guardados con su motivo y con el título existente con el que se compararon. Esto alimenta «¿Por qué estos títulos?»: «se descartaron 5 ideas por repetir X; se aceptó Y porque responde otra pregunta: …». | Ninguno |

### Regla de oro: nunca se deja a la persona sin resultado ni con relleno
- Si después de la guardia quedan menos de 5 títulos, se completan con los mejores «cercanos» **con su justificación visible**.
- Si más de la mitad de los candidatos se rechazan en los dos intentos, el sistema no inventa: avisa en español sencillo «Este tema ya está muy cubierto en tu sitio. Prueba con otro tema o con un enfoque distinto» y sugiere ángulos aún sin tocar.

## Pedidos repetidos (la causa de fondo en Inés)
- Se compara el tema de cada pedido nuevo con los pedidos de los últimos 7 días de la misma categoría (misma guardia de parecido).
- Si es ≥ 60 % parecido: no se bloquea. Se le dice a la persona: «Ya pediste algo muy parecido el 31/10. Buscaremos ángulos distintos dentro de ese tema.» y a la IA se le ordena trabajar solo ángulos no cubiertos.
- A los asistentes (MCP) les llega el mismo aviso en el resultado, para que ajusten su tarea.
- Acción aparte, sin código y solo informativa: en la línea base se cuenta cuántas cuentas envían pedidos casi idénticos a la misma hora cada día (tareas programadas o asistentes). Inés es el primer ejemplo, no el único.

## Dónde se aplica
| Camino | Qué cambia |
|---|---|
| CONTENIDO PROPIO (ideas con IA, `title-generation.ts`) | Las cinco piezas completas. |
| CONTENIDO GENERADO POR IA (`opportunity-analysis.ts`) | Pasa sus candidatos por la misma guardia y el mismo mapa; se conserva la guardia por razonamiento del modelo que ya existe. |
| Worker de publicación (`publishedGuard.ts`) | NO se toca: bloquea al publicar y un falso positivo ahí frenaría un artículo. Es el área del otro programador. |

## Seguridad de despliegue (sin tumbar producción)
- **Tabla nueva aditiva** `TitleGuardReport` (userId, solicitud/ejecución, candidatos descartados, aceptados cercanos, motivos, umbral usado, modo). Migración idempotente con `IF NOT EXISTS`, que Milton aplica ANTES de fusionar, como las anteriores. Si la tabla falta, todo funciona igual (try/catch).
- **Interruptor** en `SystemSetting` (sin migración): `apagado` / `sombra` / `activo`.
- **Modo sombra primero (48 h):** la guardia calcula y registra lo que habría rechazado, pero no rechaza. Se compara con la realidad antes de activarla.
- **Cero cambio de modelo de IA** (sigue `gpt-4o-mini`).

## Cómo sabremos que funciona (criterios de aceptación)
0. **Línea base de la plataforma antes de tocar nada:** medir con la misma regla de parecido cuántos títulos «muy parecidos» (≥ 50 %) por lote hay hoy en TODAS las cuentas activas (consulta de solo lectura con todas las solicitudes y artículos). Así se sabe si es un problema general y cuánto mejora.
1. Con los 63 títulos reales de Inés como prueba de oro (primer caso medido, no el único): la guardia señala los casos de 78 %, 56 % y 55 %, y no señala títulos realmente distintos. Se agregan casos de otras cuentas cuando la línea base los muestre.
2. Después de activar: en cualquier cuenta, como máximo 1 título por lote con ≥ 50 % de parecido contra lo anterior, y todo parecido aceptado lleva su razón guardada. Se reporta el promedio de toda la plataforma, antes y después.
3. Si alguien repite el mismo pedido, ve el aviso en español sencillo y recibe ángulos distintos o el aviso de tema agotado.
4. «¿Por qué estos títulos?» menciona qué ideas se descartaron por repetidas.
5. Pruebas automáticas, `tsc` limpio, build verde, producción verificada con captura.

## Fases (cada una se audita, se despliega y se verifica antes de la siguiente)
| Fase | Contenido | Migración |
|---|---|---|
| 1 | Módulo puro + pruebas con los datos reales de Inés (sin desplegar comportamiento) | No |
| 2 | Tabla `TitleGuardReport` + integración en CONTENIDO PROPIO en **modo sombra** | Sí (Milton primero) |
| 3 | Mapa de ángulos en el prompt, aviso de pedido repetido, modo **activo**, explicación enriquecida | No |
| 4 | Integración en CONTENIDO GENERADO POR IA | No |
| 5 | Evaluación de 7 días con Inés, ajuste de umbrales | No |
| 6 (opcional) | Parecido por significado con vectores (embeddings), solo si la medición muestra que hace falta | Sí |

## Riesgos
| Riesgo | Mitigación |
|---|---|
| Rechazar títulos buenos (falso positivo) | Umbrales medidos con datos reales; modo sombra; los «cercanos» pasan con justificación en vez de bloquearse |
| Mucho texto nuevo para el cliente | Los avisos son de una frase; el detalle vive solo en «¿Por qué estos títulos?» (cerrado de entrada) |
| Costo de IA | Una llamada corta extra solo si hay cercanos; el tope de 1 explicación al día sigue igual |
| Idiomas | Palabras vacías y plurales para español e inglés; el resto se amplía con datos |

## Decisiones que necesito de Milton
1. ¿Umbral de «repetido» en 60 % y «cercano» entre 40 y 59 %? (Propuesto; se ajusta con datos.)
2. ¿Lo que la persona descartó o borró tampoco se vuelve a proponer? (Propuesto: sí.)
3. ¿Modo sombra de 48 h antes de activar? (Propuesto: sí.)
4. ¿Aviso de pedido repetido solo informa, sin bloquear? (Propuesto: sí.)
5. Autorización para la tabla nueva `TitleGuardReport`, que aplicarías tú en Supabase antes de fusionar.
6. ¿Autorizas la medición de línea base en todas las cuentas, en solo lectura y sin mostrar datos personales (solo conteos por cuenta)?
