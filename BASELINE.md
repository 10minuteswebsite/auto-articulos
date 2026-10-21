# BASELINE — Contrato previo HUB/OAuth

## Contrato editorial — veracidad y fuentes — 2026-10-21

- Los prompts de escritura de artículos, títulos y FAQs no pueden inventar datos, fechas, leyes, nombres, cifras ni estados actuales.
- Todo dato externo, cambiante o sensible debe estar respaldado por material suministrado o por una fuente directa y trazable de un organismo gubernamental, regulador, universidad, asociación profesional, investigación primaria u otra institución autorizada.
- Si no existe respaldo, el modelo debe omitir la afirmación o declarar que no pudo verificarse; nunca debe fabricar citas o URLs.
- Este contrato no aplica al prompt de 10MWS y no reemplaza los prompts editoriales existentes.
- Estado de implementación: commit `04910056` publicado en `main`; la activación productiva queda pendiente de confirmar con Vercel.

## Contrato añadido — META historias y carruseles — 2026-10-20

- Carrusel Instagram: exactamente cinco láminas, `1080×1350`, numeradas `01/05` a `05/05`.
- Las composiciones pueden ser de texto, imágenes o mixtas; el logo informa color/tono/estilo y no se inserta obligatoriamente.
- El flujo rechaza publicaciones con menos de cinco imágenes y registra cada asset generado.
- Historias permanecen en el flujo META existente; Reels quedan fuera de este alcance.

## Contrato editorial vigente — 2026-10-19

- Todas las cuentas usan `GENERADOR DE ARTÍCULOS PROBLEMA SOLUCION` como estilo predeterminado. STANDARD sigue disponible como elección explícita; no cambiaron navegación, permisos ni rutas.

## Verificación posterior — Threads/PostPeer — 2026-10-19

- `474ed73c` publicado en `main`; ambos deployments productivos `success`.
- La verificación visual autenticada de Juan queda pendiente de sesión; el dominio protegido responde `/login` sin sesión.

## Contrato añadido — conexión Threads por PostPeer — 2026-10-19

- En Configuración → Conexiones → Threads, una cuenta autorizada debe ver `Conectar con Threads` cuando no está conectada.
- Threads usa `/api/postpeer/threads/connect`; no depende de credenciales Meta propias ni de `/api/search-integrations/threads/settings`.
- Un 404 de la antigua ruta de settings no puede convertirse en «Esta conexión todavía no está disponible».

## Contrato añadido — Google Business y tokens — 2026-10-17

- Google Business: aprobar con Publicar y tener la cuenta PostPeer activa basta para que el worker tome la propuesta (con o sin resumen); termina en «Publicado» o en error con el motivo real, nunca en un 1 % silencioso más de 10 minutos.
- Una publicación fallida jamás se reenvía sola; solo una persona la reintenta.
- Imagen IA: un reintento del mismo título y formato reutiliza la imagen ya pagada (48 h). No hay cambios visuales.

Fecha: 2026-10-16

## Punto cero vigente — producción verificada — 2026-10-16

- Repositorio: `https://github.com/10minuteswebsite/auto-articulos`.
- Única rama y checkout autorizado: `main`; sin ramas ni worktrees adicionales.
- Verdad funcional: código `d6b0ac20000c70ee66b79cdf54ae9783b1f3da08` servido por Vercel.
- Deployment productivo: `dpl_2H4BhWtbetcEkAFHUgLpBzixZZFE`, `READY`, alias de Redes verificado.
- UI vigente comprobada en producción: menú de aplicación San Francisco `14px/400`; título `SEO Total Artículos` `15px/700`; contexto `Artículos con IA` `14px/400`; submenú administrativo `13px/500–600`.
- Evidencia: DOM autenticado de Artículos y Redes después de recarga real; Redes mostró `Admin Redes` y su submenú completo, y el Hub mostró `AUTOMATIZA TUS REDES SOCIALES`. No se modificaron rutas, permisos, datos ni secretos.

Las secciones posteriores que mencionen otros commits o deployments son registros históricos y no sustituyen este punto cero.

## Corrección vigente — menú propio de Redes — 2026-10-16

