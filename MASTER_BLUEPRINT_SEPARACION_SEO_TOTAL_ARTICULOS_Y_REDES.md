# MASTER BLUEPRINT — SEPARACIÓN DE SEO TOTAL ARTÍCULOS Y SEO TOTAL REDES

Proyecto: **SEPARACION DE SEO TOTAL DE REDES TOTALES**
Fecha: 2026-10-01 · Autor de la entrevista: MAGO + Milton · Estado: **Fase 0 pendiente de aprobación. No hay código.**

> Nombre comercial definitivo (decisión de Milton): **SEO Total Artículos** y **SEO Total Redes**.
> "Redes Totales" era un nombre provisional y no debe usarse en ningún texto, ruta ni código.

---

## 1. Propósito del documento

Fuente de verdad para convertir la aplicación única actual (SEO Total, en `seototal.lasolucionweb.com`) en **dos productos independientes de cara al cliente**, que convivan en el mismo código y que en el futuro sean activados, facturados y desactivados por una **interfaz superior (el HUB)** que será dueña del login.

## 2. Rol que debe asumir Claude Code

Arquitecto y desarrollador senior de un SaaS multiusuario ya en producción. Debe actuar con cautela absoluta: la prioridad número uno es **no dejar fuera a ningún usuario actual y no tumbar producción**. Cada decisión se justifica contra esa prioridad.

## 3. Reglas obligatorias de Milton (no negociables)

1. **Obedecer ciegamente el documento `COORDINACION_CLAUDE_CODEX.md`** (Protocolo de No Destrucción, worktree aislado fuera del checkout principal, reserva/liberación de archivos, capitanía con `scripts/migration-coordinator.sh`, nunca `git add .`, tres auditorías antes de producción, advertencia de Vercel, PR normal y no push directo a `main`).
2. **Schema y migración van en el mismo commit y la migración se aplica antes o junto con el merge.** Incidente real del 2026-09-08.
3. **Hoy no se programa nada que le quite autoridad al login actual.** El login actual manda hasta el día de corte que Milton decida.
4. **Nadie queda fuera** de la aplicación actual en ningún lote previo al corte.
5. **Actualizar el manual de usuario (`manual-usuario.ts`) en el mismo lote que cada cambio visible.**
6. Antes de subir algo a producción declarar: *"Subiré a producción de acuerdo al Protocolo de No Destrucción."*

## 4. Visión, misión y objetivo

- **Visión:** que SEO Total Artículos y SEO Total Redes se vean y se comporten como dos aplicaciones distintas: quien paga por una obtiene esa, y quien paga por la otra obtiene la otra.
- **Misión:** separar por función, sin romper nada, y dejar el código preparado para que el HUB tome el control del acceso y la facturación mediante un protocolo de transferencia ya diseñado y ensayado.
- **Objetivo principal:** llegar al **día del corte** con todo construido, probado y reversible, de modo que el cambio sea un interruptor y no una obra.

## 5. Principios del producto

1. Separación **por función**, no por duplicación de código.
2. **Una cuenta, una fuente de verdad** para identidad, derechos y conexiones.
3. Todo lo nuevo nace **inerte** (encendido para todos, sin cambio visible) hasta que se enciende a propósito.
4. Todo cambio de acceso debe ser **reversible con un interruptor**.
5. El HUB decide *quién tiene derecho*; cada app decide *qué muestra y qué bloquea*.
6. Los tres servidores de marca (`site`, `net`, `tagcrush`) deben seguir funcionando; **tagcrush es marca blanca** y sus usuarios no deben ver nada que diga "10minutesWebsite".

## 6. Estado actual verificado (investigación de solo lectura, 2026-10-01)

A confirmar de nuevo en la Fase 0 antes de apoyarse en cualquier dato.

