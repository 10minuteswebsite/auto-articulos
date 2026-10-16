# BASELINE — Contrato previo HUB/OAuth

Fecha: 2026-10-16

## Regla de dominios

Se trabajará en modo mixto:

- `.com`: dominio canónico de sesión, HUB y OAuth.
- `.net`: alias de entrada humana y familia válida de producto; cuando una sesión se emite desde `.net`, su cookie se fija dentro de `.lasolucionweb.net`.
- `seototal.lasolucionweb.com/api/*`: callback técnico conservado aunque las rutas humanas de `seototal` pasen al HUB.

En el Punto 1, la redirección se aplica solo sin sesión. Una sesión existente conserva su dashboard temporalmente para que el retorno de `/auth/hub` no entre en un bucle; el Punto 2 resolverá la sesión compartida y el destino canónico posterior.

El Punto 2 ya corrigió la emisión de sesión de `/auth/hub`: con `DIA_CERO=on`, `applyCookie` fija la cookie en la familia del host que recibió el callback y elimina la variante host-only. Todavía falta probar un intercambio real con una cuenta autorizada del HUB.

No se intentará compartir una cookie entre `.com` y `.net`: cada familia usa su propio dominio porque el navegador no permite una cookie `.com` puesta desde `.net`.

## Flujos que no deben romperse

1. Las integraciones existentes no deben reconectarse por este cambio.
2. Un callback técnico debe conservar la sesión y volver al producto de origen.
3. Una entrada desde el HUB debe crear una sesión válida en los subdominios de la familia que recibió el callback (`.com` o `.net`).
4. `/api/*` no debe redirigirse al HUB por una regla de navegación humana.
5. Un callback inválido o sin sesión debe devolver un error controlado.

## Corrección de lanzamiento HUB a Redes — 2026-10-16

`/auth/hub` selecciona el dominio de cookie según `request.nextUrl.hostname`. Esto conserva el comportamiento `.com` y permite que `redes.lasolucionweb.net` establezca una sesión válida después de canjear el código de un solo uso.

## Proveedores

Se conservarán primero los callbacks canónicos `.com` ya usados. Solo se tocarán consolas externas si la verificación manual demuestra que falta una URL. Las conexiones existentes no dependen del callback para renovar o publicar sus tokens.

## Baseline visual y de navegación — Artículos — 2026-10-16

- El shell de referencia es el de `superlinks.lasolucionweb.net`: encabezado global del Hub separado del menú interno del producto.
- En sesiones Hub, el encabezado global debe mostrar `LA SOLUCIÓN IA`, `Aplicaciones`, `Facturación`, `Perfil`, `Admin Hub` solo para administradores y `Salir`.
- El menú interno de Artículos conserva sus módulos y muestra el grupo administrativo como `Admin Artículos` solo para administradores.
- `Volver al HUB` no se duplica en el menú interno cuando el encabezado global ya ofrece `Aplicaciones`.
- El origen Hub se prueba con un contexto firmado ligado al mismo `userId`; un contexto ausente o inválido conserva el shell legacy y no concede permisos.
- Las rutas administrativas son transversales al host de producto: el filtro visual de Artículos/Redes no puede ocultarlas para un administrador. Su visibilidad sigue dependiendo del rol o suplantación; esta excepción no concede acceso y las APIs conservan sus guardas.
- La navegación de producto debe copiar el patrón vivo de Superlinks: encabezado global separado, `app-subbar` independiente, identidad/contexto del producto a la izquierda, enlaces de aplicación a la derecha y botón administrativo delineado. Los submenús usan superficies blancas, borde tenue, radio suave y sombra discreta; no se usan estilos morados ni menús antiguos.
