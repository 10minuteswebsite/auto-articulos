# B.7 — Opcionales: diseño y pruebas, sin fusión

Fecha: 2026-10-02. Estos puntos quedan documentados para una decisión posterior; no cambian la aplicación ni producción.

## `/api/me` compartido (#372)

### Diseño recomendado

1. `fetchMe()` mantiene una sola solicitud en vuelo por pestaña y una respuesta breve en memoria.
2. Al guardar cambios que afectan a derechos, módulos, impersonación o productos, el cliente llama `fetchMe({ force: true })` después de recibir respuesta exitosa.
3. La invalidación se hace por una función explícita (`invalidateMeCache`) y no por esperar a que venza el TTL.
4. Los fallos no se guardan como respuesta válida: el siguiente intento vuelve a pedir `/api/me`.
5. Si cambia la cuenta actuada, se limpia el caché antes de pintar el nuevo usuario.

### Pruebas puras propuestas

| Caso | Resultado |
|---|---|
| Dos llamadas simultáneas | Un solo fetch; ambas reciben la misma respuesta |
| Respuesta dentro del TTL | No repite fetch |
| `force: true` | Hace fetch nuevo aunque el TTL siga vigente |
| Guardado exitoso seguido de invalidación | La siguiente lectura ve derechos nuevos |
| Fetch con error | No deja un error cacheado |
| Cambio de impersonación | No reutiliza datos de la cuenta anterior |

**Decisión:** no modificar #372 ni fusionarlo ahora. Debe revisarse con una prueba de invalidación al guardar y con atención especial a impersonación.

## Panel antiguo de interruptores (#402)

El PR queda aparcado. Si se retoma, sus correcciones mínimas son:

- enviar también el campo `confirm` que exige la API;
- mostrar un campo visible para escribir la confirmación, nunca `window.prompt`;
- deshabilitar «Solo HUB» cuando `hubConfigured` sea falso;
- mantener `product_enforcement` apagado hasta una decisión explícita.

No se fusiona #402 y no se ejecuta ninguna transición del interruptor.

## Reversa

Si se descarta B.7, no hay migración ni limpieza: se cierran o aparcan los PR opcionales y el sistema sigue con la implementación actual.
