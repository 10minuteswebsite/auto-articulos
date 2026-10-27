# MCP-CREDENTIAL-LOGIC-20261027 — revisión y reparación propuesta

## Alcance y punto cero

27/10/2026, desde19:32 America/New_York. Revisar emisión, almacenamiento,
transporte, validación, revocación y permisos MCP para preparar la reparación.
GitHub main y Vercel: `e3613783a2a79694ad276703c5f25754afef4d77`,
`dpl_Grjjoydb2VxuFEV26fYrVeDn1jeR` READY, ambos dominios .net.
No hay otro capitán activo en la coordinación consultada.

Se releyeron estado/checkpoint/coordinación, token issuer y lookup,
middleware, UI Asistentes IA, esquema Prisma, OAuth, Origin, current-user,
hub-sync y social-access. Algoritmo en main desde `a2c8272c`: SHA256/base64url;
no cambió desde su introducción. Las30 credenciales personales existentes,
incluida la del caso, tienen formato almacenado43 caracteres/base64url.
Solo se consultaron agregados de forma/longitud, nunca valores ni hashes.

## Recorrido actual

Configuración genera un secreto sta_ con32 bytes aleatorios; almacena solo
su hash por usuario. Artículos y Redes comparten esa tabla/credencial. El
middleware extrae Bearer, consulta el lookup nativo y establece x-user-id y
scopes. Después el handler consulta al Hub y filtra herramientas de Redes
según la proyección de derechos. OAuth y sesión firmada son caminos separados;
Patricia no tiene tokens OAuth en la consulta previa. No reemplazar PAT por
un código surrogado de MUSE ni desactivar validaciones para abrir acceso.

## Hallazgos reproducidos

1. **Reemplazo silencioso.** El POST de configuración usa upsert y reemplaza
   el token activo sin exigir intención explícita. La UI siempre ofrece
   Generar token, sin advertencia/confirmación, aunque ya exista uno. Generar
   desde cualquiera de los productos invalida la credencial usada en el otro.
2. **Fecha insuficiente.** El update no modifica createdAt y no hay rotatedAt.
   Una fecha30/09 solo fecha la fila original; NO demuestra que la credencial
   actual no se haya reemplazado después. No inferir una rotación de Patricia
   ni afirmar continuidad del mismo valor a partir de ese dato.
3. **Fallo interno presentado como credencial inválida.** El middleware
   convierte cualquier estado del lookup, error de fetch o respuesta inválida
   en null y devuelve401. En el ensayo un lookup503 terminó en401 público.
   Los logs permiten diferenciarlos, pero el cliente puede tratar la conexión
   como desconectada en vez de reconocer una indisponibilidad temporal.
4. **Contexto de producto incompleto.** En MCP no se establece el marcador
   x-hub-product-slug que sí lleva la sesión web. getCurrentUserId usa entonces
   seo-total por defecto incluso en el host Redes. Puede dejar sin refrescar
   el derecho específico REDES; es posterior a la autenticación y no explica
   por sí mismo el401. No se debe confiar en un marcador enviado por el cliente.

Además, lastUsedAt se escribe sin esperar su finalización: null no prueba
que una credencial jamás haya pasado la autenticación.

## Prueba aislada ejecutada

Rutas y middleware reales, prisma/current-user sustituidos por memoria,
fetch interceptado solo para el lookup local; cero red/usuarios reales.
9 tests/9 PASS: emisión→lookup correcto; middleware válido en ambos hosts y
suplantación de x-user-id rechazada; secreto desconocido401; ausencia de
contexto Hub; reemplazo invalida el anterior; fecha queda original;503→401;
revocación impide autenticar. Los PASS de los hallazgos reproducen conducta
defectuosa: NO significan que se haya reparado.

[Fuente del ensayo](evidence/mcp-credentials-review-20261027.test.ts.txt).
Para repetirlo, copiar temporalmente a apps/web/src/lib/mcp/credentials-review-audit.test.ts,
ejecutar tsx --experimental-test-module-mocks --test desde apps/web y retirar
esa copia. No incorporarlo como una regresión que obligue a preservar bugs.
No se repitió la suite completa porque no se cambió código productivo.

## Reparación propuesta

- Preservar tokens existentes. Evitar generar al cargar la página; bloquear
  el botón mientras no se conoce el estado. Para un token activo, exigir
  confirmación explícita cliente y servidor y explicar que afecta a ambos
  productos. Hacer la creación inicial atómica para que una carrera no
  sustituya una credencial recién entregada.
- Registrar de forma fiable la última emisión/rotación y uso sin guardar el
  secreto. Mantener fechas antiguas como desconocidas cuando no hay evidencia;
  no inventar una última rotación ni cambiar tokens para rellenarla.
- Separar401 real de credencial y503 de dependencia/contrato interno; acotar
  espera del lookup según medidas reales. Mantener rechazados secretos falsos,
  revocados y actores ajenos; no ampliar scopes ni abrir WAF.
- Fijar el producto desde host canónico para MCP y sesión web (.net/.com),
  sobrescribiendo marcadores no confiables. Probar por separado autenticación
  y derechos ARTICULOS/REDES del Hub.

## Producción positiva: pendiente de autorización

Preparado `/private/tmp/mcp-production-credential-audit-20261027.py`: crea
usuario de ensayo vacío con login web inutilizable y trial bloqueado, token
temporal solo suyo; verifica lookup con identidad exacta y tools/list en los
dos hosts; secreto alterado y revocado401; finalmente elimina solo los IDs y
correo únicos del ensayo y exige contadores cero. Sin clientes reales,
correos, suscripciones, cargos o publicaciones. Sin redirecciones HTTP.

El auto-review rechazó la ejecución por falta de autorización explícita para
crear/eliminar usuario y token productivos. El script NO se ejecutó; no se
crearon esas filas. Pregunta de autorización enviada al usuario y pendiente.
Solo se comprobó previamente por SELECT que no hay triggers en ambas tablas.

Este positivo es necesario para verificar también que el runtime resuelve la
credencial en la misma base productiva consultada. La simulación no lo prueba.
Si pasa, contrastar el intento actual de MUSE con el token vigente por flujo
seguro. Si se necesita rotar la credencial real, pedir autorización específica;
no sustituir silenciosamente la de Patricia ni la de Juan.

Estado: revisión/prueba local completas; correcciones propuestas, no aplicadas.
No se declara MUSE conectado ni publicaciones automáticas verificadas.
