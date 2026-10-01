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

Durante la migración se importan todas las cuentas. Solo las cuentas con
`trialUnlocked=true` reciben el entitlement gratuito de SEO Total; las demás
permanecen visibles en el Hub sin acceso al producto. El login actual sigue
activo hasta una orden manual posterior al lanzamiento.

Los cambios de correo se resuelven por el identificador local estable y
actualizan el correo en el Hub sin crear una segunda cuenta.

## Protección de datos

La migración nunca reescribe IDs ni elimina artículos, proyectos,
configuraciones, integraciones o historial. Los secretos del contrato se
configuran únicamente como variables protegidas.
