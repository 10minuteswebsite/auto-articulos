# CONTRATO ENTRE EL HUB Y SEO TOTAL (Artículos y Redes)

**Para:** Mario y el equipo del HUB · **De:** el proyecto «Separación de SEO Total» (Claude/Codex, por encargo de Milton) · **Fecha:** 2026-10-02
**Estado:** propuesta para acordar. Lo marcado **[HOY]** está verificado en el código; lo marcado **[PROPUESTA]** aún no existe y hay que acordarlo; lo marcado **[NUESTRO LADO]** lo construimos nosotros después del acuerdo.

> **Cómo está construido SEO Total, en una frase:** el HUB es la fuente de **identidad y compra**; SEO Total guarda una copia de los derechos de **dos productos** (Artículos y Redes) y **decide con ella** en cada petición, así que una caída del HUB no deja a nadie sin acceso. Este documento **describe esa construcción para que el HUB se adecue**; no es una orden. Todo lo marcado [PROPUESTA] se habla en `BUZON_HUB_SEO_TOTAL.md`.

---

## 1. Cómo se reparte la autoridad

| Tema | Quién manda | Detalle |
|---|---|---|
| Quién es el usuario (identidad, correo, teléfono) | **HUB** (desde el Día Cero) | Hasta el Día Cero manda el login actual de SEO Total |
| Qué compró cada usuario (Artículos, Redes) | **HUB** | SEO Total lo guarda copiado en su tabla local |
| Decidir **en cada petición** si puede usar una función | **SEO Total** (tabla local `ProductEntitlement`) | Nunca se decide con lo que trae un token ni con una llamada al HUB en cada clic |
| Datos del usuario (artículos, proyectos, conexiones, historial) | **SEO Total** | El HUB no los toca ni los ve |
| Conexiones a redes (Google, Meta, LinkedIn, etc.) | **SEO Total / Composio** | Compartidas por cuenta, nunca por producto |
| Acceso de emergencia de administradores | **SEO Total** | Funciona aunque el HUB esté caído |

**Principio:** el HUB informa; SEO Total decide y recuerda. Si el HUB no responde, **SEO Total sigue con lo último que sabía** y nadie pierde acceso.

## 2. Lo que existe hoy [HOY] (leído de la rama `codex/hub-seo-total-migration`, solo lectura)

Variables de entorno en SEO Total: `HUB_BASE_URL` (por defecto `https://hub.lasolucionweb.net`), `AUTO_ARTICULOS_HUB_CLIENT_ID` (`seo-total`), `AUTO_ARTICULOS_HUB_CLIENT_SECRET`. Todas las llamadas servidor-a-servidor llevan:
`x-platform-client-id: <client id>` y `Authorization: Bearer <client secret>`.

| # | Dirección | Endpoint | Qué hace hoy |
|---|---|---|---|
| H1 | HUB → SEO Total | `GET /auth/hub?code=<código>` (en SEO Total) | Recibe un código temporal (40–80 caracteres), lo canjea con H2, busca al usuario por `hubUserId` o por correo (o lo crea), abre la **cookie de sesión** local y redirige a `/dashboard` |
| H2 | SEO Total → HUB | `POST {HUB}/api/product-launch` `{code, app:"seo-total"}` | Devuelve `platform_user_id`, `auth0_sub`, `email`, `platform_role`, `entitlement_status` |
| H3 | SEO Total → HUB | `POST {HUB}/api/integrations/auto-articulos/access` `{hub_user_id}` | Devuelve `{allowed: boolean}`; SEO Total lo guarda 60 s en memoria. Si el HUB falla, **se deja pasar** (fail-open) |
| H4 | SEO Total → HUB | `POST {HUB}/api/integrations/auto-articulos/user-sync` `{local_user_id, email, name, first_name, last_name, phone, role, product_access}` | Alta/cambios de perfil; devuelve `hub_user_id`, `auth0_sub`, `product_access` |

Hoy el HUB habla de **un solo derecho** (`product_access` / `allowed` / `entitlement_status`), que SEO Total guarda en `User.trialUnlocked`. **Eso es lo que hay que ampliar a dos productos.**

## 3. Lo que SEO Total espera encontrar del lado del HUB, y por qué [PROPUESTA, a hablar en el buzón]

### 3.1 Dos productos, con identificadores fijos

| Producto | Identificador (`product`) | Slug de lanzamiento (`app`) | Subdominio |
|---|---|---|---|
| SEO Total Artículos | `ARTICULOS` | `seo-total-articulos` | `seototal.articulos.lasolucionweb.com` |
| SEO Total Redes | `REDES` | `seo-total-redes` | `seototal.redes.lasolucionweb.com` |

(Nunca «Redes Totales».) El slug `seo-total` actual debe **seguir funcionando** durante la transición y equivaler a `seo-total-articulos`.

### 3.2 Forma de un derecho (igual en todos los mensajes)

