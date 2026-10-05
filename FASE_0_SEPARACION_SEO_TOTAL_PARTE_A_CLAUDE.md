# FASE 0 — PARTE A (Claude): producto, datos, interfaz

Proyecto: SEPARACION DE SEO TOTAL DE REDES TOTALES · Autor: Claude (control de proyecto) · Fecha: 2026-10-01
Estado: **v0.3 — REVISIÓN CRUZADA DE CODEX RECIBIDA (X-005, sin contradicciones materiales); LISTA PARA APROBACIÓN DE MILTON. No hay código.**
Documentos hermanos: `MASTER_BLUEPRINT_SEPARACION_SEO_TOTAL_ARTICULOS_Y_REDES.md`, `CONTROL_SEPARACION_SEO_TOTAL.md`, `TRASPASO_SEPARACION_SEO_TOTAL.md`.

> Convención: **[VERIFICADO]** = lo comprobé yo en el código el 2026-10-01 (archivo citado). **[POR CONFIRMAR]** = hipótesis a verificar antes del Lote correspondiente.

---

## 0. Resumen en diez líneas

1. Se añade **una sola tabla de derechos** (`ProductEntitlement`) y **una sola función de acceso** (`hasProductAccess`). Todo lo demás la consume.
2. Regla de oro de seguridad: **la ausencia de fila = comportamiento actual** (nadie queda bloqueado por no tener fila) y los administradores siempre pasan.
3. El bloqueo real nace en modo **sombra** (solo registra lo que bloquearía) y solo se enciende con un interruptor (`off` / `shadow` / `enforce`), por defecto `off`.
4. La separación visual **no cambia ninguna URL existente**: el producto de una pantalla se deduce de su ruta. Se añaden `/dashboard/articulos` y `/dashboard/redes` como inicios de cada producto.
5. El menú pasa a tener un **selector de producto** y muestra solo los módulos del producto activo.
6. Configuración se reparte por función; **Conexiones es una sola capa por cuenta** con un mapa «qué producto usa cada conexión».
7. Hay tres puntos de aplicación: **layout del servidor**, **cada API** y **el worker**. El middleware (Edge) no se toca para esto.
8. Lote 1 = base invisible. Lote 2 = separación visual. Ambos sin cambiar nada para el usuario hasta que se encienda.
9. Hay 8 decisiones abiertas (sección 11), con recomendación en cada una.
10. Pido a Codex revisión cruzada de 9 puntos (sección 12) antes de dar la parte A por terminada.

---

## 1. Estado actual relevante (hechos verificados)

