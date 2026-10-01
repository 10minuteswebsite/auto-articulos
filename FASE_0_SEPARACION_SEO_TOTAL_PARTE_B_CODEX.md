# FASE 0 — PARTE B (Codex)

Proyecto: Separación de SEO Total Artículos y SEO Total Redes  
Fecha: 2026-10-01  
Estado: B1 en curso; B2–B5 pendientes de completar y revisión cruzada.

## B1. Inventario de callbacks OAuth (primera entrega)

### Convenciones

- **Host actual fijo:** `https://seototal.lasolucionweb.com`.
- **Host actual dinámico:** el host de la petición que inicia la conexión.
- **Host objetivo propuesto:** `https://callbacks.lasolucionweb.com`. Es una propuesta, no una decisión aprobada; debe cerrarse en la Fase 0.

| Proveedor / integración | Callback actual verificado | Host actual | Callback que debe registrarse antes del corte | Estado |
|---|---|---|---|---|
| Google Search Console | `/api/search-integrations/google/callback` | Fijo en `seototal.lasolucionweb.com` desde `apps/web/src/lib/google-oauth.ts`; permite override por variable de entorno | `https://callbacks.lasolucionweb.com/api/search-integrations/google/callback` (propuesto) | Registrar ambos tras aprobar dominio |
| Google Analytics | `/api/google-analytics/callback` | Fijo en `seototal.lasolucionweb.com` desde `apps/web/src/lib/google-analytics-oauth.ts`; permite override | `https://callbacks.lasolucionweb.com/api/google-analytics/callback` (propuesto) | Registrar ambos tras aprobar dominio |
| Google Business Profile | `/api/business-profile/callback` | Fijo en `seototal.lasolucionweb.com` desde `apps/web/src/lib/google-oauth.ts`; permite override | `https://callbacks.lasolucionweb.com/api/business-profile/callback` (propuesto) | Confirmar canal y registrar ambos |
| Bing Webmaster | `/api/search-integrations/bing/callback` | Fijo en `seototal.lasolucionweb.com` desde `apps/web/src/lib/bing-oauth.ts`; permite override | `https://callbacks.lasolucionweb.com/api/search-integrations/bing/callback` (propuesto) | Registrar ambos tras aprobar dominio |
| Meta / Instagram | `/api/search-integrations/instagram/callback` | Dinámico: `protocol://host` de la petición | `https://callbacks.lasolucionweb.com/api/search-integrations/instagram/callback` (propuesto) | Registrar actual y objetivo; validar Meta |
| Meta / Threads | `/api/search-integrations/threads/callback` | Dinámico por host de la petición | `https://callbacks.lasolucionweb.com/api/search-integrations/threads/callback` (propuesto) | Registrar actual y objetivo |
| Facebook / Instagram vía Composio | `/api/composio/callback?app=facebook` o `?app=instagram` | Dinámico: `${origin}/api/composio/callback?...` | `https://callbacks.lasolucionweb.com/api/composio/callback?app=<app>` (propuesto) | Confirmar contrato y apps |
| LinkedIn | `/api/search-integrations/linkedin/callback` | Dinámico por `request.nextUrl.protocol` + `host` | `https://callbacks.lasolucionweb.com/api/search-integrations/linkedin/callback` (propuesto) | Registrar actual y objetivo |
| Pinterest | `/api/search-integrations/pinterest/callback` | Dinámico por URL de la petición | `https://callbacks.lasolucionweb.com/api/search-integrations/pinterest/callback` (propuesto) | Registrar actual y objetivo |
| Tumblr | `/api/search-integrations/tumblr/callback` | Dinámico por URL de la petición | `https://callbacks.lasolucionweb.com/api/search-integrations/tumblr/callback` (propuesto) | Registrar actual y objetivo |
| X (Twitter) | `/api/search-integrations/twitter/callback` | Dinámico por URL de la petición | `https://callbacks.lasolucionweb.com/api/search-integrations/twitter/callback` (propuesto) | Registrar actual y objetivo |
| Blogger | `/api/search-integrations/blogger/callback` | Dinámico por URL de la petición | `https://callbacks.lasolucionweb.com/api/search-integrations/blogger/callback` (propuesto) | Registrar actual y objetivo |
| Composio | `/api/composio/callback?app=<app>` | Dinámico: `startConnection(..., request.nextUrl.origin)` | `https://callbacks.lasolucionweb.com/api/composio/callback?app=<app>` (propuesto), con `state` firmado para volver al origen | Confirmar contrato y lista de apps |

### Verificación realizada

- Confirmados como fijos: `google-oauth.ts`, `google-analytics-oauth.ts` y `bing-oauth.ts`.
- Confirmados como dinámicos: rutas `connect`/`callback` de Instagram, Threads, LinkedIn, Pinterest, Tumblr, X y Blogger.
- Confirmado Composio: `apps/web/src/lib/composio-connections.ts` construye el callback con el `origin` recibido y `/api/composio/callback?app=...`.
- La tabla no convierte el host estable en una decisión: debe aprobarse y probarse en preproducción.

### Ruta crítica para Milton

Después de aprobarse el host objetivo, Milton debe registrar los callbacks nuevos en Google, Meta, LinkedIn, Pinterest, Tumblr, X, Bing y Composio, manteniendo los actuales durante la transición. Google y Meta pueden tardar días en aprobar dominios nuevos.

### Riesgo detectado

