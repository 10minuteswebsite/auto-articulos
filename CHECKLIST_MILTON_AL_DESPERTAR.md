# Checklist de Milton al despertar

## Qué quedó hecho

La separación de Artículos y Redes está preparada y los cambios verificados se han desplegado con el interruptor de derechos apagado. La aplicación sigue funcionando como antes: nadie se bloquea por falta de un derecho nuevo. Hay paneles de administración, historial, vista por productos opt-in y «Mi acceso».

## Tus cinco pendientes, en orden

1. **Registrar callbacks.** Usa `CHECKLIST_CALLBACKS_MILTON.md` para registrar en Google, Meta, Bing y el resto de consolas los callbacks de Artículos y Redes. Google y Meta pueden tardar.
2. **Decidir Sombra.** Cuando los callbacks estén listos, decide si cambiar Apagado a Sombra. Sombra solo registra lo que se bloquearía.
3. **Decidir el schema HUB.** No ejecutes el workflow normal. Elige entre adoptar el schema HUB o declarar las cinco columnas de forma aislada y aditiva, según `ALERTA_SCHEMA_DESALINEADO_HUB.md`.
4. **Autorizar cortes.** Antes de aplicar SQL o activar un modo que bloquee, define ventana, respaldo, operador y reversa.
5. **Mirar Sombra.** Revisa los logs `[product-access] product access denied`, compara usuarios/productos con los derechos reales y corrige gracias o entitlements antes de pensar en Activo.

## Si algo falla

La reversa de emergencia es volver a **Apagado (`off`)** desde Administración. Eso detiene el bloqueo nuevo; no borra datos ni derechos.

No uses `accept_data_loss`, `force_sync` ni `prisma db push` contra producción. No ejecutes el SQL de conversión a gracia sin revisión, simulación y aprobación.
