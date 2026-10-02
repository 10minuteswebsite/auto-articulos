# Diseño de callback OAuth único (solo lectura)

Revisión de `main` para C-033. No se cambia ninguna ruta OAuth.

## Inventario actual

| Proveedor | `connect` / `callback` | URI actual | Estado/cookie | Usuario y retorno |
|---|---|---|---|---|
| Tumblr | `tumblr/connect`, `tumblr/callback` | `protocol + host` de la petición + `/api/search-integrations/tumblr/callback` | `TUMBLR_STATE_COOKIE`; compara `state` | `getCurrentUserId`; `connectionReturnPath("tumblr", estado)` |
| X/Twitter | `twitter/connect`, `twitter/callback` | host de la petición + `/api/search-integrations/twitter/callback` | state + `TWITTER_VERIFIER_COOKIE` para PKCE | `getCurrentUserId`; retorno por conexión |
| LinkedIn | `linkedin/connect`, `linkedin/callback` | host de la petición + `/api/search-integrations/linkedin/callback` | `LINKEDIN_STATE_COOKIE` | `getCurrentUserId`; `connectionReturnPath` |
| Pinterest | `pinterest/connect`, `pinterest/callback` | host de la petición + `/api/search-integrations/pinterest/callback` | `PINTEREST_STATE_COOKIE` | `getCurrentUserId`; `connectionReturnPath` |
| Blogger | `blogger/connect`, `blogger/callback` | host de la petición + `/api/search-integrations/blogger/callback` | `BLOGGER_STATE_COOKIE` | `getCurrentUserId`; `connectionReturnPath` |
| Bing | `bing/connect`, `bing/callback` | helper `getOAuthRedirectUri`; conserva fallback canónico configurado | `BING_STATE_COOKIE` | `getCurrentUserId`; retorno de Bing/ conexión |
| Threads | `threads/connect`, `threads/callback` | host de la petición + `/api/search-integrations/threads/callback` | `THREADS_STATE_COOKIE` | `getCurrentUserId`; `connectionReturnPath` |
| Instagram | `instagram/connect`, `instagram/callback` | host de la petición + `/api/search-integrations/instagram/callback` | `INSTAGRAM_STATE_COOKIE` | `getCurrentUserId`; `connectionReturnPath` |

Todos los callbacks comparan el `state` devuelto con una cookie host-only; varios eliminan la cookie al finalizar. Las credenciales se canjean usando el mismo `redirectUri` que se envió al proveedor. Bing requiere especial cuidado porque conserva compatibilidad con su URI canónico.

## Propuesta, sin implementación

1. Conservar los callbacks actuales por proveedor bajo `https://seototal.lasolucionweb.com/api/search-integrations/<proveedor>/callback`; no registrar rutas nuevas en las consolas. El `connect` firma un `state` con `jti` único, proveedor, usuario, origen (`articulos` o `redes`), ruta de retorno y expiración; no acepta el origen desde un parámetro no autenticado.
2. Guardar el state en una cookie segura con `Domain=.lasolucionweb.com`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` y TTL corto. El callback valida firma, jti de un solo uso, proveedor, origen y sesión antes de canjear.
3. Tras el canje, devolver al host de origen permitido mediante `connectionReturnPath`; jamás usar un `returnTo` arbitrario. El `redirectUri` del canje debe ser exactamente el callback único registrado.
4. Mantener adaptadores por proveedor para PKCE (X), errores de Bing y formatos de token. No reutilizar una cookie de otro proveedor.

## Riesgos y reversa

- Logout o cambio de host durante el flujo puede dejar una cookie host-only antigua: aceptar temporalmente ambas solo durante la transición, sin relajar la validación del state; borrar después.
- Las cookies actuales son host-only; al cambiar a dominio compartido, probar colisión de nombres y limpiar cookies antiguas por cada host.
- «Acceder como» debe conservar su protección: revisar `IMPERSONATION_COOKIE` en `apps/web/src/lib/session.ts` y no permitir que el state OAuth la suplante.
- Bing y proveedores con allowlist pueden rechazar el callback nuevo hasta registrar cada URI; conservar rollback por proveedor al callback anterior.

## Plan de pruebas

Probar por proveedor y por origen: state válido, firma inválida, jti repetido, expirado, proveedor/origen alterado, cookie ausente, cookie antigua host-only, logout, impersonación, PKCE de X, error de consentimiento y redirectUri distinto en canje. Verificar que ningún retorno acepta dominio externo y que el rollback restaura el callback anterior sin tocar tokens existentes.

**Resultado de esta entrega:** inventario estático; no se hicieron cambios ni peticiones OAuth/producción. Typecheck y suite: NO EJECUTADOS (documento sin código ejecutable).