- Causa: `DashboardNav` usaba el catálogo completo `PRODUCT_ENTRIES` también en el host de Redes, por lo que Redes mostraba el grupo `SEO Total Artículos`.
- Corrección: el host `redes` filtra su navegación a `Inicio`, `SEO Total Redes`, `Configuración` y `Admin Redes`; el host `articulos` conserva exclusivamente su menú propio. El Hub compartido mantiene la vista completa de productos.
- Evidencia productiva: Redes `.net` verificado sin `SEO Total Artículos`, con el submenú propio de Redes y `Admin Redes`; Artículos `.net` verificado con `SEO Total Artículos` y `Admin Artículos`, sin `SEO Total Redes`.

## Contrato MCP — asistentes de IA — 2026-10-16 (commit `4bbf565a`, `dpl_4rtM1ewRc2bXtQRmcuASB3yhahFR`)

Comportamiento que NO debe cambiar sin nueva verificación:

- Un solo servidor `/api/mcp` para los tres productos y los seis dominios; sin token responde 401 (sin `WWW-Authenticate`, por Alexa+).
- ChatGPT usa OAuth (`chatgpt-auto-articulos-v1`, PKCE); la renovación `grant_type=refresh_token` debe devolver 200 con par nuevo; un refresh inválido, `invalid_grant` 400. Claude/Muse/otras usan el token personal `sta_`.
- Catálogo (33 herramientas): artículos (`listar_oportunidades`, `crear_oportunidades`, `crear_titulos_con_ia`, `publicar_*` con `confirmar=false` → comprobante → `confirmar=true`), cuenta, manual, estilos (`listar_estilos_escritura`, `cambiar_estilo_escritura_por_defecto`, parámetro `estilo`) y Redes (`ver_redes_sociales`, `generar_propuestas_sociales`, `listar_propuestas_sociales` con filtros `red`/`estado`/`id`, `publicar_propuestas_sociales` con `reintentar`, `publicar_propuesta_social`, `cancelar_propuesta_social`, `eliminar_propuestas_sociales`).
- Prompts MCP: `empezar`, `publicar_contenido`, `programar_publicaciones`, `publicar_en_redes`, `automatizar_redes`, `diagnosticar_cuenta` (la prueba `src/lib/mcp.test.ts` los exige).
- Las `instructions` del servidor incluyen el resumen «QUÉ PUEDES HACER» y la automatización diaria (Muse y otros clientes leen `tools/list` e `instructions`, no siempre los prompts).
- El asistente NO conecta ni diagnostica integraciones; el cupo diario de Redes limita publicaciones, no propuestas; todo publicar/cancelar/eliminar exige comprobante.
- Pantalla `/dashboard/configuracion/mcp`: prompt de Artículos en `articulos`, prompt propio de Redes en `redes`, ambos en el host combinado.
- «Oportunidades Redes» y las propuestas del MCP son la misma tabla `SocialOpportunity`.

### Prompts por producto — 2026-10-16 (commit `4836deaf`, `dpl_J9bQtR8XPmRHDA6LFPiXCQq7wvBx`)

- `/dashboard/configuracion/mcp` muestra un prompt según el host: `redes` → `MCP_PROMPT_REDES`; `articulos` → `MCP_PROMPT_ARTICULOS`; host combinado → Artículos + sección de Redes. Ninguno lleva la línea «Servidor MCP». La prueba `prompts-por-producto.test.ts` exige que Artículos no nombre herramientas de Redes y viceversa.
- La automatización se PROPONE (resumen del plan) y requiere un sí único del usuario antes de crear tareas; después corre sin aprobar cada publicación salvo que el usuario lo pida. Por defecto: Artículos tres al día a horas distintas (07:00, 12:00, 19:00); Redes una al día por red (10:00) o solo las redes elegidas, cada una con su horario.

## Regla de dominios

Se trabajará en modo mixto:

- `.com`: dominio canónico de sesión, HUB y OAuth.
- `.net`: alias de entrada humana y familia válida de producto; cuando una sesión se emite desde `.net`, su cookie se fija dentro de `.lasolucionweb.net`.
- `seototal.lasolucionweb.com/api/*`: callback técnico conservado aunque las rutas humanas de `seototal` pasen al HUB.

