# Checklist urgente de callbacks OAuth para Milton

Fecha: 2026-10-01  
Proyecto: SEO Total Artículos / SEO Total Redes  
Estado: lista para revisión de dominios y proveedores; no implica cambios DNS ni producción.

## Regla común

Conservar el callback actual durante toda la transición y añadir los dos nuevos hosts de producto. No registrar `callbacks.lasolucionweb.com` como callback OAuth de usuario: ese host queda reservado para rutas de máquina (MCP, OAuth2 y `.well-known`).

Hosts nuevos:

- `https://seototal.articulos.lasolucionweb.com`
- `https://seototal.redes.lasolucionweb.com`

## ACTUALIZACIÓN 2026-10-02 (decisión de Milton) — la lista se acorta

Milton confirmó que **todas las conexiones de Google (Search Console, Analytics, Business Profile) y de Meta (Instagram, Threads) pasan por Composio**. Para esas conexiones la dirección de retorno que ve el proveedor es la de Composio, no la nuestra, así que **no hace falta registrarlas** (las filas de Google y Meta de la tabla de abajo quedan **fuera de la lista de trabajo**, salvo que quede alguna cuenta con conexión directa antigua). Mastodon ya no existe.

**Lista de trabajo vigente:** LinkedIn, Pinterest, Tumblr, X, Blogger, Bing y, solo si Composio lo exige, la fila de Composio.

**Protocolo de paso a Composio (PROTEGIDO, no tocar):** existe un procedimiento para las cuentas que se conectaron al estilo antiguo y pasan a Composio (`isMigrationApp`, `resolveRoute` y el selector de ruta en `apps/web/src/lib/composio*.ts`). Ningún lote de esta separación puede modificarlo ni dañarlo. Las rutas de conexión directa de Google/Bing siguen en el código a propósito: **no retirarlas** hasta que Milton lo ordene.

## URLs exactas

| Consola / proveedor | Callback actual | Añadir — Artículos | Añadir — Redes | Solicitud |
|---|---|---|---|---|
| Google Search Console | `https://seototal.lasolucionweb.com/api/search-integrations/google/callback` | `https://seototal.articulos.lasolucionweb.com/api/search-integrations/google/callback` | `https://seototal.redes.lasolucionweb.com/api/search-integrations/google/callback` | Añadir ambas URLs OAuth; no retirar la actual |
| Google Analytics | `https://seototal.lasolucionweb.com/api/google-analytics/callback` | `https://seototal.articulos.lasolucionweb.com/api/google-analytics/callback` | `https://seototal.redes.lasolucionweb.com/api/google-analytics/callback` | Añadir ambas URLs OAuth; no retirar la actual |
| Google Business Profile | `https://seototal.lasolucionweb.com/api/business-profile/callback` | `https://seototal.articulos.lasolucionweb.com/api/business-profile/callback` | `https://seototal.redes.lasolucionweb.com/api/business-profile/callback` | Confirmar consola/canal exacto y añadir ambas |
| Bing Webmaster | `https://seototal.lasolucionweb.com/api/search-integrations/bing/callback` | `https://seototal.articulos.lasolucionweb.com/api/search-integrations/bing/callback` | `https://seototal.redes.lasolucionweb.com/api/search-integrations/bing/callback` | Añadir ambas; el código debe usar el mismo URI al autorizar y canjear |
| Meta / Instagram | `https://seototal.lasolucionweb.com/api/search-integrations/instagram/callback` | `https://seototal.articulos.lasolucionweb.com/api/search-integrations/instagram/callback` | `https://seototal.redes.lasolucionweb.com/api/search-integrations/instagram/callback` | Añadir como Redirect URI válidas; aprobación de Meta puede tardar |
| Meta / Threads | `https://seototal.lasolucionweb.com/api/search-integrations/threads/callback` | `https://seototal.articulos.lasolucionweb.com/api/search-integrations/threads/callback` | `https://seototal.redes.lasolucionweb.com/api/search-integrations/threads/callback` | Añadir en la configuración OAuth de Threads/Meta |
| LinkedIn | `https://seototal.lasolucionweb.com/api/search-integrations/linkedin/callback` | `https://seototal.articulos.lasolucionweb.com/api/search-integrations/linkedin/callback` | `https://seototal.redes.lasolucionweb.com/api/search-integrations/linkedin/callback` | Añadir ambas URLs autorizadas |
| Pinterest | `https://seototal.lasolucionweb.com/api/search-integrations/pinterest/callback` | `https://seototal.articulos.lasolucionweb.com/api/search-integrations/pinterest/callback` | `https://seototal.redes.lasolucionweb.com/api/search-integrations/pinterest/callback` | Añadir ambas URLs |
| Tumblr | `https://seototal.lasolucionweb.com/api/search-integrations/tumblr/callback` | `https://seototal.articulos.lasolucionweb.com/api/search-integrations/tumblr/callback` | `https://seototal.redes.lasolucionweb.com/api/search-integrations/tumblr/callback` | Añadir ambas URLs |
| X | `https://seototal.lasolucionweb.com/api/search-integrations/twitter/callback` | `https://seototal.articulos.lasolucionweb.com/api/search-integrations/twitter/callback` | `https://seototal.redes.lasolucionweb.com/api/search-integrations/twitter/callback` | Añadir ambas URLs como callback permitido |
| Blogger | `https://seototal.lasolucionweb.com/api/search-integrations/blogger/callback` | `https://seototal.articulos.lasolucionweb.com/api/search-integrations/blogger/callback` | `https://seototal.redes.lasolucionweb.com/api/search-integrations/blogger/callback` | Añadir ambas URLs en el cliente OAuth de Google |
| Composio | `https://seototal.lasolucionweb.com/api/composio/callback?app=<app>` | `https://seototal.articulos.lasolucionweb.com/api/composio/callback?app=<app>` | `https://seototal.redes.lasolucionweb.com/api/composio/callback?app=<app>` | Confirmar con Composio si registra query `app` literal o valida el origen; conservar `state` |

## Orden recomendado

1. Crear/verificar primero los dos dominios y certificados en privado.
2. Registrar Google y Meta de inmediato por sus tiempos de aprobación.
3. Registrar LinkedIn, Pinterest, Tumblr, X, Bing y Composio.
4. No retirar callbacks actuales hasta probar conexión y reconexión en ambos hosts.
5. Reportar a Codex el estado de cada consola y cualquier URL que el proveedor no acepte.

## Advertencia

Registrar URLs no sustituye el cambio de código: Google, Analytics y Bing hoy tienen callbacks fijos y deben derivarse de una lista blanca de hosts permitidos; Bing requiere que el `redirect_uri` usado en autorización sea idéntico al usado en el canje.
