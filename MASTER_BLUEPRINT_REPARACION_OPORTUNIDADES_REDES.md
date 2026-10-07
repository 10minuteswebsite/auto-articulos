# Proyecto: Cola de publicación de artículos en redes

## Estado

Documento para revisión y aprobación de Milton. No autoriza todavía cambios de código, schema, migraciones ni producción.

Nombre visible aprobado para el botón: **“Generar propuestas para redes y blogs”**.

Este documento incorpora las decisiones de negocio aprobadas y deja las decisiones matemáticas y de implementación bajo responsabilidad técnica de Codex.

## Resultado que se quiere conseguir

El botón **“Generar 1 por cada red”** debe tomar los artículos que ya fueron creados y publicados en el sitio, recorrerlos en el orden correcto y generar como máximo una propuesta por cada red habilitada, conectada y con cupo.

No debe volver a inventar temas. No debe comenzar buscando un título para luego intentar demostrar que era exitoso. La creación de artículos ya utiliza señales de oportunidad; Redes debe consumir esa cola.

## Triple auditoría

### 1. Auditoría del objetivo de negocio

1. Los artículos publicados forman un pool de artículos “tomables”.
2. Redes consume esa cola; no crea otra cola de temas.
3. Un artículo puede publicarse en varias redes distintas, pero no dos veces en la misma red.
4. Una oportunidad pendiente bloquea temporalmente ese artículo en esa red.
5. Una publicación confirmada bloquea permanentemente esa combinación de artículo y red.
6. GSC, GA y Bing no generan temas nuevos. Ordenan los candidatos elegibles usando todas las fuentes que tengan datos disponibles.
7. No se implementará un bloqueo por similitud temática o canibalización SEO en este módulo. La regla será evitar repeticiones por artículo y red/formato.

### 2. Auditoría del código y los datos actuales

El código actual confirma estos problemas:

- `generate-all/route.ts` llama por HTTP a `/generate` una vez por red y no reenvía la cookie de sesión.
- Cada llamada repite autenticación, conexiones, cupos, señales de rendimiento y selección de artículos.
- La ruta individual usa `slice(0, 3)`, aunque la interfaz promete una propuesta.
- La ruta agregadora no incluye Google Business Profile.
- X está forzada a `false` en el cálculo de redes, pero aún aparece en partes del sistema.
- `SocialOpportunity` ya registra `titleId`, `articleUrl`, `platform`, `status` y `publishedAt`.
- La lógica actual no tiene una restricción única suficiente para proteger contra dos solicitudes simultáneas.
- `User.socialDailyLimits` y los permisos `allow*Publishing` ya existen en Administración.

Conclusión: primero debe extraerse un servicio común y después decidir si `SocialOpportunity` se refuerza o si se crea un registro adicional. No se debe crear otra tabla sin comprobar si duplica la responsabilidad de la tabla existente.

### 3. Auditoría de riesgos

- Dos pestañas pueden crear duplicados si no existe protección transaccional.
- Una oportunidad creada no equivale a una publicación exitosa. El bloqueo definitivo ocurre cuando la publicación termina correctamente.
- Consultar GSC, GA y Bing por cada red puede provocar timeout; deben cargarse una sola vez.
- Modificar Prisma requiere migración en el mismo cambio y aplicación controlada en producción.
- Los formatos de Instagram pueden requerir claves de duplicado distintas.
- Los errores de una red no deben cancelar las demás, pero deben quedar registrados.
- Las métricas de GSC, GA y Bing no pueden sumarse en bruto porque usan escalas diferentes.

## Algoritmo aprobado para diseñar

### Paso 1: cargar contexto una sola vez

Obtener una sola vez:

- usuario autenticado;
- permisos de Redes;
- redes y formatos autorizados;
- conexiones activas;
- límites diarios de Administración;
- artículos publicados con URL;
- oportunidades existentes;
- señales disponibles de GSC, GA y Bing.

### Paso 2: construir el pool de artículos tomables

El pool contiene artículos publicados con URL válida. Se ordena principalmente por el rendimiento combinado disponible de GSC, GA y Bing. Si un artículo no tiene señales disponibles en ninguna fuente, queda al final y se ordena por fecha de publicación.