- **Activador de Redes:** no existe un único interruptor. Hay 10 booleanos por red o blog en `User` (`allowInstagram/Facebook/LinkedIn/Threads/Pinterest/Tumblr/Bluesky/Mastodon/DevTo/Blogger/GoogleBusinessPublishing`, todos `@default(false)`, `packages/db/prisma/schema.prisma` ~112-134). "Redes aprobado" se deriva en `apps/web/src/lib/social-access.ts` (`hasSocialPublishingApproval`: admin o al menos una red en true).
- **Dónde se aplica hoy el bloqueo de Redes:** menú (`DashboardNav.tsx`), guard de ruta (`ModuleGuard.tsx`), home (`dashboard/page.tsx`, `ComienzaAqui.tsx`), `api/me`, y las APIs `api/social-opportunities/*` con 403. **El worker (`apps/worker`) no revisa estos permisos.**
- **Activador de Artículos:** **no existe.** Todo usuario lo tiene.
- **Sistema de módulos:** `apps/web/src/lib/modules.ts` (`SYSTEM_MODULES`, ocultación global vía `SystemSetting.global_disabled_modules` y por usuario vía `User.disabledModules`). Base natural para el nuevo mecanismo.
- **Planes, facturación, derechos:** no existe nada en código.
- **Servidores de marca:** `packages/shared/src/platform-servers.ts` (`net`, `site`, `tagcrush`; asignación por `User.platformDomain`; helper `platformProductName()`).
- **Estructura del menú:** plana. Rutas de Artículos: `publicar`, `oportunidades`, `publicaciones-en-curso`, `historial`. Rutas de Redes: `oportunidades-redes`, `configuracion/redes-sociales`, `configuracion/conexiones`.
- **Dominio fijo en código (auditoría 2026-10-01):** los callbacks de Google Search Console, Google Analytics, Google Business Profile y Bing están **escritos a mano** con `https://seototal.lasolucionweb.com/...` (`apps/web/src/lib/google-oauth.ts`, `google-analytics-oauth.ts`, `bing-oauth.ts`; con override por variable de entorno). LinkedIn, Instagram, Pinterest y otras construyen el callback con el **host de la petición**. El login (`login/page.tsx`) y el asistente (`api/assistant/chat/route.ts`) también tienen URLs fijas.
- **Servidor MCP y OAuth2 propios** (`/api/mcp`, `/api/oauth2/*`, `/.well-known/oauth-*`) en rutas públicas del middleware, consumidos por clientes externos (Alexa+, Claude) registrados contra el dominio actual.
- **Sesión:** cookie HMAC `auto_articulos_session`, **sin atributo `domain`** (cada host tiene su propia sesión), `sameSite=lax`, con renovación deslizante en el middleware (`apps/web/src/middleware.ts`). Contraseñas: **bcrypt** en `User.passwordHash`.
- **Conexiones:** cada integración (`SearchIntegration`, `InstagramIntegration`, etc.) está atada a `userId`, no a un módulo: ya son compartibles por cuenta sin cambiar el modelo.
- **Usuarios de prueba:** existen `isTrialSignup`, `trialStartedAt`, `trialUnlocked` (schema ~168-170) y `TO-DO.md` pide un tipo "PRUEBAS".

## 7. Arquitectura funcional objetivo

```
                    ┌──────────────────────────────┐
                    │   HUB (seototal.lasolucionweb.com)  │  ← FUTURO: login, tienda, facturación,
                    │   identidad + derechos       │     activar/desactivar apps
                    └──────────────┬───────────────┘
                     token firmado │ (pulsera de un solo uso)
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
 seototal.articulos.lasolucionweb.com      seototal.redes.lasolucionweb.com
   SEO Total Artículos                       SEO Total Redes
              └───────────── mismo código, misma cuenta ─────────────┘
                   Conexiones compartidas por cuenta (GSC, Composio, redes)
```

Antes del corte: el login actual sigue siendo la autoridad; el HUB todavía no existe en producción.

### 7.1 Decisiones cerradas en la entrevista

