# BASELINE — Contrato previo HUB/OAuth

Fecha: 2026-10-16

## Regla de dominios

Se trabajará en modo mixto:

- `.com`: dominio canónico de sesión, HUB y OAuth.
- `.net`: alias de compatibilidad para entrada humana; se normalizará al `.com` equivalente antes de iniciar sesión u OAuth.
- `seototal.lasolucionweb.com/api/*`: callback técnico conservado aunque las rutas humanas de `seototal` pasen al HUB.

En el Punto 1, la redirección se aplica solo sin sesión. Una sesión existente conserva su dashboard temporalmente para que el retorno de `/auth/hub` no entre en un bucle; el Punto 2 resolverá la sesión compartida y el destino canónico posterior.

No se intentará compartir cookies entre `.com` y `.net`: el navegador no permite una cookie de dominio `.com` puesta desde `.net`.

## Flujos que no deben romperse

1. Las integraciones existentes no deben reconectarse por este cambio.
2. Un callback técnico debe conservar la sesión y volver al producto de origen.
3. Una entrada desde el HUB debe crear una sesión válida en los subdominios `.com`.
4. `/api/*` no debe redirigirse al HUB por una regla de navegación humana.
5. Un callback inválido o sin sesión debe devolver un error controlado.

## Proveedores

Se conservarán primero los callbacks canónicos `.com` ya usados. Solo se tocarán consolas externas si la verificación manual demuestra que falta una URL. Las conexiones existentes no dependen del callback para renovar o publicar sus tokens.