| Hecho | Evidencia |
|---|---|
| El menú es un componente cliente con `BASE_ENTRIES` (Inicio · Publicaciones · Configuración) y `ADMIN_GROUP`; solo «Oportunidades Redes» se oculta por permiso propio (`socialPublishingApproved`) | `components/DashboardNav.tsx` líneas 32–75, 186–190 **[VERIFICADO]** |
| El guard de ruta es **solo de cliente** (`ModuleGuard`), con coincidencia por segmento y módulo más específico | `components/ModuleGuard.tsx` 48–50 **[VERIFICADO]** |
| `SYSTEM_MODULES` tiene 9 módulos; `optIn`, ocultación global (`SystemSetting.global_disabled_modules`) y por usuario (`disabledModules`: `inherit`/`enabled`/`disabled`) | `lib/modules.ts` **[VERIFICADO]** |
| Admin siempre ve todo: `getEffectiveDisabledModules` devuelve `[]` si `role==='admin'` | `lib/modules.ts` 154–159 **[VERIFICADO]** |
| El inicio `/dashboard` muestra 3 tarjetas (`QUICK_LINKS`) y aloja el **asistente de configuración inicial** de 4 pasos (credenciales, categorías, idioma, Search Console) | `app/dashboard/page.tsx` 8–23, 77–120 **[VERIFICADO]** |
| `GET /api/me` ya entrega `socialPublishingApproved`, `disabledModules`, `platformDomain`, `isActingAdmin` | `app/api/me/route.ts` 29–92 **[VERIFICADO]** |
| El layout del dashboard es de servidor y ya llama a `getSessionContext()` | `app/dashboard/layout.tsx` 9, 21 **[VERIFICADO]** |
| El middleware solo valida sesión e inyecta `x-user-id` (y suplantación); **no tiene lógica de módulos ni de producto** | `middleware.ts` **[VERIFICADO]** |
| Redes se protege en servidor con `canUseSocialModule` en `social-opportunities/*` y en integraciones de red (≈25 rutas) | `grep` sobre `app/api` **[VERIFICADO]** |
| Las **APIs de Artículos no tienen ninguna comprobación de módulo ni de permiso** más allá de la sesión (`opportunities*`, `runs*`, `titles*`, `title-generation`, etc.) | listado de rutas y `grep` **[VERIFICADO]** |
| El worker no revisa permisos de Redes | `grep` en `apps/worker/src` **[VERIFICADO]** |
| Las conexiones están atadas a `userId` (`SearchIntegration`, `InstagramIntegration`, `TumblrIntegration`…) | `schema.prisma` ~286–486 **[VERIFICADO]** |
| `configuracion/page.tsx` es un índice de 6 tarjetas: Inicial, Cuenta, Contenido, Conexiones, App Móvil, Asistentes IA | `configuracion/page.tsx` 14–51 **[VERIFICADO]** |
| Los nombres de menú viven en un único archivo `menu-names.ts`; **regla del archivo: no escribir nombres a mano en textos nuevos** | `lib/menu-names.ts` **[VERIFICADO]** |
| **Historial** y **Progreso (publicaciones-en-curso)** son pantallas que **mezclan los dos productos**: consultan `/api/runs` (artículos) y `/api/social-opportunities` (redes) en la misma página | `historial/page.tsx` líneas 143, 660, 745; `publicaciones-en-curso/page.tsx` 77–78 **[VERIFICADO v0.2]** |
| **Estadísticas** (`PerformanceDashboard`) se alimenta de `/api/dashboard-stats`, que cuenta solo `Title` y `OpportunityGroup` (artículos): **no incluye redes** | `dashboard-stats/route.ts` 38–78 **[VERIFICADO v0.2]** |
| `ConexionesView` **ya está dividida en dos vistas**: `analiticas` (Google Search Console, Google Analytics, Bing) y `difusion` (Instagram, Facebook, Threads, LinkedIn, Pinterest, Tumblr, Bluesky, DEV.to, Blogger, Google Business Profile): 13 integraciones | `ConexionesView.tsx` 26–27, 151–163 **[VERIFICADO v0.2]** |
| El servidor MCP expone 12 herramientas: de **cuenta común** (`ver_resumen_cuenta`, `ver_estado_configuracion`, `ver_integraciones`, `listar_categorias`, `listar_idiomas`, `ver_limites_y_creditos`) y de **Artículos** (`listar_oportunidades`, `crear_oportunidades`, `publicar_oportunidades_seleccionadas`, `publicar_titulos_en_categoria`, `publicar_categoria`, `estado_de_publicaciones`); **ninguna es de Redes** | `lib/mcp/tools/*.ts` **[VERIFICADO v0.2]** |
| Contenido interno de `cuenta`, `contenido`, `redes-sociales`, `indexacion` y `composio` | **[POR CONFIRMAR]** (se verifica al abrir cada pantalla en el Lote 2) |

---

## 2. A1 — Contrato de datos (lo que Codex consume y no redefine)

### 2.1 Tablas nuevas (Prisma, definición conceptual)

```
enum Product            { ARTICULOS REDES }
enum EntitlementStatus  { ACTIVE GRACE INACTIVE }
enum EntitlementSource  { LEGACY ADMIN HUB }

model ProductEntitlement {
  id          String            @id @default(cuid())
  userId      String
  product     Product
  status      EntitlementStatus
  graceUntil  DateTime?          // solo se usa con status = GRACE
  source      EntitlementSource  // quién fijó el estado actual
  version     Int               @default(1)  // sube en cada cambio: el HUB reenvía eventos fuera de orden
  externalRef String?            // id del cliente/suscripción en el HUB (futuro)
  note        String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  updatedBy   String?            // userId del admin, o "hub"
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, product])
  @@index([product, status])
  @@index([graceUntil])
}

model ProductEntitlementEvent {   // bitácora de solo añadir, nunca se edita ni se borra
  id            String   @id @default(cuid())
  userId        String
  product       Product
  fromStatus    EntitlementStatus?
  toStatus      EntitlementStatus
  fromGraceUntil DateTime?
  toGraceUntil   DateTime?
  source        EntitlementSource
  actorUserId   String?
  reason        String?
  createdAt     DateTime @default(now())
  @@index([userId, createdAt])
}
```

