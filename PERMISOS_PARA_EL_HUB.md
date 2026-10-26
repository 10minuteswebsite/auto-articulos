# Permisos de Redes que el HUB debe conocer y otorgar

Fecha: 2026-10-26 · Origen: caso de Juan Carvajal (SEO Total), asistente IA sin poder publicar.
Fuente: lectura del código de `main` (no se tocó producción).

## 1. Causa del caso de Juan (resumen)

Un usuario necesita **dos cosas distintas** para publicar en redes:

| # | Qué es | Dónde vive | Quién lo da hoy |
|---|---|---|---|
| A | **Derecho al producto REDES** (`ProductEntitlement`, estado `ACTIVE`/`GRACE`) | Tabla `ProductEntitlement` | El Hub, vía `POST /api/integrations/hub/access-sync` (`app` + `allowed`) |
| B | **Permiso de publicación por red** (9 casillas `allow…Publishing`) | Columnas de `User` | **Solo un admin, a mano**, en Administración → Usuarios. El Hub NO las envía |

Todo usuario nuevo nace con las 9 casillas en `false`. El Hub solo entrega el punto A; por eso una cuenta creada por el Hub entra a Redes pero queda con todas las redes «sin conectar» y con «No tienes permiso para publicar en X».

La excepción: en `redes.lasolucionweb.com/.net` todas las redes se abren a todas las cuentas (el código ignora las casillas). En `seototal`, `articulos` o en el servidor MCP del asistente **sí mandan las casillas**. Por eso Juan publica a mano (en el host de Redes) y su asistente no.

## 2. Los 9 permisos por red (todos deben ir en `true` para publicar en todo)

Columna de la tabla `User`, tipo Boolean, **default false**. Solo admin los cambia (`PATCH /api/admin/users`).

| Campo | Red / destino | Qué bloquea si es `false` | Mensaje que verá el usuario |
|---|---|---|---|
| `allowInstagramPublishing` | Instagram (post, story, reel) | Aparece «sin conectar»; no se generan propuestas ni se publica | «No tienes permiso para publicar en Instagram.» |
| `allowFacebookPublishing` | Facebook (Página) | Igual | «…en Facebook.» |
| `allowLinkedInPublishing` | LinkedIn | Igual | «…en LinkedIn.» |
| `allowThreadsPublishing` | Threads | Igual | «…en Threads.» |
| `allowPinterestPublishing` | Pinterest | Igual | «…en Pinterest.» |
| `allowTumblrPublishing` | Tumblr | Igual | «…en Tumblr.» |
| `allowBlueskyPublishing` | Bluesky | Igual | «…en Bluesky.» |
| `allowBloggerPublishing` | Blogger | Igual | «…en Blogger.» |
| `allowGoogleBusinessPublishing` | Google Business Profile (vía PostPeer) | Igual | «…en Google Business Profile.» |

Notas:
- `allowMastodonPublishing` existe en la base pero **no tiene uso en el código** hoy; ignorarlo.
- X (Twitter) está apagada a propósito (decisión de Milton 30/8/2026); no tiene casilla activa.
- Los administradores (`role = admin`) siempre pueden, sin casillas.
- Tener la red **conectada** (OAuth en Configuración → Conexiones) no basta: la conexión y la casilla son independientes. «Conectada» en Conexiones + «sin conectar» en Redes = casilla en `false`.

## 3. Permisos asociados que también debe tener el usuario

| Permiso | Campo / tabla | Valor necesario | Para qué |
|---|---|---|---|
| Derecho REDES | `ProductEntitlement` (product=REDES) | `ACTIVE` (o `GRACE` vigente) | Entrar a Redes y a las herramientas MCP de redes. Lo da el Hub (`app: "auto-redes"` o `"seo-total"`, `allowed: true`). |
| Derecho ARTÍCULOS | `ProductEntitlement` (product=ARTICULOS) | `ACTIVE` | Artículos del blog (los 5 de Juan sí salen). |
| Módulo Redes no apagado | `User.disabledModules` | No debe incluir `oportunidades-redes` | Un admin puede ocultar el módulo a una cuenta. |
| Cupo diario | `User.socialDailyLimits` (JSON por formato) | Número ≥ 1 (si no hay valor, es 1; **0 bloquea**) | Publicaciones por día y red. |
| Scope MCP | token del asistente | `oportunidades:leer` y los de acción | El asistente solo ve/ejecuta lo que su token permite. |

## 4. Qué debe hacer el HUB para que no se repita

1. Al aprobar a un usuario en `auto-redes`/`seo-total`, además de `allowed: true`, enviar (o dejar que Redes aplique por defecto) las **9 casillas en `true`**. Hoy `access-sync` no acepta esos campos: requiere un cambio en Redes (aceptar `network_permissions` opcional, o poner las 9 en `true` al crear con `allowed=true`). Está pendiente de decisión de Milton; no se hizo.
2. Mientras tanto: tras dar de alta a un cliente, un admin marca las 9 casillas en Administración → Usuarios → ficha de la cuenta → permisos de difusión → Guardar.
3. Revocar: `allowed: false` quita el derecho de producto, pero **no apaga las casillas**; el Hub debe saberlo.

## 5. Corrección aplicada a Juan (2026-10-26, verificada tras recargar)

Cuenta #115 (jc.realtyonegroup@gmail.com, juanchocarvajal.com). Antes: **Módulo de Redes «Desactivado»** y las 8 redes «Sin aprobar»; derechos de producto Artículos y Redes ya estaban «Activo».
Ahora: Módulo de Redes **Activado** y **Aprobadas** Instagram, Facebook, Threads, LinkedIn, Pinterest, Bluesky, Google Business Profile y Tumblr.

Hallazgos nuevos para el Hub:
- Existe un **décimo interruptor**: «Módulo de Redes» (`disabledModules` → `oportunidades-redes`). Sin él, las casillas no abren nada.
- **Blogger** (`allowBloggerPublishing`) no tiene casilla en la ficha de Administración; no se pudo marcar desde la pantalla. Hay que habilitarla por API/código si se necesita.
- Un valor pegado por script no activa el guardado: hay que marcar con clic real y pulsar «Guardar cambios».

## 6. Qué NO está verificado

- Falta la prueba real: que el asistente de Juan publique en LinkedIn (la repite Juan).

## 7. Decisión de Milton (2026-10-26): redes aprobadas por defecto

Migración `20261026120000_social_publishing_default_on`: las 8 casillas (Instagram, Facebook, LinkedIn, Threads, Pinterest, Tumblr, Bluesky, Google Business) pasan a `DEFAULT true` y se rellenan en las cuentas existentes. Blogger y X quedan fuera. Desde ahí el Hub solo debe comprobar que el derecho REDES esté `ACTIVE` y que ninguna casilla se haya apagado a mano.
