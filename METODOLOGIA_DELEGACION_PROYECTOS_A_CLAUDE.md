# Metodología genérica para delegar proyectos a Claude

## Propósito

Este documento define cómo transferir un proyecto a otra conversación de Claude sin perder contexto, repetir trabajo ni permitir que el agente improvise decisiones importantes.

La delegación se hace mediante un paquete de continuidad: un documento principal que explica qué debe hacer Claude, documentos de estado que demuestran dónde quedó el proyecto y reglas que delimitan lo que puede modificar.

## 1. Principio general

Claude no debe recibir únicamente una petición como “continúa el proyecto”. Debe recibir cinco cosas:

1. Qué problema resuelve el proyecto.
2. Qué decisiones ya están aprobadas.
3. Qué trabajo ya está terminado y cómo fue verificado.
4. Qué trabajo queda exactamente pendiente.
5. Qué acciones están prohibidas hasta recibir autorización.

La conversación nueva debe poder empezar leyendo los documentos, sin depender de explicaciones dispersas en el chat anterior.

## 2. Clasificar el trabajo antes de delegar

Antes de preparar el traspaso, clasifica el proyecto en una de estas categorías:

- **Consulta o revisión:** Claude solo analiza y reporta.
- **Diagnóstico:** Claude encuentra la causa, pero no implementa sin autorización.
- **Implementación local:** Claude modifica código y prueba, pero no publica.
- **Preparación para publicación:** Claude reconcilia los cambios con producción y prepara el lanzamiento.
- **Operación productiva:** Claude publica, verifica producción y actualiza la memoria durable.

No mezcles estas categorías. Si el objetivo es implementación local, debe quedar explícito que no se permite publicar, desplegar, abrir PR o modificar producción.

## 3. Crear el paquete de delegación

El paquete debe tener, como mínimo, estos documentos:

### A. Documento de transferencia

Nombre recomendado:

`TRANSFERENCIA_CLAUDE_[PROYECTO]_[FECHA].md`

Debe contener:

- propósito de la transferencia;
- responsable anterior y responsable nuevo;
- fecha y alcance;
- decisiones tomadas;
- arquitectura existente;
- archivos importantes;
- comandos de verificación;
- trabajo terminado;
- trabajo pendiente;
- riesgos conocidos;
- bloqueadores;
- siguiente punto exacto de continuación.

### B. Prompt ejecutable de continuación

Nombre recomendado:

`PROMPT_CLAUDE_CONTINUACION_[PROYECTO].md`

Debe ser una instrucción lista para copiar y pegar en Claude. Debe comenzar así:

> Toma el control del proyecto [NOMBRE] desde el punto exacto documentado. No reinicies el proyecto. Lee los documentos indicados antes de modificar código.

Incluye después:

- lecturas obligatorias y orden de lectura;
- objetivo de la fase actual;
- tareas concretas;
- pruebas requeridas;
- criterios de cierre;
- formato de entrega al terminar.

### C. Documento de preguntas y respuestas

Nombre recomendado:

`CLAUDE_PREGUNTAS_RESPUESTAS_[PROYECTO].md`

Sirve como canal asíncrono. Claude no debe interrumpir al propietario por cada duda menor. Debe escribir allí las preguntas que no bloquean el trabajo y continuar todo lo seguro.

Formato:

```md
## PREGUNTA 1 — AAAA-MM-DD HH:MM
- Estado: ABIERTA
- Contexto:
- Pregunta:
- Archivos o decisión afectada:
```

Cuando exista una respuesta:

```md
## RESPUESTA 1 — AAAA-MM-DD HH:MM
- Respuesta:
- Decisión adoptada:
- Impacto en el trabajo:
```

### D. Estado del proyecto

Debe indicar:

- rama y commit de referencia;
- entorno en el que se trabajó;
- estado de producción, si aplica;
- pruebas ya ejecutadas;
- cambios locales sin publicar;
- migraciones pendientes;
- variables y secretos requeridos, sin incluir secretos reales.

## 4. Separar hechos, decisiones y pendientes

Cada afirmación del traspaso debe pertenecer a una de estas categorías:

### Hechos verificados

Ejemplos:

- `typecheck` pasó correctamente.
- Se ejecutaron 44 pruebas y las 44 pasaron.
- No existe despliegue productivo confirmado.

### Decisiones aprobadas

Ejemplos:

- el artículo se publica únicamente en el blog;
- no se debe duplicar en otro destino;
- el desarrollo actual es local;
- el flujo existente de publicación no se reemplaza.

### Pendientes

Ejemplos:

- configurar el proveedor real;
- verificar DNS y TLS;
- realizar E2E productivo;
- actualizar la documentación después de publicar.

Nunca presentes una intención, una configuración local o un mock como si fuera una integración productiva verificada.

## 5. Reglas no negociables

El documento debe repetir de forma visible las reglas que Claude no puede interpretar libremente. Como base:

- producción es la verdad funcional;
- GitHub es la memoria durable;
- no borrar ni resetear cambios;
- no mezclar trabajos ajenos;
- no usar `git add .` ni `git add -A`;
- no crear ramas ni worktrees si el propietario no lo autoriza;
- no publicar ni desplegar durante la fase local;
- no modificar producción durante la fase local;
- no inventar proveedores, dominios, secretos, precios o requisitos;
- no declarar terminado el proyecto solo por pasar typecheck;
- proteger las superficies que están fuera del alcance;
- si una integración real no está verificada, escribir: “configuración/código verificados; E2E pendiente”.