Notas de diseño:
- `version` resuelve el caso de que el HUB reenvíe un evento viejo: se ignora todo evento con `version` menor o igual al guardado (idempotencia).
- La **gracia caducada se evalúa al leer** (sin tarea programada): `GRACE` con `graceUntil <= ahora` equivale a `EXPIRED` en la lectura. Una tarea nocturna opcional puede normalizar el campo, pero la seguridad no depende de ella.
- Se mantienen **intactos** los 10 `allow*Publishing` por red y `User.disabledModules`.

### 2.2 Función única de acceso

```ts
type ProductKey = "ARTICULOS" | "REDES";
type AccessReason =
  | "ADMIN" | "ACTIVE" | "GRACE" | "NO_RECORD_LEGACY"
  | "GRACE_EXPIRED" | "INACTIVE"
  | "MODULE_DISABLED" | "NO_NETWORK_APPROVED";

interface ProductAccess {
  allowed: boolean;
  reason: AccessReason;
  status: "ACTIVE" | "GRACE" | "INACTIVE" | null;
  graceUntil: Date | null;
  graceDaysLeft: number | null;      // para el aviso de gracia
}

// Pura, sin base de datos: la que se prueba con la matriz de casos.
evaluateProductAccess(input: {
  role: string; product: ProductKey; entitlement: Entitlement | null;
  legacyAllowsRedes: boolean;        // hasSocialPublishingApproval(...)
  now: Date;
}): ProductAccess;

// Con base de datos (memoizada por petición): la que usan layout, APIs y worker.
hasProductAccess(userId: string, product: ProductKey, now?: Date): Promise<ProductAccess>;
```

Reglas de evaluación, en este orden (la primera que aplica gana):
1. `role === "admin"` → permitido (`ADMIN`).
2. **Sin fila** → comportamiento actual: `ARTICULOS` permitido (`NO_RECORD_LEGACY`); `REDES` permitido solo si `legacyAllowsRedes` (`NO_RECORD_LEGACY`) y si no, `NO_NETWORK_APPROVED`.
3. `ACTIVE` → permitido.
4. `GRACE` con `graceUntil` futuro → permitido (`GRACE`); vencida → denegado (`GRACE_EXPIRED`).
5. `INACTIVE` → denegado.
6. **Solo `REDES`:** además de lo anterior, debe cumplirse `legacyAllowsRedes` (al menos una red aprobada por Administración); si no, `NO_NETWORK_APPROVED`.
7. Módulos: el acceso a un módulo concreto exige **también** que no esté oculto (`getEffectiveDisabledModules`). Es una capa más; no se reemplaza.

Propiedades que deben cumplirse (van como pruebas unitarias):
- Un usuario **nuevo** creado después de la migración nunca queda bloqueado por no tener fila.
- Un error al leer la base **no** produce «sin derechos»: la capa que llama decide (la web muestra error; el worker reintenta), nunca deniega por fallo técnico.
- Admin real y admin «Acceder como» (suplantación) se evalúan sobre el usuario efectivo, sin saltarse el rol de administrador de verdad.

### 2.3 Interruptor de aplicación (red de seguridad)

`SystemSetting` clave `product_enforcement` con tres valores:
- `off` (**por defecto**): ninguna comprobación bloquea; el comportamiento es el de hoy.
- `shadow`: se evalúa todo y se **registra** cada denegación que *habría* ocurrido (usuario, producto, motivo, ruta), sin bloquear.
- `enforce`: bloquea de verdad.

**Auditoría previa a `enforce` (propuesta de Codex, aceptada):** antes de encender `enforce` se revisa explícitamente la excepción «ausencia de fila = comportamiento actual»: tras el backfill se cuentan los usuarios sin fila, se explica cada uno y se decide si la excepción se mantiene o se retira. No se ocultan errores de migración.

Así el Lote 3 puede subir a producción «apagado», revisar los registros de `shadow` contra la lista real de usuarios y solo entonces encenderse. El retorno es inmediato (cambiar el valor).

### 2.4 Arranque de datos (backfill) — en la misma migración que crea las tablas

- `ARTICULOS`: una fila `ACTIVE`, `source = LEGACY`, para **cada** usuario existente.
- `REDES`: una fila `ACTIVE`, `source = LEGACY` solo para quien hoy cumple `hasSocialPublishingApproval` (al menos un `allow*Publishing` en true) y para los administradores; el resto no recibe fila.
- Creación de usuarios nuevos (admin y `trial-signup`): se crea la fila `ARTICULOS` `ACTIVE`; `REDES` solo si se aprueba una red.
- Consultas de verificación post-migración (conteos): total de usuarios = filas `ARTICULOS`; filas `REDES` = usuarios con alguna red aprobada + admins.

### 2.5 Administración