| # | Decisión |
|---|---|
| 1 | Dos subdominios: `seototal.articulos.lasolucionweb.com` y `seototal.redes.lasolucionweb.com`. El dominio actual `seototal.lasolucionweb.com` pasa a ser **la puerta del HUB para las personas** el día del corte (con las excepciones de 9.5). |
| 2 | Entrada del HUB a cada app: **token firmado de un solo uso** (ver 9). Más adelante, un solo login en el HUB. |
| 3 | **Corte único.** Ese día: (1) la autoridad del login pasa al HUB; (2) nacen los subdominios nuevos; (3) el dominio viejo lleva al HUB a las **personas** (`/`, `/login` y rutas de interfaz). **No se redirige a ciegas todo el dominio**: ver 9.5 (callbacks OAuth y servidor MCP). Los usuarios entran al HUB **con sus mismas credenciales**. |
| 4 | El usuario sin compra ve una interfaz para comprar el servicio. **Gracia de 5 días**, que Milton puede quitar o modificar por usuario desde Administración. |
| 5 | La gracia aplica **por app**: Redes solo a quien ya tenga alguna red aprobada; Artículos a **todos** los usuarios actuales. |
| 6 | Se prepara todo **antes** del corte dentro de la app actual: base invisible **más** separación visual, ambas, y separación **por función** desde el inicio. |
| 7 | Se crea ahora un **activador de Artículos**, encendido para todos por defecto. |
| 8 | **Conexiones compartidas por cuenta:** si el usuario conectó Google Search Console desde Artículos, al adquirir Redes esa conexión ya aparece como conectada y no se le pide conectar de nuevo; vale igual en sentido inverso. Nunca se conecta dos veces. |
| 9 | Los tipos de usuario deben ser visibles para el HUB. Hoy nadie paga; al pasar al HUB pagarán. |

### 7.2 Decisiones por defecto que propone MAGO (Milton las puede cambiar en la Fase 0)

- Un solo despliegue y un solo código, con **modo de producto por host** (`articulos`, `redes` o `legacy`). El host legacy (`seototal.lasolucionweb.com`) mantiene el comportamiento actual con ambas apps.
- Los derechos viven en una tabla nueva y se **alimentan de lo que ya existe**; no se borra ni se reemplaza ningún `allow*Publishing`.
- El HUB es una aplicación aparte. Es dueño de identidad y derechos; cada app conserva su fila local de `User` con el mismo id.

## 8. Módulos y su reparto por función

| Función | Pertenece a | Nota |
|---|---|---|
| Publicar (propios), Oportunidades, Publicaciones en curso | **Artículos** | |
| Oportunidades de redes (módulo 3), permisos por red, `configuracion/redes-sociales` | **Redes** | |
| `configuracion/contenido` (firma, estilo), `indexacion`, `inicial` (asistente de dominio) | **Artículos** | |
| `configuracion/conexiones` | **Compartida por cuenta** | Una sola fuente de verdad (ver 8.1). |
| Historial y Estadísticas | **Se dividen por app** | Cada app muestra solo sus datos. |
| `cuenta` (contraseña, perfil) y todo lo de pagos | **HUB** (en el futuro) | Hasta entonces, entrada discreta "Mi cuenta" visible desde ambas apps. |
| `movil`, `mcp`, `composio`, `postpeer`, `usuarios` | **A clasificar en la Fase 0** | Admin queda fuera de ambos productos. |

### 8.1 Capa de conexiones compartidas

- Las conexiones (Google Search Console, Composio, cuentas de redes y blogs) pertenecen al **usuario**, no a una app.
- Cada app **muestra** la lista de conexiones que usa, con el estado real y compartido: si existe en la cuenta, aparece "Conectada" sin pedirla otra vez.
- Una conexión realizada desde cualquiera de las dos apps queda disponible de inmediato en la otra.
- La Fase 0 debe confirmar en el modelo de datos actual que los tokens ya son por usuario y no por módulo, y listar cada conexión con la app o apps que la consumen.

## 9. Protocolo de transferencia al HUB

### 9.1 Token firmado de un solo uso ("la pulsera")

- Lo emite el HUB cuando el usuario pulsa "Abrir SEO Total Artículos" o "Abrir SEO Total Redes".
- **Firma asimétrica** (el HUB firma con clave privada; las apps solo verifican con la clave pública, así ninguna app puede falsificarlo).
- Contenido mínimo (claims): emisor, usuario (`sub` = id), app destino (`aud`), vencimiento (60 a 120 segundos) e identificador único (`jti`, de un solo uso). **El token solo autentica; no es la fuente de los derechos.** Puede llevar los derechos como pista informativa, pero la app **nunca decide acceso con ellos**.
- **Los derechos se leen siempre de la tabla local `ProductEntitlement`**, que el HUB mantiene al día mediante llamada/webhook firmado (ver 10). Se comprueban **en cada petición protegida**, no solo al abrir sesión: una sesión de varios días no puede sobrevivir a un derecho revocado ni a una gracia vencida.
- La app valida firma, destino, vencimiento y que el `jti` no se haya usado (almacén en base de datos con limpieza), crea su sesión con el mecanismo de sesión actual y descarta el token.
- **Algoritmo:** ES256 (ECDSA P-256), compatible con Web Crypto. La verificación se hace en un **route handler Node** (`/api/auth/hub-handoff`), no en el middleware Edge. Esa ruta debe añadirse a `PUBLIC_PATHS`; el middleware es zona protegida y se toca solo con la advertencia de Vercel y las tres auditorías.
- Reloj: tolerancia de desfase de ±30 s.
- **Transporte:** el HUB entrega el token con un **formulario POST autoenviado** hacia `/api/auth/hub-handoff` de la app destino, no en la URL, para que no quede en historial, registros ni cabecera *referrer*. La cookie de sesión de la app es **propia de cada host** (hoy no lleva atributo `domain`), así que el token funciona igual entre subdominios o dominios totalmente distintos, sin cookies compartidas.
- **`returnTo`:** solo se admiten rutas relativas internas de una lista blanca; nunca una URL absoluta (evita redirección abierta).
- Base reutilizable: la cookie de suplantación de "Acceder como".

