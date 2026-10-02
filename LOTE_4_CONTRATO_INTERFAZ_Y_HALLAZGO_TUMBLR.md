# Lote 4 — contrato de interfaz de acceso externo y hallazgo histórico de Tumblr

Este documento define el contrato que nuestra aplicación necesita de cualquier sistema externo de autenticación o derechos. No elige proveedor, no crea un receptor `/auth/hub`, no añade tablas y no autoriza despliegues.

## Contrato mínimo de derechos

El sistema externo debe entregar, por usuario y producto:

- Identidad estable del usuario (`sub`) y emisor (`iss`); `aud` debe coincidir con nuestra aplicación.
- Producto explícito: `ARTICULOS` o `REDES`.
- Estado: `ACTIVE`, `GRACE` o `INACTIVE`.
- `graceUntil` cuando el estado sea `GRACE`.
- `version` monotónica por usuario/producto para ignorar eventos atrasados.
- `source` y `externalRef` para rastrear el origen sin convertirlos en autorización implícita.
- `updatedAt` y un identificador de evento o cambio para auditoría.

La aplicación sigue leyendo el derecho efectivo desde su fuente local acordada (`ProductEntitlement`) en cada petición. Un token o respuesta externa autentica y transporta una actualización; por sí solo no concede acceso vigente.

## Idempotencia y orden

1. Validar firma, emisor, audiencia, expiración y `jti` antes de aceptar una actualización.
2. Aplicar la actualización dentro de una transacción.
3. Aceptar solo una versión mayor que la versión almacenada; repetir la misma versión debe ser un no-op idempotente.
4. Registrar el evento aceptado con usuario, producto, versión, origen y actor/referencia externa.
5. No convertir un error del sistema externo en bloqueo silencioso: el modo `off` conserva comportamiento, `shadow` registra divergencias y `enforce` requiere autorización explícita.
6. La ausencia de fila conserva el comportamiento legacy hasta que exista backfill y una decisión de corte.

## Interfaz que debe ofrecer la aplicación

El proveedor externo, si se incorpora después, debe poder:

- entregar o actualizar derechos por usuario/producto;
- identificar de forma inequívoca el usuario local o permitir resolverlo por un identificador estable acordado;
- reenviar eventos sin duplicar derechos ni degradar una versión más nueva;
- informar revocaciones y expiración de gracia;
- devolver errores distinguibles de autenticación, autorización, versión antigua y disponibilidad.

No se define aquí si el transporte será token firmado, canje de código o webhook. Esa decisión corresponde a Milton y debe conservar el contrato anterior.

## Hallazgo histórico: `20260823150000_add_tumblr_integration`

La migración contiene un `INSERT` en `ProductUpdate` que no proporciona `updatedAt`, aunque el modelo y la tabla lo exigen como `NOT NULL` con `@updatedAt`. Por eso el historial completo de migraciones no se reproduce desde una base vacía: la migración falla en ese punto.

La evidencia de coordinación indica que la integración de Tumblr sí llegó a `origin/main` y se desplegó; por tanto, producción debió aplicar esa parte mediante una ruta distinta (por ejemplo, `db push`, SQL manual o una base que ya tenía la fila), pero este repositorio no permite demostrar cuál fue el camino exacto sin consultar los logs o el historial de la base de producción. La conclusión segura es:

- no modificar la migración histórica ya aplicada;
- no asumir que `migrate deploy` reproduce desde cero todo el historial;
- documentar la discrepancia y verificar producción de forma independiente;
- para nuevos lotes, usar rutas SQL seguras y auditadas cuando el workflow lo exija, sin borrar ni reescribir migraciones antiguas.

Este hallazgo es ajeno al contrato del Lote 4 y no autoriza ninguna reparación en producción.