- En la ficha de usuario (`usuarios/page.tsx`), nueva sección «Productos»: interruptor por producto, estado, fecha de gracia, botones «Dar N días de gracia» y «Quitar gracia».
- Todo cambio escribe una fila en `ProductEntitlementEvent` y actualiza `version`.
- Endpoint de escritura (admin): ampliar `api/admin/users` o añadir `api/admin/users/[id]/entitlements`; mismas comprobaciones de rol que el resto del archivo **[POR CONFIRMAR: estilo exacto del archivo, 746 líneas]**.
- Endpoint de entrada del HUB (firmado, idempotente por `version`): su diseño detallado es de la **Parte B**; este contrato solo fija los campos y la regla de `version`.

### 2.6 `GET /api/me`

Se **añade** (sin quitar nada) un bloque `products`:
```
products: {
  articulos: { allowed, reason, status, graceUntil, graceDaysLeft },
  redes:     { allowed, reason, status, graceUntil, graceDaysLeft }
}
```
Los campos actuales (`socialPublishingApproved`, `disabledModules`…) siguen idénticos para no romper nada.

---

## 3. A2 — Arquitectura de producto

### 3.1 El producto se deduce de la ruta (no se cambian URLs)

Cada módulo recibe un campo `product` en `SYSTEM_MODULES`:

| Módulo (`id`) | Producto |
|---|---|
| `publicar`, `oportunidades` | ARTICULOS |
| `oportunidades-redes` | REDES |
| `estadisticas` | ARTICULOS (hoy solo cuenta artículos; Redes necesitará sus propias estadísticas, fuera de este proyecto) |
| `historial`, `publicaciones-en-curso` | **MIXTOS hoy**: se muestran por producto con un **filtro/vista por producto sobre la misma página** (cada producto ve solo su mitad); no se parten en páginas nuevas en el Lote 2 |
| `configuracion` (y subpáginas) | ver sección 6 |
| `conexion-composio` | COMPARTIDO (capa de conexiones) |
| `como-funciona`, `actualizaciones` | COMPARTIDO (después, guías por producto) |
| Administración (`usuarios`, `composio`, `postpeer`) | ADMIN (fuera de ambos productos) |

Función `productOfPath(pathname)` (en `lib/modules.ts`): devuelve `ARTICULOS | REDES | COMPARTIDO | ADMIN` por coincidencia de segmento más específica, igual que `ModuleGuard`. **Ninguna ruta existente se mueve ni se renombra**, así que los enlaces guardados, correos y favoritos siguen funcionando.

### 3.2 Rutas nuevas (solo añadir)

- `/dashboard/articulos`: inicio de SEO Total Artículos.
- `/dashboard/redes`: inicio de SEO Total Redes.
- `/dashboard` (inicio actual): pasa a ser el **selector de producto** (las dos tarjetas) y **conserva el asistente de configuración inicial** mientras no esté completo. Mientras `product_enforcement` esté en `off`, el inicio sigue mostrando lo de hoy más las tarjetas.

### 3.3 Modo de producto por host (para el día del corte)

`getProductMode(host)` devuelve `legacy` (host actual: ambos productos, un solo login), `articulos` o `redes` (subdominios nuevos). En `articulos`/`redes` el menú y los inicios solo muestran ese producto. **Hasta el Lote 5 solo existe `legacy`**; el resolver nace con el valor `legacy` fijo y una lista de hosts configurable por variable de entorno, sin tocar el middleware.

### 3.4 Tres puntos de aplicación (qué se toca en cada uno)

| Punto | Dónde | Qué hace |
|---|---|---|
| **Servidor de página** | `app/dashboard/layout.tsx` (ya es de servidor y ya llama a `getSessionContext`) | Calcula el producto de la ruta, llama a `hasProductAccess` y, si no hay acceso, pinta la pantalla de «acceso no disponible». |
| **API** | helper `requireProductAccess(product)` para cada ruta de `opportunities*`, `runs*`, `titles*`, `title-generation`, `categories*`, `sitemap/*`, `bing/master-index`, `pre-validation` (ARTICULOS) y para `social-opportunities*` e integraciones de red (REDES, sustituyendo el interior de `canUseSocialModule`) | Responde 403 con el motivo. En `shadow` solo registra. |
| **Worker** | cada trabajo de publicación de artículos y de redes | Comprueba el derecho **justo antes de ejecutar cada publicación/destino** (no solo al encolar). Si se revoca a mitad de un lote: **no inicia nuevos destinos**, registra el motivo y deja el estado visible y reintentable; **no borra** lo ya creado (propuesta de Codex, X-002; compatible con D6). Detalle: Parte B / Lote 3. |
| **MCP** | `api/mcp` (Alexa, Claude) | Las 6 herramientas de oportunidades/publicación declaran `ARTICULOS` y pasan por el mismo helper; las 6 de cuenta quedan comunes. Hoy el MCP no tiene herramientas de Redes. |