### 9.2 Autoridad del login: tres estados con interruptor

Un interruptor de configuración (por ejemplo en `SystemSetting`), reversible sin desplegar:

1. **`legacy` (estado actual y por defecto):** manda el login actual; el receptor del HUB existe pero está apagado.
2. **`dual`:** el login actual y el HUB conviven; cualquiera de los dos puede abrir sesión.
3. **`hub`:** manda el HUB; el login actual redirige al HUB. Solo se activa el día del corte.

El **rollback** es volver a `legacy` o `dual`.

**Acceso de emergencia (obligatorio antes de usar `hub`):** aunque el modo sea `hub`, los **administradores** conservan un acceso directo por contraseña en una ruta no enlazada, para que una caída del HUB no deje a nadie sin soporte. "Acceder como" (cookie de suplantación) debe seguir funcionando en los tres modos. El día del corte se verifica que los dos funcionan.

### 9.3 Credenciales

El usuario debe poder entrar al HUB **con las mismas credenciales**. La Fase 0 debe decidir cómo se transfieren los hashes de contraseña (algoritmo actual, sincronización o importación) **sin pedir registro ni cambio de clave**, y sin exponer hashes fuera de un canal seguro.

### 9.4 Plan del día de corte (guion, a detallar en la Fase 0)

1. Congelar cambios de schema y despliegues.
2. Verificar que los subdominios nuevos ya existen, tienen certificado y sirven las dos apps.
3. Importar usuarios y derechos al HUB; verificar conteos y muestreo de logins.
4. Convertir los derechos de `ACTIVE` a `GRACE` con `graceUntil` = fecha de corte + 5 días para todos los usuarios que no hayan comprado (administradores y excepciones fuera), respetando los ajustes de gracia que Milton haya hecho por usuario.
5. Confirmar que el dominio estable de callbacks/MCP ya funciona y que los callbacks nuevos están registrados en todos los proveedores (9.5).
6. Probar el acceso de emergencia de administradores y "Acceder como".
7. Cambiar el interruptor a `dual`, probar con la cuenta de prueba, luego a `hub`.
8. Mover `seototal.lasolucionweb.com` al proyecto del HUB (TTL de DNS ya bajado días antes) con el reenvío de rutas de máquina activo (9.5, punto 7).
9. Verificar en producción con una cuenta real de cada tipo y en cada servidor de marca, y **reconectar una integración de cada proveedor**.
10. Plan de reversa listo y ensayado en preproducción: volver el interruptor a `legacy` y devolver el dominio al proyecto actual.

### 9.5 Qué se redirige y qué no el día del corte (hallazgo de auditoría)

Un dominio de Vercel solo puede pertenecer a **un** proyecto, y mover `seototal.lasolucionweb.com` al HUB hace que **todo lo que hoy responde ahí deje de responder**. Por eso:

1. **Se redirige al HUB** solo lo que ve una persona: `/`, `/login` y las rutas de interfaz.
2. **No se rompe nada de lo que consumen máquinas.** Antes del corte se inventaría y se migra o se mantiene vivo:
   - Callbacks de Google Search Console, Google Analytics, Google Business Profile y Bing (hoy fijos en el dominio actual) y los de LinkedIn, Instagram, Pinterest, Threads, Tumblr, Blogger y X (dependen del host desde donde se inicia la conexión).
   - Servidor MCP y OAuth2 (`/api/mcp`, `/api/oauth2/*`, `/.well-known/*`) usados por Alexa+, Claude u otros conectores.
   - URLs fijas en la pantalla de login (código QR) y en el asistente de ayuda.
