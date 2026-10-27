# MCP-MUSE-READONLY-20261027 — análisis sin reparación

Fecha:27/10/2026,19:20–19:26 America/New_York. Solicitud humana: determinar
si falla el Hub u otro componente; analizar antes de reparar.

## Punto cero productivo

`main` y producción: `27499e7fa74aad545c2c8f79833da3bc7a3c03b4`, Vercel
`dpl_GBo3JqNgx78ehCz4bBt7Djk6MNGN` READY, con ambos dominios .net.
Código del diagnóstico `654b311c`; el cierre27499 solo cambió documentación.
Se releyeron Harness/IA Journey, estado/checkpoint/coordinación/runtime,
middleware, token-lookup, ruta MCP y current-user desde GitHub actual.

## Hechos comprobados

1. El nuevo texto del cliente reutiliza `a51337823ebe9d92`,27/10 12:53:25
   EDT, y termina sus intentos concretos a las14:10. Omite los401 que el
   mismo cliente había comunicado después. No es un comprobante nuevo del
   estado19:00 ni prueba una regresión de Cloudflare.
2. Security Events de Cloudflare, cuenta10minuteswebsite, últimos24h,
   Host=redes.lasolucionweb.net y Path=/api/mcp: último bloqueo en el
   muestreo14:14:28 EDT, anterior a la verificación del arreglo14:17.
   Es un muestreo; no se afirma cobertura exhaustiva de todas las llamadas.
3. Dos controles propios,19:22 EDT, misma firma Python-urllib/3.12,
   Origin meta.ai y PAT deliberadamente falso, llegaron a Vercel y dieron
   401 JSON de aplicación en Artículos y Redes, sin redirección ni1010.
   Rays `a51570b7acdfe8de-ATL` (Redes) y `a51570b7ab3c3475-ATL` (Artículos).
   Son negativos; no prueban la credencial real del cliente.
4. Antes de estas pruebas, los logs productivos registraron a las18:57:04
   EDT un POST /api/mcp de Redes: familia personal, personal_lookup_rejected
   status401 y rejected. Ray `a5154c33297cdc66-ORD`. No fue una prueba de
   esta auditoría. Los logs no identifican al dueño de una credencial
   rechazada: NO atribuir esa llamada a Patricia/MUSE sin correlación.
5. SELECT de metadatos en la base nativa confirma que el registro del token
   personal de Patricia existe, creado30/09 18:15:08.658 UTC, revokedAt=null.
   No se leyó valor ni hash ni se modificó el registro. lastUsedAt=null no
   demuestra que nunca se usó: su actualización es asíncrona/no esperada.

## Frontera del fallo

El middleware de /api/mcp valida Bearer antes de ejecutar el handler MCP.
El lookup nativo devuelve401 cuando falta una credencial válida o no encuentra
un hash activo. No consulta al Hub en ese paso. El Hub se consulta después,
en getCurrentUserId/refreshHubAccessForUser, para derechos del producto.
Por ello el401 observado en la validación de la credencial no se explica
por el login del Hub. Los derechos de Redes seguirán siendo una comprobación
necesaria después de autenticarse; no se declara publicación E2E.

La hipótesis pendiente es la correspondencia entre la credencial que envía
el conector y la vigente en el producto. La existencia del token en base no
demuestra que MUSE esté enviando ese mismo valor. Tampoco se concluye que un
código surrogado visible para MUSE sea un error: Sentinel puede sustituirlo.

## Decisión y siguiente comprobación

No reparar a ciegas ni tocar Hub, WAF, permisos, credenciales o tareas. Pedir
una única llamada NUEVA tools/list, con hora Florida, HTTP, cuerpo y Ray ID
de ESA llamada, sin token. Correlacionar con el diagnóstico del servidor.
Si confirma personal_lookup401, contrastar la credencial mediante flujo
seguro; no regenerar ni aceptar sustitutos sin autorización/evidencia.

Esta ejecución fue solo lectura en proveedores/base. Solo se conserva memoria
documental. No se activaron tareas, publicaciones, herramientas con efectos,
suscripciones o cobros. No se repitieron suites de código: no cambió código.

[Arreglo previo y recibos](mcp-cloudflare-bic-20261027.md).