**Rutas que quedan fuera de `requireProductAccess` (acordado con Codex, X-005):** callbacks OAuth (`/api/*/callback`), `/api/mcp`, `/api/oauth2/*`, `/.well-known/*`, `/api/mcp/token-lookup`, el receptor de handoff (`/api/auth/hub-handoff`, Lote 4), `/api/auth/*` y los endpoints de salud o webhooks. La lista definitiva sale del inventario del Lote 3. **Pendiente confirmar:** llamadas internas worker→web (Codex no encontró ninguna en `apps/worker/src`; falta revisar colas/HTTP fuera de `src`).

`ModuleGuard` (cliente) y el menú siguen existiendo, solo como **experiencia de usuario**; la barrera de verdad es el servidor.

**Memoización:** solo dentro de una petición (y dentro de una ejecución del worker); **nunca caché entre peticiones**, porque una revocación debe verse en la siguiente petición (acordado con Codex).

**Restricción técnica:** `hasProductAccess` usa Prisma, por tanto **no puede ejecutarse en el middleware (Edge)**. Es intencional: el middleware queda sin cambios en este proyecto (salvo la ruta pública del receptor del HUB, que es del Lote 4 y de Codex).

---

## 4. A3 — Flujos de usuario

**F1. Cliente actual entra (antes del corte, `off`).** Ve el inicio con dos tarjetas: «SEO Total Artículos» (abre `/dashboard/articulos`) y «SEO Total Redes» (abre `/dashboard/redes` si tiene redes aprobadas; si no, la tarjeta aparece con «Activar», que por ahora lleva a «Contacta al administrador»). Nada que antes funcionaba deja de funcionar.

**F2. Cliente con un solo producto.** En el selector solo el suyo está activo; el otro muestra «Activar». Dentro de su producto no hay rastro del otro (menú, textos, historial).

**F3. Administrador gestiona derechos.** Abre la ficha del usuario → «Productos» → enciende/apaga, da o quita gracia → se registra el evento → el usuario ve el cambio en su siguiente petición (derechos leídos de la base en cada petición).

**F4. Conexión compartida.** El usuario conecta Search Console desde Artículos. Al entrar a Redes, esa conexión aparece «Conectada» y no se le pide de nuevo; vale igual en sentido inverso. Una sola fila por proveedor y usuario.

**F5. Gracia por vencer.** En `shadow`/`enforce`, con `graceDaysLeft` ≤ 5 se muestra un aviso «Tu acceso gratuito termina el [fecha]» con botón de compra (en producción, enlace al HUB; antes del corte, contacto).

**F6. Gracia vencida a mitad de sesión.** En la siguiente petición protegida el layout/API detecta `GRACE_EXPIRED` y muestra «Tu acceso a SEO Total [producto] terminó» con el botón de compra; no se pierde ningún dato.

**F7. Cuenta de prueba / suplantación.** «Acceder como» evalúa sobre el usuario suplantado, pero el administrador real conserva sus herramientas de soporte. Los usuarios de prueba (`isTrialSignup`/`trialUnlocked`) se gestionan con la misma tabla (decisión D5).

**F8. Corte (resumen; el detalle es de la Parte B).** Entrada por HUB con token; la app lee derechos de su tabla local; el modo de login cambia por interruptor; ver blueprint 9.

---

## 5. Mapa de navegación

### 5.1 Hoy

`Inicio` · `Publicaciones` (1 Contenido propio, 2 Generado por IA, 3 Publica en redes y blogs, Progreso, Historial, Estadísticas) · `Configuración` (general, Cómo funciona, Actualizaciones) · `Administración` (solo admin: Usuarios, Composio, PostPeer).

### 5.2 Objetivo (dentro del host actual, Lote 2)

Barra superior: **[SEO Total Artículos] [SEO Total Redes] · Mi cuenta · Salir** (el selector resalta el producto activo; el que no tiene derecho aparece atenuado con «Activar»).

**Dentro de SEO Total Artículos:**
`Inicio` · `Crear` (Contenido propio, Contenido generado por IA) · `Seguimiento` (Progreso, Historial, Estadísticas) · `Configuración` (Inicial, Contenido, Indexación, Conexiones de analítica) · `Ayuda`

