# CONTRATO ENTRE EL HUB Y SEO TOTAL (Artículos y Redes)

**Para:** Mario y el programador del HUB · **De:** el proyecto «Separación de SEO Total» (Claude/Codex, por encargo de Milton) · **Versión 2 — 2026-10-02**, ajustada a lo hablado entre Milton y Mario.
**Estado:** lo marcado **[HOY]** está verificado en el código; **[ACORDADO]** lo decidió Milton (con Mario); **[PROPUESTA]** se habla en `BUZON_HUB_SEO_TOTAL.md`; **[NUESTRO LADO]** lo construye SEO Total.

> **En una frase:** el HUB maneja las **personas** y da permiso **sí o no por producto** (Artículos y Redes); SEO Total maneja **todo lo de dentro** (módulos, submódulos, permisos de cada red, datos) y decide cada petición con su tabla local. Esto describe cómo está construido SEO Total para que el HUB se adecue; no es una orden.

---

## 1. Reparto de responsabilidades [ACORDADO]

| Tema | Quién |
|---|---|
| Identidad (correo, nombre, teléfono), login de usuarios normales | **HUB** (código por correo o Google) |
| Facturación, precios, gracia, cancelaciones, reactivaciones | **HUB** (su administrador de facturación). Los plazos de gracia **no** dependen de SEO Total |
| Permiso **sí/no por producto**: Artículos y Redes | **HUB** |
| Módulos y submódulos que ve cada usuario, permisos de cada red, perfil inicial | **SEO Total** |
| Conexiones a redes (cada usuario conecta las suyas) | **SEO Total / Composio** |
| Datos del usuario (artículos, proyectos, historial) | **SEO Total** (el HUB no los ve) |
| Decidir cada petición | **SEO Total**, con su tabla local `ProductEntitlement`; el HUB nunca está en el camino de un clic |
| Acceso de administradores y soporte («puerta trasera») | **SEO Total** (contraseña, sin pasar por el HUB) |

**Principio:** el HUB informa; SEO Total decide y recuerda. Si el HUB cae, SEO Total sigue con lo último que sabía.

## 2. Dos productos, dos subdominios [ACORDADO]

| Producto | Identificador interno | Dirección |
|---|---|---|
| SEO Total Artículos | `ARTICULOS` | `articulos.lasolucionweb.com` |
| SEO Total Redes | `REDES` | `redes.lasolucionweb.com` |

- El dominio principal `seototal.lasolucionweb.com` **no se mueve ni cambia**. Al final, lo que entre por él se lleva al HUB **solo si es una persona** (`/` y `/login`); Alexa, Claude/MCP y los retornos de conexión siguen respondiendo allí.
- **Mario crea en el DNS del `.com` los dos registros** `articulos` y `redes`, apuntando al **mismo proyecto de SEO Total en Vercel** (un dominio solo pertenece a un proyecto; SEO Total es una sola aplicación que responde en los tres nombres).
- El nombre que se muestra en el HUB (catálogo, factura) es **cosa del HUB**. A SEO Total solo le llega «permiso sí/no por producto» con un identificador técnico.
- Callbacks de entrada: `https://articulos.lasolucionweb.com/auth/hub` y `https://redes.lasolucionweb.com/auth/hub`.

## 3. Lo que existe hoy [HOY] (leído de `codex/hub-seo-total-migration` y del documento de Mario)

Variables: `HUB_BASE_URL`, `AUTO_ARTICULOS_HUB_CLIENT_ID`, `AUTO_ARTICULOS_HUB_CLIENT_SECRET`. Llamadas servidor-a-servidor con `x-platform-client-id` y `Authorization: Bearer <secreto>`.

