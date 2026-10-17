# Checklist de callbacks OAuth (versión 2026-10-17, estado real)

Regla de Milton: los ÚNICOS hosts de callback son `https://articulos.lasolucionweb.net` y `https://redes.lasolucionweb.net`. Nada de `seototal`, nada de `.com`. El código (`apps/web/src/lib/oauth-redirect.ts`) rechaza cualquier otro host; ninguna variable de entorno puede ampliar la lista.

## URLs que deben estar registradas en cada consola

| Consola / proveedor | Artículos | Redes |
|---|---|---|
| Google Search Console | `https://articulos.lasolucionweb.net/api/search-integrations/google/callback` | `https://redes.lasolucionweb.net/api/search-integrations/google/callback` |
| Google Analytics | `https://articulos.lasolucionweb.net/api/google-analytics/callback` | `https://redes.lasolucionweb.net/api/google-analytics/callback` |
| Google Business Profile (OAuth directo) | `https://articulos.lasolucionweb.net/api/business-profile/callback` | `https://redes.lasolucionweb.net/api/business-profile/callback` |
| Bing Webmaster | `https://articulos.lasolucionweb.net/api/search-integrations/bing/callback` | `https://redes.lasolucionweb.net/api/search-integrations/bing/callback` |
| Meta / Instagram | `https://articulos.lasolucionweb.net/api/search-integrations/instagram/callback` | `https://redes.lasolucionweb.net/api/search-integrations/instagram/callback` |
| Meta / Facebook Pages | `https://articulos.lasolucionweb.net/api/search-integrations/facebook-pages/callback` | `https://redes.lasolucionweb.net/api/search-integrations/facebook-pages/callback` |
| Meta / Threads | `https://articulos.lasolucionweb.net/api/search-integrations/threads/callback` | `https://redes.lasolucionweb.net/api/search-integrations/threads/callback` |
| LinkedIn | `https://articulos.lasolucionweb.net/api/search-integrations/linkedin/callback` | `https://redes.lasolucionweb.net/api/search-integrations/linkedin/callback` |
| Pinterest | `https://articulos.lasolucionweb.net/api/search-integrations/pinterest/callback` | `https://redes.lasolucionweb.net/api/search-integrations/pinterest/callback` |
| Tumblr | `https://articulos.lasolucionweb.net/api/search-integrations/tumblr/callback` | `https://redes.lasolucionweb.net/api/search-integrations/tumblr/callback` |
| X | `https://articulos.lasolucionweb.net/api/search-integrations/twitter/callback` | `https://redes.lasolucionweb.net/api/search-integrations/twitter/callback` |
| Blogger (cliente OAuth de Google) | `https://articulos.lasolucionweb.net/api/search-integrations/blogger/callback` | `https://redes.lasolucionweb.net/api/search-integrations/blogger/callback` |
| Composio (callback del enlace de conexión) | `https://articulos.lasolucionweb.net/api/composio/callback?app=<app>` | `https://redes.lasolucionweb.net/api/composio/callback?app=<app>` |
| PostPeer (Google Business, Threads) | `https://articulos.lasolucionweb.net/api/postpeer/callback` y `/api/postpeer/threads/callback` | `https://redes.lasolucionweb.net/api/postpeer/callback` y `/api/postpeer/threads/callback` |

## Qué hay que quitar o revisar

- En cada consola, retirar las URLs antiguas `seototal.lasolucionweb.com`, `seototal.lasolucionweb.net`, `*.lasolucionweb.com` y `seototal.*.lasolucionweb.com` solo DESPUÉS de probar la conexión en ambos hosts `.net`.
- Variables de entorno de Vercel que deben apuntar a un `.net` o estar vacías: `GOOGLE_SEARCH_CONSOLE_REDIRECT_URI`, `GOOGLE_BUSINESS_PROFILE_REDIRECT_URI`, `GOOGLE_ANALYTICS_REDIRECT_URI`, `BING_WEBMASTER_REDIRECT_URI`, `OAUTH_CANONICAL_ORIGIN` (si no es un `.net` permitido se ignora). `SEO_TOTAL_OAUTH_ALLOWED_HOSTS` ya no tiene efecto.
- `callbacks.lasolucionweb.com` sigue reservado para rutas de máquina (MCP, OAuth2, `.well-known`); no es callback de usuario.
- Bing exige el mismo `redirect_uri` al autorizar y al canjear: el código ya usa el host de la petición en ambos pasos.

## Estado real a 2026-10-17

- Hecho y probado con Lorena: **Bing** (cliente nuevo, retorno articulos .net), **LinkedIn** (registradas articulos y redes .net; sin `.com`), **Tumblr** (una sola: redes .net).
- Sin registro propio: **Composio** y **PostPeer** (administrados por ellos; el código manda el host de la petición). **Bluesky** no usa OAuth de la plataforma.
- Sin uso hoy (no se registraron): Google Cloud directo (Search Console/Analytics/Business van por Composio y PostPeer), Meta directo (Instagram/Facebook van por Composio, Threads por PostPeer), X y Blogger. Si algún día se reactivan, registrar primero las dos `.net` de esta tabla.