3. **Dominio estable de callbacks:** se propone un host que **sobreviva al corte** y no pase al HUB (por ejemplo uno dedicado a callbacks y MCP). Recibe las devoluciones de los proveedores y devuelve al usuario a la app correcta (el destino va en el parámetro `state`, ya firmado). Así las conexiones compartidas funcionan igual desde Artículos o desde Redes.
4. Los callbacks de Google, Bing y Analytics dejan de estar escritos a mano: salen de una configuración única por entorno.
5. Cada proveedor (Google Cloud, Meta, LinkedIn, Pinterest, Tumblr, X, Bing, Composio) tiene los **dos** callbacks registrados (el actual y el nuevo) **antes** del corte. El actual no se retira hasta confirmar que nadie lo usa.
6. Se baja el TTL del DNS días antes del corte y se ensaya el movimiento del dominio entre proyectos en preproducción.
7. **Puente de transición:** como el dominio viejo pasa al proyecto del HUB, el HUB reenvía las rutas de máquina (`/api/*`, `/.well-known/*`) al dominio estable, con redirección **308** (conserva método y parámetros) o *rewrite*. Se mantiene hasta comprobar con registros de acceso que ningún proveedor ni conector usa ya el host viejo. Solo entonces se retira.

## 10. Modelo de datos conceptual

Nueva tabla de derechos, p. ej. **ProductEntitlement**:

- `userId`, `product` (`ARTICULOS` | `REDES`), `status` (`ACTIVE` | `GRACE` | `INACTIVE`), `graceUntil` (nullable), `source` (`LEGACY` | `ADMIN` | `HUB`), `updatedAt`, `updatedBy`.
- Restricción única `(userId, product)`.

Reglas:

- **Precedencia con lo que ya existe** (a fijar en la Fase 0, propuesta): el acceso efectivo a un módulo exige las **tres** condiciones: derecho de producto vigente, módulo no ocultado globalmente (`global_disabled_modules`) y no ocultado para ese usuario (`disabledModules`, incluido el flag `optIn`). Nada de lo existente se reemplaza; el derecho se añade como una capa más.
- **Quién escribe derechos:** antes del corte, solo Administración (`source = ADMIN`/`LEGACY`). Desde el corte, el único escritor de `ACTIVE`/`INACTIVE` es el HUB (`source = HUB`); Administración conserva únicamente el **ajuste de gracia** por usuario. Toda escritura exige la firma del HUB o un administrador autenticado, y queda auditada.
- **Sincronización con el HUB:** el HUB escribe los derechos en `ProductEntitlement` por un endpoint firmado (o los lee la app por API firmada). Si el HUB no responde, **gana el último valor local conocido**, nunca "sin derechos".
- **Migración de arranque (backfill) en el mismo commit:** Artículos = `ACTIVE` para todos. Redes = `ACTIVE` solo para quien hoy cumple `hasSocialPublishingApproval`.
- Los `allow*Publishing` por red **se conservan intactos**; siguen decidiendo qué redes concretas puede usar el usuario.
- Acceso efectivo a Redes = derecho `REDES` vigente **y** al menos una red permitida (regla actual).
- Acceso efectivo a Artículos = derecho `ARTICULOS` vigente.
- "Vigente" = `ACTIVE`, o `GRACE` con `graceUntil` en el futuro. Los administradores siempre tienen acceso.
- Tipos de usuario visibles para el HUB: administrador, cliente, prueba (`isTrialSignup`/`trialUnlocked`), y servidor de marca (`platformDomain`). La lista final se cierra en la Fase 0.

## 11. Experiencia de usuario

- **Inicio:** dos tarjetas, "SEO Total Artículos" y "SEO Total Redes". La que no tiene derecho se muestra bloqueada con "Activar" (en producción, hacia la tienda del HUB). Decidir en la Fase 0 si se muestra bloqueada o se oculta.
- **Cada app** tiene su propio nombre, su propio menú, sus propios módulos agrupados y su propia pantalla de inicio. En el host `articulos` no hay rastro de Redes y viceversa.
- **Aviso de gracia:** "Tu acceso gratuito termina el [fecha]" con botón de compra.
- **Administración:** en la ficha de usuario, el interruptor por producto, el estado, la fecha de gracia y la acción "quitar gracia".
- **Manual de usuario:** se actualiza en cada lote.
- **Tagcrush:** ningún texto visible puede mencionar "10minutesWebsite". Decidir en la Fase 0 el nombre visible de los productos para esa marca (`platformProductName()`).