Si el proyecto tiene una regla de negocio crítica, repetirla también en el objetivo y en los criterios de cierre.

## 6. Pedir primero el mapa, después el código

Para proyectos medianos o complejos, Claude debe documentar antes de programar:

- mapa de navegación;
- flujo principal;
- permisos por tipo de usuario;
- modelo de estados;
- endpoints;
- eventos y colas;
- validaciones;
- manejo de errores;
- estrategia de recuperación;
- pruebas necesarias;
- superficies que deben permanecer intactas.

Esto evita que Claude implemente únicamente la pantalla visible y olvide permisos, persistencia, aislamiento entre cuentas, reintentos o regresiones.

## 7. Diseñar el objetivo por fases

Cada fase debe tener un objetivo limitado y comprobable:

```md
## Fase actual

### Objetivo
Una frase concreta.

### Incluye
- tarea 1
- tarea 2

### No incluye
- tarea fuera de alcance 1
- tarea fuera de alcance 2

### Criterios de cierre
- criterio funcional
- criterio de seguridad
- criterio de pruebas
- criterio documental
```

La frase “continúa el proyecto” no es suficiente. Debe decirse exactamente qué pantalla, endpoint, migración o flujo queda pendiente.

## 8. Protocolo de preguntas y bloqueos

Claude debe seguir estas reglas:

1. Resolver por sí mismo las dudas cubiertas por los documentos.
2. Registrar preguntas menores en el archivo de preguntas.
3. Continuar el trabajo que no dependa de la respuesta.
4. Detenerse solo si la decisión afecta producto, secretos, migraciones irreversibles, producción o riesgo de pérdida de trabajo.
5. No convertir una preferencia técnica en una pregunta de producto.
6. No inventar una respuesta para evitar un bloqueo real.

## 9. Protocolo de verificación

Antes de entregar el trabajo local, Claude debe ejecutar únicamente las verificaciones relacionadas y reportar el resultado exacto:

- typecheck;
- pruebas unitarias e integración;
- pruebas E2E cuando existan;
- validación de migraciones;
- `git diff --check`;
- revisión del diff completo;
- pruebas de regresión de las superficies protegidas;
- comprobación de aislamiento entre tenants, si aplica;
- comprobación de idempotencia, reintentos y errores, si aplica.

El reporte debe distinguir:

- pruebas pasadas;
- pruebas no ejecutadas;
- integraciones simuladas;
- E2E pendiente;
- bloqueadores reales.

## 10. Protocolo para producción

La publicación debe ser una fase separada. Antes de publicar:

1. Leer nuevamente las reglas operativas.
2. Comprobar `main`.
3. Identificar el commit realmente desplegado.
4. Confirmar si producción cambió.
5. Comparar el código local contra producción.
6. Adaptar únicamente los cambios propios.
7. Revisar migraciones, variables y secretos.
8. Ejecutar las pruebas completas.
9. Publicar solo mediante el flujo autorizado.
10. Verificar el dominio productivo con evidencia real.
11. Actualizar la documentación de estado, coordinación, checkpoints y control de versiones.

Nunca se debe publicar directamente porque las pruebas locales pasaron.

## 11. Formato de entrega de Claude

Al finalizar cada turno, Claude debe entregar:

```md
## Resultado

### Archivos modificados
- ruta — cambio realizado

### Funciones implementadas
- función o flujo

### Pruebas ejecutadas
- comando — resultado

### Bloqueadores reales
- ninguno, o explicación concreta

### Decisiones pendientes
- ninguna, o enlace a la pregunta registrada

### Siguiente punto cero
- commit, fase o acción exacta para continuar

### Publicación
- No hubo publicación ni despliegue.
```

## 12. Cómo reutilizar esta metodología rápidamente

Para delegar un nuevo proyecto, completa esta plantilla mínima:

```md
# Toma de control: [PROYECTO]

## Orden
Toma el control desde el punto exacto documentado. Lee los documentos antes de modificar código. No reinicies ni repitas trabajo terminado.

## Objetivo actual
[Una frase concreta]

## Estado comprobado
- Hecho:
- Hecho:
- Pendiente:
- No verificado:

## Documentos obligatorios
1. [archivo]
2. [archivo]
3. [archivo]

## Reglas absolutas
- [regla]
- [regla]
- [regla]

## Archivos importantes
- [ruta]
- [ruta]

## Trabajo solicitado
1. [tarea]
2. [tarea]

## Pruebas obligatorias
```bash
[comando]
```

## Criterios de cierre
- [criterio]
- [criterio]

## Canal de preguntas
Registra las preguntas no bloqueantes en `[archivo de preguntas]`. Detente solo ante decisiones de producto, secretos, producción, migraciones irreversibles o pérdida de trabajo.

## Entrega final
Reporta archivos, funciones, pruebas, bloqueadores, decisiones pendientes, siguiente punto cero y si hubo publicación.
```

## 13. Resultado esperado

Una buena delegación permite que otra conversación:

- entienda el proyecto sin leer todo el historial;
- sepa qué no debe tocar;
- continúe desde el commit correcto;
- no repita el núcleo ya validado;
- pregunte solo cuando realmente sea necesario;
- entregue evidencia verificable;
- mantenga separadas las fases local, preparación y producción.

La velocidad viene de preparar el contexto una sola vez y convertirlo en memoria durable, no de eliminar las comprobaciones importantes.