En el Punto 1, la redirección se aplica solo sin sesión. Una sesión existente conserva su dashboard temporalmente para que el retorno de `/auth/hub` no entre en un bucle; el Punto 2 resolverá la sesión compartida y el destino canónico posterior.

El Punto 2 ya corrigió la emisión de sesión de `/auth/hub`: con `DIA_CERO=on`, `applyCookie` fija la cookie en la familia del host que recibió el callback y elimina la variante host-only. Todavía falta probar un intercambio real con una cuenta autorizada del HUB.

No se intentará compartir una cookie entre `.com` y `.net`: cada familia usa su propio dominio porque el navegador no permite una cookie `.com` puesta desde `.net`.

## Flujos que no deben romperse

1. Las integraciones existentes no deben reconectarse por este cambio.
2. Un callback técnico debe conservar la sesión y volver al producto de origen.
3. Una entrada desde el HUB debe crear una sesión válida en los subdominios de la familia que recibió el callback (`.com` o `.net`).
4. `/api/*` no debe redirigirse al HUB por una regla de navegación humana.
5. Un callback inválido o sin sesión debe devolver un error controlado.

## Corrección de lanzamiento HUB a Redes — 2026-10-16

`/auth/hub` selecciona el dominio de cookie según `request.nextUrl.hostname`. Esto conserva el comportamiento `.com` y permite que `redes.lasolucionweb.net` establezca una sesión válida después de canjear el código de un solo uso.

## Proveedores

Se conservarán primero los callbacks canónicos `.com` ya usados. Solo se tocarán consolas externas si la verificación manual demuestra que falta una URL. Las conexiones existentes no dependen del callback para renovar o publicar sus tokens.

## Baseline visual y de navegación — Artículos — 2026-10-16

- El shell de referencia es el de `superlinks.lasolucionweb.net`: encabezado global del Hub separado del menú interno del producto.
- En sesiones Hub, el encabezado global debe mostrar `LA SOLUCIÓN IA`, `Aplicaciones`, `Facturación`, `Perfil`, `Admin Hub` solo para administradores y `Salir`.
- El menú interno de Artículos conserva sus módulos y muestra el grupo administrativo como `Admin Artículos` solo para administradores.
- `Volver al HUB` no se duplica en el menú interno cuando el encabezado global ya ofrece `Aplicaciones`.
- El origen Hub se prueba con un contexto firmado ligado al mismo `userId`; un contexto ausente o inválido conserva el shell legacy y no concede permisos.
- Las rutas administrativas son transversales al host de producto: el filtro visual de Artículos/Redes no puede ocultarlas para un administrador. Su visibilidad sigue dependiendo del rol o suplantación; esta excepción no concede acceso y las APIs conservan sus guardas.
- La navegación de producto debe copiar el patrón vivo de Superlinks: encabezado global separado, `app-subbar` independiente, identidad/contexto del producto a la izquierda, enlaces de aplicación a la derecha y botón administrativo delineado. Los submenús usan superficies blancas, borde tenue, radio suave y sombra discreta; no se usan estilos morados ni menús antiguos.

### Métricas visuales canónicas verificadas en producción

- Superlinks es la referencia servida; no se usa una captura ni un checkout antiguo como fuente visual.
- Shell global: `min-height: 64px`, contenedor máximo `1280px`, padding horizontal `16px` (<640px), `24px` (640–1023px) y `32px` (≥1024px); enlaces `14px`, peso `400`, línea `20px`; activo `#f3f4f6`; `Admin Hub` sin botón delineado; `Salir` con borde `#d1d5db` y radio 8px.
- `app-subbar`: `min-height: 52px`, ancho `min(100% - 40px, 1160px)`, fondo `#ffffff`, línea inferior `#e7e7eb`; título del producto `15px/700`; contexto `14px/400` con línea `#d2d2d7` y texto `#86868b`; enlaces del menú `14px/400`, pila San Francisco, color `#6e6e73`, activo `#f2f2f4`.
- `Admin Artículos`: botón delineado con radio 9px; el submenu usa blanco, borde `#e7e7eb`, radio 10px, sombra tenue, enlaces `13px/500–600` y se ancla a la derecha cuando el grupo está al borde del viewport.
- Si una edición local vuelve a azul histórico o agrega el distintivo `L` al shell, se considera discrepancia y debe compararse contra la URL viva antes de continuar.