| # | Dirección | Endpoint | Qué hace |
|---|---|---|---|
| H1 | HUB → SEO Total | `GET /auth/hub?code=<código>` | Código opaco de un solo uso (5 min); SEO Total lo canjea, busca/crea al usuario (por `hubUserId` o correo) y abre **su propia cookie de sesión** |
| H2 | SEO Total → HUB | `POST {HUB}/api/product-launch` `{app, code}` | Devuelve `platform_user_id`, `auth0_sub`, `email`, `platform_role`, `entitlement_status`, `expires_at` |
| H3 | SEO Total → HUB | `POST {HUB}/api/integrations/auto-articulos/access` `{hub_user_id}` | Devuelve `{allowed, status}`; SEO Total lo guarda 60 s |
| H4 | SEO Total → HUB | `POST {HUB}/api/integrations/auto-articulos/user-sync` | Altas y cambios de perfil durante la coexistencia |

## 4. Cómo se traduce el permiso del HUB a SEO Total [PROPUESTA]

El HUB ya describe **un** producto (`seo-total`). Como los productos son **dos**, SEO Total necesita saber **de cuál** habla cada mensaje:

1. **H2:** que `app` identifique el producto (un identificador por producto, a vuestra elección) y que SEO Total lo traduzca a `ARTICULOS` o `REDES`. El usuario aterriza en el subdominio de ese producto.
2. **H3:** aceptar el producto como dato (`{hub_user_id, product}`) o devolver ambos permisos: `{products: {ARTICULOS: true|false, REDES: true|false}}`. Compatible hacia atrás con `allowed`.
3. **Regla en SEO Total:** permiso «sí» → el derecho local del producto queda `ACTIVE` (con `source = HUB` y sube la versión, con evento de historial); permiso «no» → `INACTIVE`. Si el HUB envía una fecha de gracia, se guarda; **SEO Total no inventa gracias**.
4. **Nunca revocar por omisión:** un producto que no aparece en un mensaje significa «sin cambios».
5. **Si el HUB cae** durante la coexistencia: se conserva el último estado (fail-open); al cerrarse el acceso legado, las operaciones nuevas fallan cerradas (como Mario describió).

## 5. Usuario nuevo creado desde el HUB [NUESTRO LADO]

Hoy `/auth/hub` crea la cuenta local **vacía** (sin permisos de redes ni módulos). Para Redes eso la haría inútil. **SEO Total aplicará un perfil inicial** al crearla:
- **Redes:** módulo de Oportunidades de Redes y el permiso de **todas** las redes de publicación activos. **Cada usuario conecta sus propias redes.**
- **Artículos:** lo que reciben hoy los usuarios nuevos.
- Después un administrador puede restringir a cualquiera, como hoy.

## 6. Entrada y sesiones

- **Usuarios normales:** entran **solo por el HUB**. Mario confirma: sin migrar contraseñas; código por correo o Google. (No hay «mismas credenciales».)
- **Administradores y soporte [ACORDADO]:** conservan una **puerta directa con contraseña** (ruta no enlazada, solo cuentas de administración, con límite de intentos), **sin pasar por el HUB**, en `articulos` y en `redes`. Desde Administración pueden hacer **«Acceder como»** a cualquier usuario, como hoy, en las dos plataformas. No hay un tipo nuevo de administrador por producto.
- **Riesgo conocido:** si el HUB cae, los usuarios normales no entran; los administradores sí.
- **[NUESTRO LADO]** Para que una sesión valga en todos los subdominios del `.com`, la cookie de sesión se marcará para `.lasolucionweb.com`. No se comparten cookies con el HUB.

## 7. Conexiones OAuth: «callback único» [APROBADO EN PRINCIPIO, NO CONSTRUIDO]

Para que **ninguna consola de proveedor cambie**, todas conservarán **un solo callback** en `seototal.lasolucionweb.com`. La conexión empieza en `articulos` o `redes`, el origen viaja dentro del `state` firmado y el callback devuelve al usuario a su pantalla. Google y Meta van por Composio (no dependen de nuestros callbacks). Alexa, Claude/MCP no cambian. **El protocolo de paso a Composio es intocable.**

## 8. Seguridad