Dos registros `Title` con la misma URL normalizada se consideran el mismo artículo para evitar duplicados.

### Paso 3: filtrar por red

Para cada red o formato se excluyen artículos que:

- ya fueron publicados en esa red/formato;
- tienen una oportunidad pendiente en esa red/formato;
- están bloqueados por una regla de no repetición;
- no tienen URL válida;
- pertenecen a un grupo temático ya seleccionado en el mismo lote;
- superarían el cupo administrativo.

### Paso 4: priorizar

GSC, GA y Bing ordenan los artículos tomables. Se suman las señales de las fuentes disponibles; una fuente sin datos no bloquea ni penaliza por sí sola. No incorporan artículos nuevos ni inventan títulos.

La prioridad será:

1. elegibilidad;
2. rendimiento combinado de las fuentes disponibles;
3. fecha de publicación para artículos sin señales o como desempate.

El puntaje exacto debe documentarse y probarse antes de programar.

### Paso 5: crear propuestas

Se crean tantas propuestas por red/formato como permita el cupo diario disponible, sin superar el límite administrativo.

El resultado debe indicar para cada red el artículo elegido, la oportunidad creada, el motivo de exclusión si no se creó, el cupo utilizado y el error si ocurrió.

## Indicador compuesto de rendimiento

Codex diseñará un indicador común para comparar artículos sin sumar valores brutos de fuentes incompatibles.

El indicador deberá:

- normalizar por fuente las métricas disponibles;
- considerar rendimiento actual y crecimiento cuando exista histórico;
- evitar que GSC, GA o Bing domine solo por manejar números mayores;
- ignorar una fuente cuando no tenga datos válidos;
- producir un puntaje comparable entre artículos;
- dejar trazabilidad de sus componentes para poder auditar por qué un artículo quedó arriba de otro.

La fórmula exacta será una decisión técnica y deberá documentarse con ejemplos y pruebas antes de implementarse.

## Regla definitiva de repetición

La unidad de identidad será:

```text
userId + articleUrl normalizada + platform/formato
```

Esto permite publicar un artículo en Threads y LinkedIn, pero impide publicarlo dos veces en Threads.

Para artículos sin señales de GSC, GA ni Bing, el desempate será la fecha en que el artículo fue publicado en el sitio, no la fecha interna de procesamiento.

Instagram se dividirá en cinco formatos independientes:

- publicación;
- reel;
- carrusel;
- historia;
- infografía.

Antes de implementar, debe revisarse si el valor actual de `platform` distingue correctamente formatos de Instagram y Google Business Profile. Si no los distingue, debe corregirse sin perder historial.

La protección debe existir en dos niveles:

1. comprobación de aplicación;
2. restricción única o mecanismo transaccional para carreras simultáneas.

## Estados y bloqueo

- `pending`: propuesta creada; bloquea temporalmente artículo + red/formato.
- `queued` o `processing`: publicación en curso; continúa bloqueando.
- `published`: publicación confirmada; bloquea definitivamente artículo + red/formato.
- `skipped`: no se publicó; el artículo permanece en el pool de artículos tomables para esa red/formato.
- `error`: no se considera publicado; permite reintento controlado.

Regla aprobada: `skipped` y `error` no son publicación definitiva. El artículo puede volver a ser tomado, sujeto a que no tenga una propuesta pendiente y a las demás reglas de elegibilidad.

## Administración y redes

Debe respetarse:

- permisos `allow*Publishing`;
- `socialDailyLimits`;
- límites por plataforma/formato;
- valor `0` para bloquear;
- conexión real y vigente.

X queda fuera del flujo actual. Si se conserva para el futuro, debe controlarse mediante una bandera administrativa explícita, no mediante un `false` escondido en el código.

Google Business Profile participa cuando tiene autorización, conexión y cupo.

## Arquitectura propuesta

Extraer una única función de dominio, usada por el botón individual y por el agregador:

```ts
generateOpportunitiesForNetworks({
  userId,
  requestedNetworks,
  mode: "single" | "all",
})
```

El agregador no debe llamar HTTP internamente a `/generate`.

Debe devolver:

```ts
{
  created: [{ platform, format, opportunityId, titleId, articleUrl }],
  skipped: [{ platform, format, reason }],
  errors: [{ platform, format, reason }]
}
```