**Dentro de SEO Total Redes:**
`Inicio` · `Publicar` (Publica en redes y blogs) · `Seguimiento` (Progreso, Historial, Estadísticas) · `Configuración` (Redes sociales, Conexiones de redes) · `Ayuda`

**Común:** `Mi cuenta` (perfil, contraseña, App Móvil, Asistentes IA); `Administración` (admin) aparte de ambos productos.

Reglas de nombre: se añade `PRODUCT_NAMES` a `lib/menu-names.ts` (fuente única, sin imports de servidor). Los números «1) 2) 3)» del grupo actual se retiran cuando Redes pasa a ser producto propio. Para `tagcrush`, el nombre visible pasa por `platformProductName()` (decisión D4).

---

## 6. Reparto de Configuración y capa de conexiones

### 6.1 Páginas de Configuración

| Pantalla actual | Producto | Acción en Lote 2 | Estado de verificación |
|---|---|---|---|
| `inicial` (asistente de 4 pasos) | ARTICULOS | Se queda en Artículos. **Ver D1 (usuario solo-Redes).** | pasos verificados en `dashboard/page.tsx` |
| `cuenta` (credenciales de publicación, categorías, idioma) | Mixta | Credenciales y categorías → ARTICULOS; idioma → compartido; contraseña/perfil → «Mi cuenta» | **[POR CONFIRMAR]** el contenido interno |
| `contenido` (firma, estilo, teléfono, fotos para redes) | Mixta | Firma, estilo, teléfono → ARTICULOS; fotos para redes → REDES | **[POR CONFIRMAR]** |
| `conexiones` | COMPARTIDA | Una sola capa; **Artículos muestra la vista `analiticas`, Redes la vista `difusion`**, y Search Console aparece conectada en ambas (6.2) | `ConexionesView.tsx` **[VERIFICADO v0.2]**: ya viene dividida |
| `redes-sociales` | REDES | Sin cambios de contenido | **[POR CONFIRMAR]** |
| `indexacion` | ARTICULOS | Sin cambios de contenido | **[POR CONFIRMAR]** |
| `movil` | Común | Pasa a «Mi cuenta» | índice verificado |
| `mcp` (Asistentes IA) | Común | «Mi cuenta»; el servidor MCP respeta derechos (3.4) | índice verificado |
| `composio` | Admin/Compartida | Decidir (D7) | **[POR CONFIRMAR]** |

### 6.2 Mapa «qué producto usa cada conexión» (propuesta inicial)

| Conexión | Usada por | Nota |
|---|---|---|
| Google Search Console | ARTICULOS y REDES | Milton: compartida; se muestra conectada en ambos |
| Google Analytics | ARTICULOS | confirmar uso en Redes |
| Bing Webmaster | ARTICULOS | |
| Google Business Profile | REDES | es una red (`allowGoogleBusinessPublishing`) |
| Instagram, Facebook, Threads, LinkedIn, X, Pinterest, Tumblr, Bluesky, Mastodon, DEV.to, Blogger | REDES | |
| Composio (conexión) | COMPARTIDA | su estado ya se lee de `/api/composio/status` |

Los callbacks de conexión seguirán **por host de origen** (revisión cruzada de la Parte B, C-008): la cookie de `state` y la sesión son por host, así que conectar y volver ocurre en el mismo host. Esto no cambia el modelo de datos de conexiones.

Regla: **se muestra el estado real de la cuenta**, nunca una copia por producto. Conectar desde cualquier producto escribe en la misma fila (`SearchIntegration` y equivalentes por `userId`).

---

## 7. Cómo se reparte el trabajo de los Lotes 1 y 2 (para quien lo tome)

**Lote 1 — Base invisible** (migración incluida; requiere resolver la capitanía, M3)
1. `schema.prisma` + migración (tablas, enums, backfill, índices) en el **mismo commit**; probar en worktree aislado antes de `main`.
2. `lib/product-access.ts`: `evaluateProductAccess`, `hasProductAccess` (memoizada por petición), tipos y motivos.
3. Pruebas unitarias: matriz completa de `evaluateProductAccess` (admin, sin fila, ACTIVE, GRACE vigente/vencida, INACTIVE, REDES con/sin red aprobada, suplantación).
4. `SystemSetting` `product_enforcement` (`off` por defecto) y registro de `shadow`.
5. Administración: sección «Productos» y escritura con bitácora de eventos.
6. `GET /api/me`: bloque `products` añadido.
7. Creación de usuarios (admin y `trial-signup`): filas por defecto.
8. Manual de usuario actualizado.
Criterio: **ningún usuario nota diferencia**; las 47 pruebas web existentes siguen en verde; conteos del backfill coinciden.

