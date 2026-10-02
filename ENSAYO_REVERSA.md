# Ensayo de reversa — separación por productos

Guion documental. No se ejecutó contra producción ni se cambió ningún interruptor.

## 1. Reversa del interruptor

1. Entrar en Administración → Productos y confirmar el modo actual.
2. Si está en **Activo**, pulsar **Sombra** y confirmar que el panel muestre Sombra.
3. Revisar que las nuevas peticiones ya no se bloqueen: los registros `[product-access] product access denied` deben quedar como observación, no como respuestas 403 de enforcement.
4. Si el comportamiento sigue siendo incorrecto, pasar de **Sombra** a **Apagado**.
5. Confirmar en el panel que el modo sea Apagado y repetir una ruta de Artículos y una de Redes con una cuenta de prueba.

## 2. Gracia convertida de forma incorrecta

1. No borrar filas ni ejecutar `accept_data_loss` o `force_sync`.
2. Identificar en el panel el producto, usuario, fecha de gracia y evento que quedó mal.
3. Si corresponde conservar el acceso, usar **Dar gracia** con la fecha/días correctos; si no corresponde, usar **Desactivar** o **Quitar gracia** según el caso aprobado.
4. Revisar el historial del usuario: debe existir el evento correctivo y la versión debe avanzar.
5. Probar `/api/me` y una ruta del producto con esa cuenta; confirmar que el estado mostrado coincida con el evento más reciente.

## 3. Vista por productos activada por error

1. En Administración → Módulos, deshabilitar el módulo opt-in `vista-productos` para la cuenta o devolverlo al estado previo.
2. Confirmar que las portadas de Artículos, Redes y «Mi acceso» muestran el aviso de vista no disponible y que Inicio conserva el flujo anterior.
3. Abrir una ruta antigua de cada producto: la vista visual puede desaparecer, pero la barrera real sigue dependiendo de los permisos del servidor.
4. Confirmar que no se modificaron derechos ni conexiones: la reversa de la vista es independiente de `ProductEntitlement`.

## 4. ¿Qué pasos son realmente posibles hoy?

| Paso | ¿Es posible con las pantallas actuales? | Comprobación |
|---|---|---|
| Enforce → Sombra → Apagado | Sí. `ProductEnforcementPanel` ofrece los tres botones; la API exige transición segura para subir a Enforce y permite bajar. | El panel muestra el modo nuevo y una petición de producto deja de bloquear en Sombra/Apagado. |
| Corregir una gracia desde Productos | Sí, para un administrador. `UserProductsPanel` ofrece Activar, Desactivar, Dar gracia y Quitar gracia; el historial permite comprobar el evento. | El estado, fecha/días y evento correctivo coinciden en la ficha del usuario. |
| Deshabilitar `vista-productos` globalmente | Sí, si el administrador tiene acceso a Administración → Módulos: el panel global permite editar módulos. | `/api/me` devuelve `vista-productos` en `disabledModules` y las portadas muestran el aviso anterior. |
| Deshabilitar `vista-productos` solo para una cuenta | Sí. `usuarios/page.tsx` expone la edición de `disabledModules` por cuenta y guarda el override. | La ficha guarda el override y solo esa cuenta vuelve al Inicio clásico. |
| Revertir una conversión masiva incorrecta con un botón | No. No hay botón de deshacer masivo; hay que corregir por usuario/producto desde Productos o usar un procedimiento revisado y aprobado. | No ejecutar SQL improvisado; verificar eventos y versión por cada corrección. |
| Confirmar toda la reversa desde una sola pantalla | No. El interruptor, módulos y derechos viven en paneles separados. | Comprobar cada panel y luego `/api/me`/una ruta de prueba. |

## Criterio de éxito

La reversa funciona cuando el panel muestra el modo esperado, una cuenta de prueba puede recorrer las rutas que debe conservar, los registros dejan de mostrar bloqueos inesperados y el historial conserva el evento correctivo. Si no se cumple, mantener Apagado y escalar antes de tocar schema, migraciones o producción.
