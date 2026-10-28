# MCP-AUTH-FIX-20261027

Fecha local:27/10/2026 America/New_York. El usuario autorizó expresamente
una cuenta/token temporales en producción, su limpieza y la reparación de
los defectos siguiendo Harness, sin tocar tokens/datos de clientes reales.

## Punto cero

GitHub main `cb5d6d4c13d2f745e3d1466c8487382588718cc0`; Vercel
`dpl_HhtzBbqTjggzeA82BhRsDufEQafC` READY, auto-articulos-web, ambos hosts
.net. Se releyeron Harness índice/Journey, mapa/protocolo, estado, checkpoint,
coordinación, baseline, runtime, inventario y reglas de migración. Solo main.
Capitán Codex; cambio acotado a MCP/configuración y metadatos opcionales.

## Ensayo autorizado previo

Un primer control directo al endpoint auxiliar token-lookup con firma Python
fue403 de Cloudflare: no pertenece a la excepción pública y MUSE no debe
llamarlo. Se limpió el ensayo (0 usuarios/0 tokens). No se abrió esa ruta.

Se repitió por la entrada pública correcta /api/mcp, Python-urllib/3.12,
Origin meta.ai: token temporal válido200/28 herramientas en ambos hosts;
alterado401; revocado401 en ambos. Limpieza0/0. Nunca tools/call ni contenido,
correos, suscripciones o cargos. [Recibos](../evidence/mcp-auth-baseline-20261027.json).
Esto prueba el PAT productivo contra la base nativa; no prueba la credencial
guardada por MUSE/Patricia ni autoriza cambiarla.

## Reparación

- La emisión inicial usa CREATE con unicidad, sin upsert destructivo. Un
  token activo exige replaceExisting explícito y la revisión que confirmó el
  cliente. Compare-and-set por id/usuario/hash/estado evita pisar emisiones
  concurrentes. La revocación también exige revisión actual. Conflictos409.
- issuedAt y credentialVersion son columnas nullable sin backfill. Los
  tokens viejos conservan valor, hash, revocación y fecha original; la última
  emisión desconocida se muestra como No registrado. El nonce de revisión es
  público solo a su dueño y no contiene el secreto/hash. Lecturas no rotan.
- El lookup401 conserva401;403/429/5xx, timeout/redirección/respuesta corrupta
  se traducen a503 con Retry-After. Timeout10s y redirect:error; ninguna
  credencial sigue una redirección. Errores DB devuelven503. Último uso se
  persiste antes del200, sin rechazar una credencial válida por fallo métrico.
- MCP y sesión fijan el slug desde host canónico .net/.com. Se sobrescriben
  identidad/scopes/producto y se retiran marcadores de impersonación/origen
  enviados por el cliente. Redes consulta auto-redes; Artículos seo-total.
- UI espera los metadatos, distingue Generar/Reemplazar, advierte el efecto
  compartido y exige confirmación. Ante estado desconocido o conflicto falla
  cerrado/refresca. Metadatos y secretos usan Cache-Control:no-store.

No se cambiaron formato/prefijo del PAT, OAuth/PKCE/TTL, secretos del entorno,
WAF/BIC, DNS, pagos, automatizaciones o integraciones sociales de clientes.

## Migración y pruebas

Aplicada únicamente20261027235000_mcp_credential_metadata por SQL acotado
del repo: dos ADD COLUMN IF NOT EXISTS nullable, lock_timeout5s,
statement_timeout30s. Sin UPDATE/DELETE/backfill ni lote Prisma pendiente.
[Columnas verificadas](../evidence/mcp-auth-migration-20261027.json).
Security advisors del proyecto: exit0, No issues found.

npm run verify PASS: diff, Prisma generate, tipos, build web, build worker y
26 pruebas worker. Suite web274 PASS (16 nuevas de ciclo de credencial,
concurrencia, tenant, respuestas y contexto). Total300 pruebas diferentes.
Una ejecución web simultánea con Prisma generate falló por cliente generado
temporalmente ausente; se repitió secuencialmente y pasó. No se cambió código
ajeno para ocultar el fallo. Problemas de tipos de mocks corregidos antes del
PASS. Configuración de tests localhost, sin secretos productivos.

## Estado de publicación

Código preparado y migración aditiva aplicada. Publicación y verificación
posterior en Vercel pendientes. El ensayo final comprobará login/configuración,
reemplazo rechazado/confirmado, revisión obsoleta, uso/emisión, tools/list,
revocación y limpieza. UI interna con cuenta temporal, nunca un cliente.

Se guardó solo una huella agregada de las30 credenciales existentes para
comparar al cierre sin leer valores/hash individuales. Verificación pendiente.
El ensayo final no enviará mensajes ni publicará contenido.

## Límites y rollback

La corrección de contexto Hub está probada en los cuatro hosts con middleware
real; no se afirma un cobro/entitlement comercial nuevo. La conexión real de
MUSE requiere un tools/list desde ese cliente con su credencial guardada.
No afirmar que Patricia ya conectó. Si persiste401, correlacionar intento/Ray,
no aceptar credenciales inválidas ni rotar su token sin autorización específica.

Rollback funcional: volver al código cb5d6d4c y conservar las dos columnas
nullable. No borrarlas ni revertir hashes/fechas de usuarios; no restaurar
credenciales de prueba. [Mapa central](https://github.com/10minuteswebsite/Harness-Mario/blob/main/docs/ECOSISTEMA_APLICACIONES.md).
