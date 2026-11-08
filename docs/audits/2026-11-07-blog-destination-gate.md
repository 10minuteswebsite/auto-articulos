# Auditoría — compuerta de destino publicable para Artículos

Fecha: 2026-11-07 (America/New_York)
Estado: IMPLEMENTACIÓN LOCAL, PUBLICACIÓN Y PRODUCCIÓN PENDIENTES

## Decisión

Artículos solo puede crear un lote o pedir títulos a la IA cuando existe un
destino publicable. Para BLOG IA la fuente confiable es la proyección local del
vínculo firmado por Hub: `User.publishMethod = BLOG` y `BlogIaBlog` con estado
`active`, `tenantId`, `provisionedAt`, `activatedAt`, `dnsVerified = true`,
`tlsReady = true`, sin `lastError` y con un hostname propio válido.

La dirección provisional `*.lasolucionweb.net` nunca es válida, aunque figure
activa o exista una publicación. Un estado ausente, pendiente, con error,
desconectado o imposible de comprobar falla cerrado.

## Puntos protegidos

- `POST /api/title-generation`: bloquea antes de llamar a IA.
- `POST /api/runs`: bloquea antes de crear `Run`/`Title`.
- El mensaje devuelve un enlace a BLOG IA para resolver el bloqueo.

No se modifican BLOG IA, Dominios ni Hub; no se conectan/desconectan cuentas ni
se toca DNS.

## Casos existentes

Los artículos y vínculos que ya apunten a una dirección provisional no se
borran ni se convierten automáticamente. Permanecen en el historial y quedan
pendientes de decisión/reparación cuando el dominio propio sea conectado. La
compuerta solo impide nuevos lotes y nueva generación.

## Evidencia y pendientes

- Pruebas añadidas para: sin BLOG IA, provisional, pendiente DNS, error,
  desconectado, DNS/TLS no confirmados, vínculo no provisionado y conectado.
- `git diff --check`: PASS.
- Suite web: PASS — 439/439 pruebas.
- Typecheck web: PASS.
- Build web: PASS (con advertencia preexistente de export CommonJS de Prisma y aviso de middleware de Next).
- Harness-Mario/`IA_JOURNEY.md`: no disponible en el checkout y GitHub no
  resolvía desde este entorno.
- Producción y cuenta de prueba: NO VERIFICADAS; falta ejecutar el flujo
  autenticado con una cuenta de prueba autorizada. Por tanto no se declara
  liberación todavía.