No es seguro registrar un único callback estable y asumir que el flujo funcionará sin cambios: los callbacks dependen de cookies, `state`, sesión por host y redirección al origen. B4 debe definir el puente estable, cómo conserva el destino firmado y cómo evita perder la sesión de la app de origen.

## B2. Contraseñas y transferencia al HUB

- La contraseña actual está en `User.passwordHash` y el algoritmo verificado es bcrypt.
- El HUB debe recibir el hash bcrypt por un canal servidor-a-servidor autenticado, o consultar una base compartida controlada; nunca debe viajar al navegador ni incluirse en el token de handoff.
- No se debe pedir registro ni cambio de clave durante la migración. El HUB debe conservar el hash y comprobarlo con bcrypt, sujeto a una prueba de compatibilidad en preproducción.
- La Fase 0 debe cerrar si habrá base compartida o sincronización firmada. Si se sincroniza, el flujo debe ser idempotente, auditable y sin exponer hashes a logs; cualquier rotación futura debe actualizar ambos lados.
- La verificación mínima antes del corte es un muestreo de usuarios reales y de prueba, incluyendo éxito, contraseña incorrecta, usuario inexistente y cuenta administrativa.

## B3. Token firmado y receptor `/api/auth/hub-handoff`

- El HUB emite un token de un solo uso firmado con ES256 (ECDSA P-256); las apps solo reciben la clave pública.
- Claims mínimos: `iss`, `sub` (id local del usuario), `aud` (`ARTICULOS` o `REDES`), `exp` de 60–120 segundos, `iat` y `jti` único. La app valida firma, emisor, audiencia, vencimiento, tolerancia de reloj de ±30 segundos y que el `jti` no se haya consumido.
- El token se transporta en un formulario POST autoenviado al route handler Node `/api/auth/hub-handoff`, nunca en query string. El middleware solo debe permitir la ruta en `PUBLIC_PATHS`; la verificación criptográfica no va en Edge.
- Tras validar, la app comprueba el usuario y los derechos en `ProductEntitlement`, registra/consume el `jti` de forma atómica, crea la cookie de sesión propia del host y descarta el token.
- `returnTo` solo puede ser una ruta relativa de una lista blanca. El token no es la fuente de derechos: una revocación o vencimiento de gracia debe bloquearse en la siguiente petición protegida leyendo la base local.
- Pruebas negativas obligatorias: firma incorrecta, algoritmo `none`, `aud` ajena, token vencido, `jti` repetido, emisor incorrecto y `returnTo` absoluto.

## B4. DNS, certificados y dominio estable de callbacks/MCP

- Antes del corte se deben preparar en privado `seototal.articulos.lasolucionweb.com` y `seototal.redes.lasolucionweb.com`, verificar certificados y no enlazarlos públicamente todavía.
- El dominio actual `seototal.lasolucionweb.com` no puede trasladarse al HUB sin conservar las rutas de máquina. Debe existir un dominio estable, propuesto aquí como `callbacks.lasolucionweb.com`, que sobreviva al corte y aloje o reenvíe los callbacks y MCP/OAuth2.
- Debe inventariarse y probarse `/api/mcp`, `/api/oauth2/*`, `/.well-known/*`, además de todos los callbacks. El puente debe conservar método y parámetros (308 o rewrite) y mantenerlo activo hasta que los registros demuestren que no quedan consumidores del host viejo.
- La Fase 0 debe confirmar si Vercel emite certificados para estos subdominios de cuarto nivel; no se debe asumir que `*.lasolucionweb.com` cubre `seototal.articulos.lasolucionweb.com`.
- Se baja el TTL de DNS varios días antes, se ensaya el movimiento entre proyectos en preproducción y se conserva el dominio/callback actual hasta completar la verificación de reconexión.

## B5. Guion del corte y reversa

1. Congelar cambios de schema y despliegues; confirmar que el plan de reversa está ensayado.
2. Verificar subdominios, certificados, dominio estable y puente de rutas de máquina.
3. Registrar y probar callbacks nuevos; conservar los antiguos.
4. Importar usuarios/derechos al HUB, comparar conteos y muestrear logins con las mismas credenciales.
5. Convertir derechos no comprados a `GRACE` con cinco días, respetando administradores y excepciones configuradas por Milton.
6. Probar acceso de emergencia de administradores y «Acceder como».
7. Cambiar el interruptor `legacy`→`dual`, probar una cuenta de cada tipo y cada servidor de marca; después cambiar a `hub`.
8. Mover el dominio viejo al HUB con redirección solo de interfaz y puente de rutas de máquina.
9. Verificar reconexión de un proveedor de cada familia (Google, Bing, redes, Composio) y MCP/Alexa/Claude.
10. Si falla una comprobación, volver inmediatamente el interruptor a `legacy` (o `dual` si procede), devolver el dominio al proyecto actual y conservar logs para diagnóstico. No continuar con una contradicción de Vercel, middleware, schema, migración o callbacks.

### Revisión de riesgos y contradicciones

- No se detecta una contradicción con las decisiones cerradas: el host estable, el mecanismo exacto de transferencia de hashes y la base compartida/sincronizada siguen marcados como decisiones de Fase 0.
- El riesgo principal de B1/B4 es que un callback estable no conserva automáticamente cookies ni sesión del host de origen; el diseño debe firmar el destino en `state` y completar el flujo de retorno de forma explícita.
- La propuesta no autoriza todavía registro de dominios, cambios DNS, middleware, migraciones ni despliegues.