**Lote 2 — Separación visual** (sin migración)
1. Campo `product` en `SYSTEM_MODULES` y `productOfPath`.
2. `PRODUCT_NAMES` en `menu-names.ts`.
3. `DashboardNav`: selector de producto y menús por producto (el menú sigue siendo experiencia de usuario).
4. Inicio selector + `/dashboard/articulos` y `/dashboard/redes`.
5. Reparto de Configuración (tabla 6.1) y capa de conexiones (6.2) en `ConexionesView`.
6. Historial y Progreso: vista filtrada por producto sobre la misma página (hoy mezclan `/api/runs` y `/api/social-opportunities`); Estadísticas: solo Artículos.
7. «Mi cuenta» como entrada común.
8. Redirecciones o alias para que **ninguna ruta actual** deje de funcionar; manual actualizado.
Criterio: un cliente con un solo producto no ve rastro del otro dentro de su producto; los enlaces guardados siguen funcionando.

---

## 8. Riesgos propios de la Parte A

| Riesgo | Mitigación |
|---|---|
| Bloquear a alguien por error al encender `enforce` | Ausencia de fila = comportamiento actual; `shadow` antes de `enforce`; interruptor de retorno inmediato |
| Las APIs de Artículos hoy no tienen ninguna barrera: añadirla puede romper integraciones internas (worker→web) | Inventario de llamadas internas en el Lote 3; el helper acepta contextos de servicio explícitos |
| Pantallas «mixtas» (Cuenta, Contenido) difíciles de partir sin regresiones | Partir por **secciones dentro de la misma página** primero; mover a páginas nuevas solo si hace falta |
| Un estado incoherente entre `allow*Publishing` y `ProductEntitlement(REDES)` | Una sola función de evaluación; la bitácora de eventos; verificación por conteos |
| Memoización por petición mal hecha produce lecturas obsoletas | Memoizar solo dentro de una petición; nada de caché entre peticiones |
| El inicio mezcla selector y asistente de configuración inicial | El asistente sigue mandando mientras esté incompleto (como hoy) |

---

## 9. Criterios de aceptación de esta Parte A

1. Un lector nuevo puede implementar el Lote 1 solo con este documento y el blueprint.
2. Cada afirmación sobre el código está marcada **[VERIFICADO]** o **[POR CONFIRMAR]**.
3. El contrato (2.1–2.3) fue revisado por Codex y no contradice su Parte B.
4. Las decisiones abiertas (sección 11) están presentadas a Milton con recomendación.

---

## 10. Pruebas previstas

- **Unitarias:** matriz de `evaluateProductAccess` (≈20 casos); idempotencia por `version`.
- **Integración:** backfill sobre una copia de datos; conteos antes/después; creación de usuario nuevo.
- **Regresión:** suite web actual (47 pruebas), typecheck y build con 85 rutas, `git diff --check`.
- **Sombra:** una semana de registros de `shadow` revisada contra la lista real antes de `enforce`.
- **Manual:** recorrido con la cuenta de pruebas (ver memoria «Cuenta de pruebas») en producción tras cada lote.

---

## 11. Decisiones abiertas (para Milton, con recomendación)

| # | Decisión | Recomendación |
|---|---|---|
| D1 | Un usuario que compre **solo Redes**: ¿ve el asistente de configuración inicial de Artículos (credenciales de publicación, categorías, Search Console)? | Asistente propio y más corto para Redes (idioma + conexiones de red); Artículos conserva el actual |
| D2 | Producto sin derecho: ¿tarjeta atenuada con «Activar» o ocultarlo? | Atenuada con «Activar» (vende el otro producto) |
| D3 | Antes del corte, ¿«Activar» lleva a un correo/contacto o queda deshabilitado? | Contacto al administrador, sin enlace de pago |
| D4 | Nombre visible de los productos para la marca blanca `tagcrush` | Mismo esquema pero con nombre de marca de tagcrush (`platformProductName`) |
| D5 | Usuarios «PRUEBAS» y de registro de prueba (`isTrialSignup`): ¿pasan por la tabla de derechos? | Sí: derecho `ACTIVE` con `note`; el tipo se ve en el HUB |
| D6 | Cuando se vence una gracia con trabajos en curso: ¿se cortan? | **No** se cortan los ya iniciados; no se inician nuevos |
| D7 | `composio` (configuración): ¿administración o compartida? | Compartida con ocultación para no administradores [tras verificar] |
| D8 | Al comprar Redes, ¿se aprueban automáticamente las redes? | No: las aprobaciones por red siguen siendo de Administración (límites de las apps de Meta, etc.) |