### Corrección de regresión registrada — 2026-10-16

- `babd61c1` reintrodujo temporalmente el shell blanco/gris en `main`; no es referencia válida ni debe promoverse.
- El estado canónico vigente queda fijado por `82d33d878efabacce5b2af68eb4277c81ae18f0f` y por el deployment productivo `dpl_6FBpAqVmxU39LjiTZGquBcwT9Fq7` (`READY`).

- Corrección definitiva vigente tras la segunda interferencia: `964444a576b9f1e49bcf568981370f03b6769064`, deployment `dpl_Ehik784nNKkRoTsaoMUH9FBG7gsL` (`READY`).

### Corrección de verdad funcional histórica — supersedida por el punto cero vigente — 2026-10-16

- La comparación viva final contradice la paleta azul documentada arriba: Superlinks servido muestra `app-subbar` blanca/gris. Esa evidencia de producción supersede las métricas azules históricas.
- Valores vigentes en Artículos: fondo `#ffffff`, línea `#e7e7eb`, contexto `#86868b`, enlaces `#6e6e73`, activo `#f2f2f4`, submenú con borde `#e7e7eb` y sombra tenue.
- Código vigente: `2050d88c6c70ab4f8c7a37aa73a5b40e0dd825a8`; deployment vigente: `dpl_D4CeNFCjs4P4UusUhgQym9dsv4CJ` (`READY`).
- Evidencia: dominio real recargado y submenú expandido; AX confirmó `Usuarios`, `Composio` y `PostPeer`.

### Corrección de tipografía del submenú — 2026-10-16

- Hallazgo productivo: el submenú servido estaba en `12px` con pesos `650/600`, más pequeño y pesado que la referencia visual vigente.
- Corrección mínima: `13px`; elemento activo `600`, elementos no activos `500`. Se conservaron padding, alturas, colores, bordes, radios, sombra y rutas.
- Código publicado: `3f5c953fbbf5b5269ee325f60a45c84f0c371c46`.
- Deployment productivo: `dpl_FsQ7hFKRRL195c3qEHBRv7EwPbF2`, `READY`, aliases de Artículos activos.
- Evidencia E2E: tras recarga real, `Admin Artículos` mostró `Usuarios`, `Composio` y `PostPeer`; el DOM calculó `13px`, pesos `600/500`, filas de `31px` y padding `8px 10px`.

### Tipografía del menú de aplicación — 2026-10-16

- Cambio solicitado: menú de aplicación en San Francisco `14px` Regular; título `SEO Total Artículos` en `15px`; contexto `Artículos con IA` en `14px` Regular.
- Código servido: `57ac8e28346c6f8823f80338660745cd9a3a24b9`.
- Deployment productivo: `dpl_LnWjSCLfamnVPssaRcyCFk87jVdi`, `READY`, aliases de Artículos activos.
- Evidencia E2E: DOM productivo confirmó menú `14px/400`, título `15px/700`, contexto `14px/400` y familia `-apple-system, system-ui, SF Pro Text, SF Pro Display, Segoe UI, sans-serif`.

### Corrección de navegación de Redes — 2026-10-16

- `DashboardNav` conserva el shell Hub y la subbarra de Superlinks en Redes, pero ahora etiqueta el grupo administrativo según el producto: `Admin Artículos` en Artículos y `Admin Redes` en Redes.
- Código publicado: `945fe5fcd2af2d1d7383bc4f61dc110bd6875805`.
- Deployment: `dpl_FdSLPtRq3jC53rfZcekMT3W1H6f9`, `READY`.
- Evidencia E2E: `redes.lasolucionweb.net/dashboard` mostró `SEO Total Redes`, `Difusión social`, `Admin Redes` y el submenú `Usuarios`, `Composio`, `PostPeer`; el Hub mostró la tarjeta `AUTOMATIZA TUS REDES SOCIALES`.

