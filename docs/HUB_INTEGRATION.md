# Integración con LA Solución IA Hub

Estado: preparación de staging — 2026-10-01

Auto Artículos conserva la base operativa y sus IDs locales. El Hub es la
fuente de verdad de identidad y acceso. La relación persistente usa
`User.hubUserId` y nunca sustituye el `User.id` local.

## Acceso desde el Hub

`/auth/hub` recibe un código temporal emitido por el Hub, lo canjea por HTTPS
desde el servidor, resuelve la cuenta por `hubUserId` o correo normalizado y
crea la cookie local existente. No se comparten cookies Auth0 ni contraseñas.
Una entrada válida activa el acceso local; las siguientes peticiones
revalidan el entitlement contra el Hub antes de permitir operaciones
protegidas.

## Sincronización dual

Las altas, cambios de perfil, roles y estado llaman al endpoint protegido del
Hub. Si el Hub no responde, el usuario local no se pierde: queda registrado el
intento y el error, y el workflow `sync-hub-users` reintenta la reconciliación.

Durante la migración se importaron todas las cuentas. Las 104 cuentas ya
migradas reciben los entitlements gratuitos iniciales de Auto Artículos y
Redes Totales. Las cuentas nuevas se sincronizan como identidades conocidas,
pero su acceso comercial lo decide el Hub. El login actual sigue activo hasta
una orden manual posterior al lanzamiento.

La sincronización automática se ejecuta cada diez minutos y apunta al Hub de
producción. El destino de staging solo se utiliza cuando se selecciona
explícitamente en una ejecución manual.

Los cambios de correo se resuelven por el identificador local estable y
actualizan el correo en el Hub sin crear una segunda cuenta.

## Protección de datos

La migración nunca reescribe IDs ni elimina artículos, proyectos,
configuraciones, integraciones o historial. Los secretos del contrato se
configuran únicamente como variables protegidas.