```json
{
  "product": "ARTICULOS",
  "status": "ACTIVE",
  "grace_until": null,
  "updated_at": "2026-10-02T15:00:00Z",
  "event_id": "evt_01H..."
}
```

- `status` ∈ `ACTIVE` | `GRACE` | `INACTIVE`.
- `grace_until`: fecha ISO UTC. **Obligatoria si `status = GRACE`; debe ser nula en los demás casos.** (La base de SEO Total rechaza una gracia sin fecha.)
- `event_id`: identificador único del cambio, para que repetir un mensaje **no** lo aplique dos veces (idempotencia).
- Un producto que **no aparece** en el mensaje significa **«sin cambios»**. **Nunca se revoca por omisión:** revocar es enviar `INACTIVE` de forma explícita.

### 3.3 Cambios a los endpoints actuales (compatibles hacia atrás)

- **H2 (`product-launch`)**: añadir `entitlements: [ ... ]` (lista de derechos como en 3.2) además de los campos actuales. Aceptar `app` = `seo-total`, `seo-total-articulos` o `seo-total-redes`. Si el código se emitió para Redes, SEO Total aterriza al usuario en la portada de Redes.
- **H3 (`access`)**: responder **además** de `allowed` con `entitlements: [ ... ]`. `allowed` queda como `true` si **cualquiera** de los dos productos está `ACTIVE` o `GRACE` vigente (compatibilidad).
- **H4 (`user-sync`)**: SEO Total envía además `entitlements` locales **solo en la importación inicial** (para que el HUB parta de lo que ya existe: 106 usuarios con Artículos; los que tengan Redes aprobadas con Redes). Después, **el HUB es quien los modifica**.
- **Nuevo H5 (opcional pero recomendado), HUB → SEO Total:** `POST /api/hub/entitlements` en SEO Total, con firma `HMAC-SHA256` sobre el cuerpo (cabecera `x-hub-signature`) y `x-hub-timestamp` (rechazamos mensajes de más de 5 minutos). Cuerpo: `{hub_user_id, entitlements:[...]}`. Sirve para que una compra, una revocación o una gracia surtan efecto **al instante** sin esperar la siguiente revalidación. **[NUESTRO LADO]**: lo construimos tras el acuerdo.

### 3.4 Gracia

- **Día Cero:** SEO Total convierte localmente a `GRACE` (fecha de corte + 5 días) a quien no ha comprado. Ese cambio se **informa al HUB** (H4 con los derechos) para que el HUB no lo pise.
- Después, la gracia puede **extenderse o quitarse** desde el HUB o desde Administración de SEO Total (Milton lo hace por usuario). **Regla de conflicto [A DECIDIR POR MILTON]:** una gracia puesta a mano en Administración (`source = ADMIN`) con fecha futura **no se sobrescribe** por una sincronización del HUB; solo un mensaje con `updated_at` más reciente que el cambio local puede cambiarla.

### 3.3b Qué hace SEO Total al recibir un derecho [NUESTRO LADO]

1. Verifica firma/credenciales y `event_id` no repetido.
2. Valida: producto conocido, `status` válido, `GRACE` con fecha.
3. Escribe en `ProductEntitlement` con `source = HUB` y **sube `version`**; inserta una fila en `ProductEntitlementEvent` (historial).
4. Ignora productos desconocidos y registra el aviso. No borra nada.

## 4. Entrada del usuario (login) [PROPUESTA sobre lo que ya existe]

1. El usuario inicia sesión **en el HUB** y pulsa Artículos o Redes.
2. El HUB emite un **código de un solo uso**, vida ≤ 60 s, ligado a `app` y a `hub_user_id`.
3. El navegador va a `https://<subdominio del producto>/auth/hub?code=...` [HOY existe `/auth/hub`].
4. SEO Total canjea el código (H2), resuelve al usuario **por `hubUserId` y, si no existe, por correo normalizado** [HOY], aplica los `entitlements` recibidos y abre su sesión.
5. **Nunca se usan cookies ni tokens del HUB para autorizar peticiones**: SEO Total usa su propia cookie y su tabla local.

**Interruptor de login (`legacy` / `dual` / `hub`)** **[NUESTRO LADO, hoy NO construido; solo existe `legacy`]**:
`legacy` = manda el login actual; `dual` = conviven; `hub` = el login actual redirige al HUB. Volver atrás es cambiar el interruptor, sin desplegar. **Qué necesitamos de Mario:** confirmar si su rama ya incluye algo equivalente; si no, lo construimos nosotros con este contrato.

**Acceso de emergencia (obligatorio antes de `hub`):** los administradores conservan un acceso directo con contraseña por una ruta no enlazada, y «Acceder como» funciona en los tres modos. El HUB **no debe** poder desactivarlos.

**Contraseñas [DECISIÓN ABIERTA]:** hoy están en `User.passwordHash` (bcrypt). El usuario debe poder entrar al HUB **con las mismas credenciales**. El HUB hoy crea cuentas nuevas con una contraseña aleatoria. Hay que acordar: (a) importación de hashes por canal seguro, o (b) restablecimiento guiado en el primer acceso. **Nunca** se envían hashes por un canal sin cifrar ni se exponen en registros.