---

## 12. Revisión cruzada pedida a Codex (CONTROL, 0.12 y 0.13)

1. ¿Los campos de `ProductEntitlement` (en especial `version` y `source`) bastan para el receptor del token y la sincronización con el HUB?
2. ¿La regla «ausencia de fila = comportamiento actual» choca con algo del protocolo del token?
3. ¿La lectura de derechos **en cada petición** (y no desde el token) es viable en el worker? ¿Cómo lo harías?
4. ¿El interruptor `product_enforcement` (`off`/`shadow`/`enforce`) encaja con tu estado `legacy`/`dual`/`hub` o se pisan? Propón la relación.
5. ¿Está correcta la lista de rutas públicas y de APIs que listo en 3.4, o hay llamadas internas worker→web que el helper rompería?
6. ¿Qué rutas de máquina (callbacks, MCP) quedan fuera de `requireProductAccess`? (por ejemplo `oauth2/*`, `mcp/token-lookup`).
7. ¿El mapa de conexiones 6.2 coincide con tu inventario de callbacks (B1)? Lo que no coincida, dímelo.
8. ¿Ves un riesgo de que el layout de servidor (3.4) consulte la base en cada navegación? ¿Propones caché corta?
9. Cualquier contradicción con tu Parte B: anótala en tu buzón y yo ajusto esta parte.

---

### Respuestas de Codex a las 9 preguntas (X-005, 2026-10-01 22:48 UTC)

| # | Resultado |
|---|---|
| 1 | `version`, `source`, `updatedBy`, `graceUntil` y eventos bastan; el receptor añade idempotencia atómica. **Conforme.** |
| 2 | «Ausencia de fila» no choca con ES256: el token autentica, el acceso se evalúa local. **Conforme**, con revisión de la excepción antes de `enforce` (incorporada en 2.3). |
| 3 | Worker: validar al iniciar cada destino; memoización solo dentro de la ejecución; la revocación no corta destinos iniciados. **Conforme** (3.4 y D6). |
| 4 | `product_enforcement` y `legacy/dual/hub` son **ortogonales**; `shadow` antes de `enforce`, y `enforce` antes del corte a `hub`. **Conforme.** |
| 5 | Sin llamadas internas worker→web en `apps/worker/src`; falta confirmar colas/HTTP fuera de `src`. **Pendiente (Lote 3).** |
| 6 | Lista de rutas fuera de `requireProductAccess`. **Incorporada en 3.4.** |
| 7 | El mapa de conexiones coincide con su B1; callbacks por host de origen. **Conforme.** |
| 8 | Memoización por petición, sin caché entre peticiones. **Incorporada.** |
| 9 | Sin otra contradicción material con la Parte B tras corregir B1/B4. **Conforme.** |

## 13. Bitácora de este documento

- 2026-10-01 · Claude · v0.1 borrador completo, basado en lectura directa de: `DashboardNav.tsx`, `ModuleGuard.tsx`, `modules.ts`, `menu-names.ts`, `configuracion/page.tsx`, `dashboard/page.tsx`, `api/me/route.ts`, `middleware.ts`, listado de rutas de API y `schema.prisma`. Pendiente: revisión cruzada de Codex y verificación de los puntos **[POR CONFIRMAR]** antes de entregar a Milton.
- 2026-10-01 · Claude · v0.2: verificados Historial/Progreso (mezclan ambos productos), Estadísticas (solo artículos), Conexiones (ya dividida en analíticas/difusión) y herramientas MCP (ninguna de Redes); incorporada la regla del worker de Codex (X-002) y la nota de callbacks por host (C-008). Pendiente: revisión cruzada de Codex y los [POR CONFIRMAR] restantes (`cuenta`, `contenido`, `redes-sociales`, `indexacion`, `composio`).
- 2026-10-01 · Claude · v0.3: incorporada la revisión cruzada de Codex (X-005): auditoría previa a `enforce`, lista de rutas fuera del helper, memoización solo por petición; tabla de respuestas en §12. Estado: lista para aprobación de Milton (M2) junto con la Parte B (PR #295 en `main`, corrección B1/B4 en PR #303) y el resumen `FASE_0_SEPARACION_SEO_TOTAL_CONSOLIDADO.md`.