Secretos solo como variables protegidas, rotados al terminar. Código de lanzamiento de un solo uso. SEO Total no confía en el «allowed» como única barrera: la barrera real es su tabla local en APIs y worker. Cifrado en tránsito siempre. Auditoría en ambos lados. Nunca secretos ni contraseñas en el buzón.

## 9. Encabezado global del HUB

Mario pide el encabezado global del HUB en cada aplicación. **[NUESTRO LADO]** Lo añadiremos. **Decisión temporal de Milton:** por ahora lo ven todos, incluidos los usuarios de Tagcrush (marca blanca); se depura más adelante.

## 10. Si algo falla

| Situación | Comportamiento esperado |
|---|---|
| HUB caído | SEO Total conserva el último permiso; administradores entran por la puerta directa; altas pendientes se reintentan |
| Código reutilizado o vencido | `401`; sin cambios |
| Mismo correo, dos cuentas locales | Conflicto para revisión; no se fusiona a ciegas |
| Producto desconocido | Se ignora y se registra |
| Revocación | Efecto inmediato en APIs y worker; el usuario ve el aviso; **los datos no se borran** |

## 11. Qué se hace el día del cambio (resumen; el detalle está en `MANUAL_DIA_CERO.md`)

1. Mario crea los dos registros DNS y comprueba que cargan.
2. Los usuarios del HUB entran con acceso gratuito (lo mantiene el HUB; la facturación y la gracia las gestiona el HUB después).
3. Lo que entre por `seototal.lasolucionweb.com` pasa al HUB (solo personas).
4. SEO Total aplica el perfil inicial a cuentas nuevas y recibe los permisos por producto.

## 12. Preguntas abiertas para Mario

**Dónde responderlas:** en `BUZON_HUB_SEO_TOTAL.md` (repositorio `10minuteswebsite/auto-articulos`), entrada nueva `H-004` numerando las respuestas, como Pull Request que modifique solo ese archivo. SEO Total lo lee cada 10 minutos. **No se responden a Milton.**

1. ¿Qué identificadores usará el HUB para cada producto (`app` en H2, y producto en H3)? ¿H3 recibirá el producto o devolverá los dos permisos?
2. Tu documento dice «un producto hasta la separación»: ¿confirmas que desde el principio son dos productos, como acordó Milton?
3. ¿Preferís **empujar** cambios a SEO Total (mensaje firmado) o que SEO Total **consulte** con caché de 60 s?
4. ¿Cuándo quedan creados los dos registros DNS y cuándo se pueden probar?
5. Las 104 cuentas (85 con acceso, 19 sin él): ¿cómo se traducen a los dos productos? ¿Todas acceden a Artículos y a Redes, o solo a Artículos y Redes queda para quien la tenía?
6. ¿Existe ya en vuestra rama el interruptor de login `legacy/dual/hub` o lo construimos nosotros?
7. Cuentas de prueba y tipos de usuario: ¿qué hace el HUB con ellas?
8. **[ACORDADO por Milton] Los 7 días de prueba de SEO Total se eliminan** cuando el HUB toma el control: desde el Día Cero el permiso del HUB es la **única fuente de acceso**. SEO Total desactivará su regla antigua (`trialUnlocked`, `isTrialSignup`, prueba de 7 días y el formulario «Solicitar prueba») con un interruptor, **sin borrar código**. Pregunta para vosotros: vuestra revalidación hoy escribe `trialUnlocked`; desde el Día Cero conviene que escriba solo la tabla de derechos por producto. ¿Os parece bien?
9. **Vuestra rama (`codex/hub-seo-total-migration`):** ¿cuándo y cómo llegará a `main` de SEO Total? Producción ya tiene vuestras 5 columnas en `User`, que `main` aún no declara (hay un PR preparado, #368, sin fusionar).

*Documentos relacionados:* `MANUAL_DIA_CERO.md`, `ARQUITECTURA_FINAL_DERECHOS_POR_PRODUCTO.md`.
