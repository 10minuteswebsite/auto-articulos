# Plan de pruebas manuales — retorno único

## `/api/admin/dia-cero`

Estas pruebas son una guía manual. No se ejecutan automáticamente ni aplican cambios.

| Caso | Preparación | Acción | Resultado esperado | Reversa / evidencia |
|---|---|---|---|---|
| Simulación | Administrador autenticado; `DIA_CERO` apagado | Enviar la acción de simulación una vez | Devuelve el resumen de cambios previstos; no modifica usuarios ni conexiones | Guardar respuesta sin secretos |
| Aplicar | Administrador autenticado; respaldo disponible | Confirmar la aplicación con la palabra exacta indicada por el panel | Aplica una sola vez, devuelve resumen y deja marca de respaldo | Usar la acción de revertir del panel si el resumen es incorrecto |
| Doble aplicar | Aplicación ya realizada | Repetir la misma acción | Respuesta segura de ya aplicado o sin cambios duplicados; no crea perfiles repetidos | Registrar respuesta y hora |
| Revertir | Existe una aplicación previa y su respaldo | Elegir revertir desde el panel | Restaura solo lo guardado por esa aplicación; no borra datos posteriores | Comparar resumen antes/después |
| No administrador | Usuario normal o sesión sin rol admin | Intentar simulación, aplicar y revertir | HTTP 403/denegación clara; no cambia nada | Registrar código HTTP; no escalar permisos |

### Evidencia mínima

Para cada caso guardar fecha/hora, rol de la sesión, modo (simulación/aplicar/revertir), código HTTP, resumen visible y log relacionado. No guardar contraseñas, tokens ni cookies.