## 12. Seguridad y privacidad

- Claves del HUB fuera del repositorio; solo clave pública en las apps. Rotación prevista.
- Token de un solo uso con almacén de `jti` usados y vencimiento corto.
- Nunca poner datos personales en URLs; el token viaja por mecanismo seguro y se consume al instante.
- La separación visual **no es seguridad**: cada API y **también el worker** deben hacer cumplir los derechos. Hoy el worker no revisa los permisos de Redes; en el lote de aplicación de derechos hay que definir su revisión.
- Auditoría: cada cambio de derecho queda registrado (quién, cuándo, antes y después).

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| **Callbacks OAuth** (Google, Meta, Tumblr, Pinterest, etc., y Composio) están registrados contra el dominio actual; los subdominios nuevos pueden romperlos | Inventariar cada callback; registrar los nuevos antes del corte; mantener los antiguos activos durante la transición; ensayar en preproducción. |
| Dejar fuera a usuarios actuales | Interruptor `legacy`/`dual`/`hub`, gracia de 5 días, backfill verificado, ensayo con cuenta de prueba. |
| Migración sin aplicar tumba producción (incidente 2026-09-08) | Schema y migración en el mismo commit; migración antes o junto con el merge. |
| Cambios en middleware/auth/Vercel | Seguir la advertencia crítica de Vercel: revisar Root Directory y logs; build desde el mismo directorio; detenerse ante cualquier contradicción. |
| Subdominios de cuarto nivel (`seototal.articulos.lasolucionweb.com`) no los cubre un certificado comodín `*.lasolucionweb.com` | Verificar emisión de certificado por dominio en Vercel y los registros DNS desde la Fase 0. |
| **Redirigir todo el dominio viejo al HUB rompe callbacks OAuth y el servidor MCP** (hallazgo de auditoría) | Redirección selectiva y dominio estable de callbacks (9.5); inventario previo; doble registro de callbacks. |
| Derechos revocados que siguen vigentes por sesión larga | Derechos leídos de la base local en cada petición, no del token (9.1). |
| Caída del HUB deja a todos fuera | Acceso de emergencia de administradores y último valor local conocido (9.2, 10). |
| Verificar firma en Edge falla o se omite por error | ES256 verificado en route handler Node (9.1); prueba negativa en criterios de aceptación. |
| Conexiones duplicadas o desincronizadas | Una sola fuente por cuenta; ninguna copia por app. |
| Worker sin revisión de derechos | Definir su comprobación en el lote de aplicación de derechos. |
| Pérdida de hashes o sesiones al importar al HUB | Importación ensayada, solo lectura sobre producción, verificación por muestreo. |
| Marca blanca de tagcrush rota | Revisar todos los textos nuevos contra `platformProductName()`. |

## 14. Roadmap por lotes

- **Lote 0 — Fase 0 (este documento aprobado).** Sin código.
- **Lote 1 — Base invisible.** Tabla de derechos con backfill, activador de Artículos (encendido para todos), control de derechos y gracia en Administración, helper único de acceso efectivo. Sin cambio visible.
- **Lote 2 — Separación visual por función (en el host actual).** Antes del corte las dos apps conviven en `seototal.lasolucionweb.com` con un solo login: el inicio muestra las dos tarjetas y cada app tiene su prefijo de rutas y su menú. La forma exacta se diseña en la Fase 0 sin mover ninguna ruta existente de forma que rompa enlaces guardados (se mantienen redirecciones de las rutas actuales). Modo de producto por host, inicio con dos tarjetas, menús y módulos agrupados por app, reparto de Configuración, capa de conexiones compartidas, Historial y Estadísticas por app, "Mi cuenta" común, manual actualizado.
- **Lote 3 — Aplicación de derechos.** Las APIs y el worker hacen cumplir los derechos; avisos de gracia.
- **Lote 4 — Receptor del HUB.** Endpoint del token, claves, interruptor `legacy`/`dual`/`hub` (en `legacy`), pruebas con un HUB simulado.
- **Lote 5 — Subdominios y dominio estable de callbacks, en privado.** DNS, certificados, host `articulos`/`redes`, dominio estable de callbacks/MCP (9.5), configuración única de callbacks, doble registro en proveedores. Los subdominios **se preparan sin enlazarse** y **se abren al público el día del corte**; el dominio actual no se toca.
- **Lote 6 — Ensayo general y guion del corte.** En preproducción: importación de usuarios, `dual`, reversa.
- **Día de corte.** Ejecutar el guion de 9.4 con Milton presente.