## Base de datos

Se reforzará `SocialOpportunity`, porque ya registra la propuesta y su resultado.

No se creará una tabla paralela de publicaciones salvo que la auditoría técnica demuestre una imposibilidad real de proteger el historial dentro de `SocialOpportunity`.

La protección contra duplicados combinará:

- comprobación de aplicación;
- restricción única o índice equivalente sobre la identidad de artículo, red y formato;
- operación transaccional para que dos clics simultáneos no creen la misma oportunidad.

No se debe usar una tabla nueva para ocultar una regla de negocio todavía indefinida.

Si se requiere migración:

- schema y migración van juntos;
- se prueba en una base aislada;
- es aditiva y sin pérdida de datos;
- se aplica y verifica manualmente según Coordinación;
- no se usa `accept_data_loss` ni `force_sync`.

## Fase 0 obligatoria antes de programar

Codex debe entregar para aprobación:

1. mapa exacto de archivos afectados;
2. contrato de la función común;
3. decisión final sobre `SocialOpportunity` o tabla nueva;
4. índice o restricción contra duplicados;
5. definición final de formatos;
6. tratamiento de `skipped` y `error`;
7. puntaje y desempates de GSC/GA/Bing;
8. estrategia contra carreras simultáneas;
9. pruebas unitarias y de integración;
10. plan de migración, si aplica;
11. plan de despliegue y verificación.

**No deberá escribirse una sola línea de código hasta aprobar esta Fase 0.**

## Criterios de aceptación

1. El botón funciona con sesión autenticada.
2. No usa llamadas HTTP internas repetidas.
3. Genera como máximo una propuesta por red/formato.
4. Respeta permisos, conexiones y límites.
5. Consume artículos existentes en el orden definido.
6. Usa GSC, GA y Bing solo cuando hay exceso de candidatos.
7. No repite `articleUrl + red/formato`.
8. Dos clics simultáneos no crean duplicados.
9. Una publicación fallida no queda registrada como publicada.
10. Las propuestas pendientes bloquean el mismo artículo para la misma red.
11. Los errores se muestran por red sin ocultar los éxitos.
12. X no participa del flujo actual.
13. Google Business Profile se incluye cuando corresponde.
14. Se conserva auditoría de cada decisión.
15. No se toca producción ni schema sin aprobación explícita.

## Decisiones cerradas

- El mismo artículo puede publicarse en redes diferentes.
- El mismo artículo no puede repetirse en la misma red/formato.
- Redes no crea temas nuevos.
- GSC, GA y Bing ordenan los artículos existentes usando todas las señales disponibles.
- Los artículos sin señales quedan al final por fecha de publicación.
- El botón usa todo el cupo diario disponible, no solo una propuesta por red.
- Una propuesta pendiente hace que ese artículo se salte para esa red/formato.
- Una publicación exitosa bloquea el artículo para esa red/formato.
- Un artículo publicado en una red puede utilizarse en otra red.
- Un artículo descartado permanece en el pool de artículos tomables.
- El agregador es una sola ejecución coordinada.
- X queda fuera del flujo actual.
- La base actual se audita antes de crear una tabla nueva.

## Decisiones técnicas asumidas por Codex

1. Se usará la fecha de publicación del artículo para artículos sin señales.
2. Se construirá un indicador compuesto normalizado para GSC, GA y Bing.
3. Instagram se separará en publicación, reel, carrusel, historia e infografía.
4. Se reforzará `SocialOpportunity` con protección transaccional y contra duplicados.
5. No se creará una tabla paralela salvo imposibilidad técnica demostrada.

## Decisiones de negocio aprobadas

- Los artículos descartados permanecen en el pool de artículos tomables.
- El pool se ordena por rendimiento combinado de las fuentes disponibles.
- Los artículos sin señales quedan al final por fecha de publicación.
- Se utiliza todo el cupo diario disponible.
- Si un artículo tiene una propuesta pendiente, se salta para esa red/formato.
- Una publicación exitosa bloquea el artículo para esa red/formato.
- El mismo artículo puede publicarse en redes distintas.
- Instagram separa sus cinco formatos.
- No se implementa un bloqueo adicional por similitud temática.
- X queda fuera del flujo actual.
