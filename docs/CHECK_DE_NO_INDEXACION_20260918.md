# CHECK DE NO INDEXACIÓN

Fecha de cierre: 2026-09-18  
Responsable: Codex  
Estado: ARCHIVADA — solución fusionada en producción; prueba final pendiente de ejecución por Milton.

## Problema

Al crear un artículo o un lote para 10MinutesWebsite/TagCrush, la opción
"Desactivar indexación" podía quedar marcada en SEO TOTAL, pero volver a su
valor predeterminado (indexar) antes de guardar en la plataforma externa.

La causa estaba en `apps/worker/src/automation/10minutesWebsite.ts`: el flujo
desmarcaba `#activate_indexing` una sola vez al principio. Después, el proceso
de guardado disparaba `change` sobre `#type` para revalidar el formulario y
ese evento podía reconstruir el formulario y volver a marcar el checkbox.
Además, el error de `setChecked` se ignoraba y se informaba un éxito no
verificado.

## Solución ejecutada

Se fusionó el PR #114, commit `e8a8b18`, en `main`.

- La preferencia se aplica otra vez justo antes de cada guardado.
- El estado real del checkbox se lee y se confirma después de aplicarla.
- Si no se puede confirmar que la indexación quedó desactivada, el worker lo
  informa explícitamente y no presenta un falso éxito.
- El cambio cubre el flujo compartido por 10MinutesWebsite, net y TagCrush.

## Auditorías

1. Integridad: aprobada. Cambio aislado en un solo archivo, sin migraciones ni
   secretos.
2. Funcional: `tsc --noEmit` limpio en `apps/worker`. Los fallos de Vitest
   observados son preexistentes: archivos de prueba sin suites y un import
   roto de `packages/shared`.
3. Regresión/entrega: el código quedó fusionado en producción. La prueba
   automática final con una publicación nueva no se ejecutó porque el enlace
   proporcionado (`articles_id_=97488`) corresponde a un artículo ya creado,
   no a una tarea pendiente de creación. Milton realizará esa prueba final.

## Evidencia visual

El artículo `https://10minuteswebsite.net/dashboard/direct-edit-articles?articles_id_=97488`
mostró el control "Activar indexación en buscadores" marcado. En esa interfaz,
marcado significa indexación activada y desmarcado significa no indexar.

