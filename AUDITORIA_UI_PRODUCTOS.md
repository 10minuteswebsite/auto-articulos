# Auditoría UI de productos — Bloque 5

Auditoría estática realizada sobre `origin/main` (C-025). No se modificó la interfaz ni se ejecutó producción. Las líneas son las observadas en esta revisión.

## Hallazgos

| Prioridad | Ubicación | Evidencia | Corrección trivial propuesta |
|---|---|---|---|
| P1 | `apps/web/src/app/dashboard/usuarios/UserProductsPanel.tsx:61-70` | `buttonStyle` fija `fontSize: 12px` y `minHeight: 32px`; los cuatro controles por producto quedan por debajo del objetivo táctil de 44px y el texto es pequeño en móvil. | Subir `minHeight` a 44px, conservar el ancho flexible y usar 13–14px; verificar que el grupo siga envolviendo en pantallas estrechas. |
| P1 | `apps/web/src/app/dashboard/usuarios/ProductEnforcementPanel.tsx:78-82` | Los botones del interruptor solo tienen `padding: 8px 14px`, sin `minHeight`; el área táctil depende del texto y puede quedar corta. | Añadir `minHeight: 44px` y `minWidth` razonable; mantener `flexWrap: wrap`, ya presente en la línea 78. |
| P2 | `apps/web/src/components/ProductHome.tsx:81-89` | La fila enlazada usa una cuadrícula fija `42px minmax(0, 1fr) auto`; no hay regla explícita de foco visible y el número decorativo no está marcado como oculto para lectores de pantalla. | Añadir `:focus-visible` reutilizable al enlace; marcar el número como `aria-hidden="true"`. Probar ancho móvil con títulos/descripciones largos. |
| P2 | `apps/web/src/components/ProductAccessGuard.tsx:47-59` | El bloqueo visual tiene enlace con padding 10×20, sin foco visible específico; el texto secundario usa `#6e6e73` sobre blanco, contraste aceptable pero cercano al mínimo para texto pequeño. | Reutilizar el estilo de enlaces/botones con foco visible y subir el texto secundario a un tono con margen de contraste mayor. |
| P2 | `apps/web/src/app/dashboard/usuarios/ProductEnforcementPanel.tsx:87` | El mensaje tras guardar no tiene `role="status"` ni `aria-live`; un usuario de lector de pantalla no recibe necesariamente el resultado de la operación. | Añadir `role="status" aria-live="polite"` al párrafo de mensaje. |
| P2 | `apps/web/src/app/dashboard/usuarios/UserProductsPanel.tsx:224-230` | El error sí usa `role="alert"`, pero los estados de carga y “sin cambios” son texto estático y no están asociados al área que cambia. | Mantener el alert de error; opcionalmente usar `role="status"` para carga y resultado de guardado, sin anunciar cada re-render. |
| P3 | `apps/web/src/components/ProductHome.tsx:53` y `apps/web/src/app/dashboard/mi-acceso/page.tsx:29` | Durante la carga se devuelve `null`, dejando el contenido vacío sin indicador visual. | Renderizar un estado breve con `role="status"` y texto “Cargando…”; no alterar la decisión de acceso. |

## Aspectos comprobados

- Las portadas de Artículos y Redes delegan en `ProductHome` (`apps/web/src/app/dashboard/articulos/page.tsx:8-20` y `apps/web/src/app/dashboard/redes/page.tsx:10-20`).
- `ProductAccessGuard` ya usa `role="status"` para avisos de gracia y conserva el criterio seguro de dejar pasar ante carga/error.
- `ProductEnforcementPanel` usa `aria-pressed` en los tres modos y el grupo permite envolver en móvil.
- `UserProductsPanel` etiqueta el campo numérico por producto con `aria-label` y usa `flexWrap` para los controles.
- `MiAccesoPage` tiene jerarquía de encabezados y tarjetas simples; conviene reutilizar el cliente compartido de `/api/me` en una entrega posterior si se amplía el alcance del cliente.

## Alcance y siguiente paso

Este documento registra hallazgos y correcciones propuestas, como pidió C-025; no aplica cambios de UI en esta rama. La prioridad recomendada es corregir primero tamaños táctiles y anuncios de estado, después foco/contraste y finalmente el estado de carga.
