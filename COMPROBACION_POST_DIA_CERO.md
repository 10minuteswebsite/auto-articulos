# Comprobación después del Día Cero

Documento B.4 de C-046. Se completa desde una cuenta de prueba y desde una cuenta real solo con permiso de Milton. No cambia derechos ni conexiones: comprueba que todo siga funcionando.

## URLs a revisar

1. `/dashboard/articulos` — el inicio de Artículos carga y permite ver el módulo.
2. `/dashboard/redes` — el inicio de Redes carga y muestra el estado de acceso.
3. `/dashboard/mi-acceso` — los productos y su estado se muestran sin datos de otra cuenta.

## Calendario

| Momento | Qué comprobar | Resultado esperado | Si falla |
|---|---|---|---|
| 15 minutos | Abrir las 3 URLs; entrar a Artículos y Redes; revisar menú; llamar `/api/me` | No hay pantalla en blanco, bucles ni sesión perdida; los productos corresponden a la cuenta | Capturar hora, URL y mensaje; no cambiar el interruptor |
| 1 hora | Repetir en móvil y escritorio; abrir Historial y Progreso; comprobar una conexión OAuth ya guardada | Las pantallas compartidas siguen visibles; la conexión existente no pide reconectar | Pausar la prueba de esa cuenta y registrar proveedor/URL |
| 24 horas | Revisar logs de web y worker; comprobar `/api/me`; verificar una operación de Artículos y una de Redes | Sin errores nuevos de acceso, callback o publicación; cada operación conserva su cuenta | Marcar la operación afectada como NO EJECUTADA y avisar a Milton |
| 7 días | Comparar errores y accesos con la semana anterior; revisar cuentas con Artículos, Redes, ambos y ninguno | No aparecen bloqueos falsos ni mezcla de datos; ningún usuario pierde conexiones | Mantener enforcement apagado y preparar una reversa concreta |

## Comprobación de proveedores

Para cada conexión existente, revisar solo lectura: proveedor, usuario conectado, fecha de última conexión y último error. No pulsar “desconectar” ni “reconectar” como parte de esta lista. Si se hace una conexión de prueba, confirmar que el callback vuelve al mismo host desde el que comenzó.

## Comprobación de `/api/me`

Confirmar que devuelve `products`, `productEnforcement`, `disabledModules`, `socialPublishingApproved`, `role` e `isActingAdmin` para la sesión correcta. Si responde con error, no inferir derechos desde el token ni activar enforcement.

## Registro mínimo por fallo

Fecha/hora, cuenta de prueba, URL, proveedor si aplica, mensaje visible, código HTTP, request id o log relacionado y si el fallo se repite. No copiar tokens, cookies ni secretos.

## Regla de reversa

Ante un bloqueo falso o una mezcla de datos: detener la prueba de ese caso, mantener `product_enforcement=off`, conservar los datos y pedir a Milton una decisión única antes de tocar una configuración compartida.
