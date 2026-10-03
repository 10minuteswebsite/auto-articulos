# Plan de pruebas de retorno único

Plan operativo para Milton y revisión técnica. No registra callbacks nuevos ni ejecuta OAuth.

## Preparación

1. Confirmar DNS y candado en `seototal.lasolucionweb.com`, `articulos.lasolucionweb.com` y `redes.lasolucionweb.com`.
2. Activar en staging/base desechable `SHARED_COOKIE_DOMAIN=.lasolucionweb.com` y `OAUTH_CANONICAL_ORIGIN=https://seototal.lasolucionweb.com`; anotar commit y hora.
3. Usar cuentas de prueba separadas y no desconectar conexiones existentes.

## Matriz por proveedor

Repetir desde `articulos` y desde `redes` para Tumblr, X/Twitter, LinkedIn, Pinterest, Blogger, Bing, Threads, Instagram, Google Search Console, Google Analytics y Google Business Profile. En cada caso:

1. Abrir Configuración → Conexiones en el subdominio de origen y pulsar Nueva conexión.
2. Confirmar que el proveedor recibe su callback actual bajo `seototal.lasolucionweb.com/api/search-integrations/<proveedor>/callback` y que no se cambió ninguna consola.
3. Completar consentimiento; volver debe terminar en la pantalla de Conexiones del subdominio que inició el flujo.
4. Confirmar que el token queda asociado al usuario correcto y que Probar conexión funciona.
5. Repetir cancelando consentimiento y con error del proveedor: el retorno debe ser el origen correcto y no filtrar código/token.

Para X comprobar además PKCE; para Bing que el URI usado al autorizar y canjear sea idéntico; para Google/Meta respetar el flujo Composio vigente si aplica.

## Cookies visibles en el navegador

En DevTools → Application → Cookies deben aparecer, cuando la variable está activa, las cookies de sesión y `oauth_return_origin` con `Domain=.lasolucionweb.com`, `Secure`, `HttpOnly`, `SameSite=Lax` y expiración corta para state. Durante transición puede existir la variante host-only antigua; el servidor debe leer y borrar ambas. Nunca debe aparecer state o token en una URL de retorno final.

## Cierre de sesión y Acceder como

Cerrar sesión en cada uno de los tres hosts; comprobar que se borran las variantes compartida y host-only y que una navegación posterior exige login. Como administrador, usar «Acceder como» desde Artículos y Redes, verificar que `IMPERSONATION_COOKIE` no se confunde con la cookie OAuth, que al cerrar sesión se invalida y que el usuario original puede volver. Repetir logout en medio del OAuth y comprobar que el callback rechaza state sin sesión.

## Seguridad y reversa

Probar state alterado, expirado, repetido, de otro proveedor, de otro origen y con retorno externo. Todos deben fallar sin canjear. Probar previews, localhost y dominios `10minuteswebsite.*`: deben permanecer en `stay` y nunca redirigir. Si falla el retorno, retirar `SHARED_COOKIE_DOMAIN` y `OAUTH_CANONICAL_ORIGIN` y redeplegar; el comportamiento host-only anterior debe volver sin tocar consolas ni datos.

## Registro

Para cada proveedor y origen guardar hora, resultado, URL final sin secretos, nombres/atributos de cookies y evidencia de logout. No guardar tokens, códigos ni valores completos de state.