## 15. Criterios de aceptación

1. Tras el Lote 1, ningún usuario nota diferencia alguna y las pruebas existentes siguen en verde.
2. Tras el Lote 2, un cliente con solo Artículos no ve rastro de Redes dentro de la app de Redes (y al revés), y ninguna ruta, enlace guardado ni favorito actual deja de funcionar. Cuando existan los subdominios, lo mismo se cumple en su host.
3. Una conexión hecha en una app aparece conectada en la otra sin repetir el proceso.
4. Quitar el derecho de una app la bloquea en menú, ruta, API y worker.
5. Un token vencido, reutilizado, mal firmado o para otra app es rechazado.
6. Con el interruptor en `legacy`, el HUB no puede abrir sesión; con `hub`, el login actual redirige al HUB; el retorno a `legacy` es inmediato.
7. Un usuario existente entra al HUB con sus mismas credenciales y ve su gracia de 5 días.
8. Los callbacks OAuth de todas las redes funcionan en los dominios nuevos.
9. Tagcrush no muestra "10minutesWebsite" en ninguna pantalla nueva.
10. Tras el corte, **todas las conexiones existentes** (Google, Bing, Analytics, redes) se pueden **renovar y reconectar**, y el servidor MCP/Alexa/Claude sigue respondiendo.
11. Un derecho revocado o una gracia vencida bloquea **en la siguiente petición**, aunque la sesión siga vigente.
12. Con el HUB apagado, un administrador entra por el acceso de emergencia y "Acceder como" funciona.
13. Un token con firma de otra clave, algoritmo `none`, `aud` ajeno, vencido o reutilizado es rechazado.
14. Cada lote cumple las tres auditorías y la verificación en producción de acuerdo al Protocolo de No Destrucción.

## 16. Decisiones que deben cerrarse en la Fase 0

1. Clasificación final de `movil`, `mcp`, `composio` y `postpeer`.
2. Tarjeta bloqueada visible u ocultar la app sin derecho.
3. Nombre visible de los productos para la marca blanca `tagcrush`.
4. Mecanismo exacto de transferencia de credenciales al HUB.
5. Si el HUB comparte base de datos o sincroniza por API/webhook firmado.
6. Lista final de tipos de usuario que el HUB debe ver, incluido el tipo "PRUEBAS" de `TO-DO.md`.
7. Qué pasa con el usuario que vence su gracia **a mitad de un lote de publicaciones** en curso.
8. Qué host sirve de **dominio estable de callbacks/MCP** y cómo se migran los conectores externos ya registrados (Alexa+, Claude).
9. Precios y mecánica de compra (fuera de este documento; lo define el HUB).

## 17. Fase 0 obligatoria antes de programar

Antes de escribir una sola línea de código, Claude Code debe entregar para aprobación:

- Arquitectura completa.
- Stack tecnológico.
- Modelo de datos.
- Flujos de usuario.
- Mapa de navegación.
- Estructura de carpetas.
- Roadmap por fases.
- Riesgos técnicos.
- Propuestas de mejora.

Además debe incluir: el inventario de callbacks OAuth y de conexiones por app, el análisis del algoritmo de contraseñas, el plan de DNS y certificados, y el guion de corte con reversa.

**No deberá escribirse una sola línea de código hasta que esta fase haya sido revisada y aprobada por Milton.**

## 18. Instrucciones finales

1. Leer el documento de coordinación y obedecerlo sin omitir nada antes de empezar.
2. Trabajar en un worktree aislado **fuera** de la carpeta del checkout principal.
3. Reclamar la capitanía con `scripts/migration-coordinator.sh` antes de cualquier push.
4. Un lote a la vez, cada uno en su propio PR, con las tres auditorías y verificación en producción.
5. Ante cualquier contradicción o duda sobre autoridad de login, **detenerse y avisar a Milton**.