## 5. Qué NO puede moverse al HUB el Día Cero (críticos)

Un dominio de Vercel solo pertenece a un proyecto. Si `seototal.lasolucionweb.com` pasa al HUB, **dejan de responder**: `/api/mcp`, `/api/oauth2/*` y `/.well-known/*` (Alexa+, Claude), y los retornos de conexión de LinkedIn, Pinterest, Tumblr, X, Blogger y Bing. El HUB debe:

1. Reenviar esas rutas de máquina al **dominio estable de callbacks/MCP** con **redirección 308** (o *rewrite*) que conserve método y parámetros.
2. Mantener ese puente hasta comprobar con registros que nadie usa ya el host viejo.
3. Redirigir **solo a las personas** (`/`, `/login`, interfaz), no todo el dominio.

Google y Meta van por Composio y no dependen de nuestros callbacks. El **protocolo de paso a Composio es intocable**.

## 6. Seguridad (obligatoria)

- Secretos solo como variables protegidas; **rotarlos** al terminar la migración. Nunca en el repositorio ni en registros.
- Código de lanzamiento: un solo uso, ≤ 60 s, ligado a `app` y usuario; el HUB lo invalida al canjearse.
- H5 firmado y con marca de tiempo; **idempotente** por `event_id`.
- Limitar la tasa de llamadas y registrar auditoría (quién, qué, cuándo) en ambos lados.
- Cifrado en tránsito (HTTPS) siempre.
- SEO Total **no confía** en que el HUB diga «allowed» como única barrera: la barrera real es su tabla local en APIs y worker.

## 7. Si algo falla

| Situación | Comportamiento esperado |
|---|---|
| HUB caído | SEO Total conserva el último derecho guardado; nadie pierde acceso; las altas nuevas se reintentan (ya existe `sync-hub-users`) |
| Mensaje repetido | Ignorado por `event_id` |
| Mensaje con firma o fecha inválida | Rechazado con 401; sin cambios |
| Producto desconocido | Se ignora y se registra |
| `GRACE` sin fecha | Se rechaza ese derecho; no se aplica |
| Usuario sin cuenta local | Se crea (como hace hoy `/auth/hub`) con derechos del mensaje; si no trae ninguno, **no se le da acceso** |
| Revocación (`INACTIVE`) | Efecto inmediato en APIs y worker; el usuario ve el aviso de acceso terminado |
| Correo cambiado | Se resuelve por `local_user_id` y actualiza el correo; **no** crea cuenta nueva |

## 8. Pruebas que deben pasar en ambos lados antes del Día Cero

☐ Importación: conteos iguales (106 usuarios; 106 Artículos; los de Redes que correspondan).
☐ Usuario solo Artículos / solo Redes / ambos / administrador entran por el HUB y ven lo suyo.
☐ Revocar Redes a un usuario de prueba: pierde Redes y **conserva Artículos**.
☐ Gracia con fecha: aparece el aviso con los días correctos; al vencer se bloquea ese producto.
☐ HUB apagado a propósito: nadie pierde acceso; administradores entran por emergencia.
☐ Mensaje H5 duplicado, con firma mala y con hora vieja.
☐ Reconectar una integración de cada proveedor tras mover el dominio.
☐ Reversa: volver el login a `legacy` y el dominio al proyecto anterior.

## 9. Preguntas abiertas para Mario

1. ¿El HUB ya modela **dos productos** o hay que ampliarlo? ¿Qué nombres de `app` usará?
2. ¿Prefieren H5 (empujar) o que SEO Total consulte en H3 con caché de 60 s? (Recomendamos ambos.)
3. ¿Cómo viajarán las contraseñas (4, «Contraseñas»)?
4. ¿Existe ya un interruptor `legacy/dual/hub` en su rama o lo construimos nosotros?
5. ¿Cómo marcan «han comprado» vs «no han comprado» (define a quién se convierte a gracia)?
6. ¿Qué hace el HUB con las cuentas de prueba y los tipos de usuario (incluido «PRUEBAS»)?

## 10. Lo que construirá SEO Total tras el acuerdo [NUESTRO LADO]

1. Función única `applyHubEntitlements(userId, entitlements, source=HUB)` con las reglas de 3.3b y pruebas.
2. Endpoint H5 firmado e idempotente.
3. Ampliar el lector de H2/H3 a `entitlements` (compatible con el formato viejo).
4. Interruptor de login `legacy/dual/hub` con acceso de emergencia.
5. Paneles de Administración: ver origen (`source`) y versión del derecho de cada usuario.

*Documento relacionado:* `MANUAL_DIA_CERO.md` (pasos operativos) y `ARQUITECTURA_FINAL_DERECHOS_POR_PRODUCTO.md` (cómo funciona hoy por dentro).