## Corrección de logout y navegación Hub — 2026-10-19

- Punto cero: producción en main, commit funcional final a2f3406e9dfe154188e180d204f82ea08e8558ee, deployment Vercel dpl_H6HNToZ9agcLBf5WxPnMe4KkVRCS (READY), con los seis dominios de producto asignados.
- Hallazgo: /api/auth/logout borraba las cookies usando process.env sin seleccionar la familia del host receptor. En el flujo .net, el logout podía no borrar la cookie compartida .lasolucionweb.net.
- Corrección: el endpoint usa cookieEnvForHost(request.nextUrl.hostname) al borrar sesión, suplantación y contexto Hub. Se añadió prueba de regresión para una variable global mal configurada.
- Corrección visual: se eliminó del DashboardNav la entrada Volver al Inicio; no se alteraron los enlaces internos de las páginas.
- El botón de logout ahora es explícitamente type="button", envía la petición con credentials: same-origin y redirige incluso si la petición falla.
- Verificación real: con una sesión iniciada en seototal.lasolucionweb.net/dashboard, pulsar Salir llevó a Auth0 y después a hub.lasolucionweb.net/login; al volver a seototal.lasolucionweb.net/dashboard, producción respondió con /login. La navegación visible no mostró Volver al Inicio.
- Alcance: esta evidencia cubre el botón Salir del dashboard, que ejecuta primero el logout de Auto Artículos y después el logout de Auth0. Un logout iniciado exclusivamente desde otra aplicación del HUB debe seguir usando este mismo contrato si se quiere invalidar también la cookie de Auto Artículos.


## Contrato vigente — logout cruzado desde el HUB — 2026-10-19

- El HUB es el iniciador canónico del logout global.
- El logout del HUB llama primero a `seototal.lasolucionweb.com/api/auth/logout`; esa ruta es técnica, pública y solo acepta un retorno interno al HUB.
- Auto Artículos limpia sus cookies y vuelve al HUB con el marcador `autoArticulosCleared=1`; el HUB evita repetir el puente y completa el logout Auth0.
- No se comparten cookies entre `.com` y `.net`; el contrato usa `.com` como host canónico del puente.
- Prueba pública realizada: la cadena terminó en `hub.lasolucionweb.net/login` sin `401` JSON ni Auth0 Oops.


## Verificación E2E final — logout cruzado con sesión real — 2026-10-19

- Se abrió una sesión real desde el HUB y se lanzó Auto Artículos en `articulos.lasolucionweb.net/dashboard`; el dashboard mostró la cuenta autenticada.
- Se ejecutó logout desde `hub.lasolucionweb.net/auth/logout`.
- Resultado verificado: `articulos.lasolucionweb.net/dashboard` redirigió a `/login`; la cookie de la familia `.lasolucionweb.net` dejó de ser utilizable.
- El HUB también quedó sin sesión: `hub.lasolucionweb.net/dashboard` redirigió al login de Auth0.
- El puente de Auto Artículos ya estaba publicado en `dpl_8q4iRMCe2iyPYh6VeJ3quKw3G5cd`; la corrección de ambas familias vive en el HUB, commit `7e4628cba95564736d3d18f3f7e7574533e72077`, Cloudflare `73a6fbcd`, 100%.
- Punto 4: COMPLETADO. No se comparten cookies entre `.com` y `.net`; el HUB visita ambos orígenes para borrarlas.

## Contrato temporal — cuentas bilingües — 2026-10-20

- Una cuenta puede conservar temporalmente categorías de dos sitios mientras se integra el nuevo MCP de conexión con 10MWS.
- El idioma editorial pertenece a la categoría; `English` usa `en` y `Español` usa `es`.
- El MCP no debe escoger silenciosamente entre sitios: debe preguntar el destino antes de generar o publicar.

## Estado verificado del contrato bilingüe — 2026-10-20

- Código productivo: `0c3b7197`; Vercel `success`.
- Esquema productivo: `Category.contentLanguage` aplicado por workflow seguro #81 (`39347494879`).
- No se permite aceptar pérdida de datos para resolver migraciones no relacionadas.
