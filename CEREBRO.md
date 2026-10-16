# CEREBRO — Decisión durable HUB, OAuth y dominios

Fecha: 2026-10-16

## Objetivo

Hacer que `seototal` pueda entregar la navegación humana al HUB sin romper callbacks OAuth, sesiones existentes ni APIs técnicas.

## Decisión de diseño

Usar un modelo mixto y conservador:

- Las rutas humanas de `seototal` podrán ir al HUB.
- `/api/*` seguirá atendiendo callbacks técnicos.
- `.com` será el dominio canónico.
- `.net` es una familia válida de producto además de `.com`; cada familia emite su propia cookie de sesión porque el navegador no permite compartir una cookie `.com` desde `.net`.
- No se cambiarán de entrada las URLs de las consolas OAuth ni se reconectarán integraciones existentes.

## Decisión UI — shell compartido y administración de Artículos — 2026-10-16

- La referencia real es el shell servido por `superlinks.lasolucionweb.net`, no una copia histórica del checkout.
- Se restaura el encabezado global del Hub en sesiones emitidas por `/auth/hub`; el origen se conserva en una cookie firmada ligada al usuario y se propaga por middleware.
- El menú propio de Artículos no duplica el acceso al Hub. Su grupo administrativo se etiqueta `Admin Artículos` y sigue sujeto al rol local `admin`/suplantación.
- El botón global de la plataforma se etiqueta `Admin Hub`, siguiendo la referencia viva de Superlinks.
- Login nativo y logout eliminan el contexto Hub para evitar que una sesión anterior altere la navegación actual.
- Las pantallas `ADMIN` no pertenecen a Artículos ni Redes, pero sí deben permanecer visibles para una cuenta administradora dentro de cualquiera de esos hosts. El clasificador de producto sigue devolviendo `ADMIN`; la excepción vive solo en el menú, antes del filtro visual, y no modifica autorización.
- La composición visual canónica de Artículos es la de Superlinks: `EcosystemHeader` global arriba y `DashboardNav` como `app-subbar` separado. La identidad/contexto del producto no se mezcla con el contenido; `Admin Artículos` conserva su acceso desplegable, pero adopta el botón delineado y el submenú del estándar.

## Punto cero vigente — producción verificada — 2026-10-16

- La versión funcional que debe tomarse como base es `d6b0ac20000c70ee66b79cdf54ae9783b1f3da08` en `main`.
- Está servida por Vercel en `dpl_2H4BhWtbetcEkAFHUgLpBzixZZFE` (`READY`), con Redes y Artículos verificados en producción.
- La comprobación viva confirmó menú interno San Francisco `14px/400`, título `15px/700`, contexto `14px/400` y submenú `13px/500–600`.
- Todo código o documento que contradiga estos valores debe compararse primero contra producción; los commits anteriores de este archivo son historial, no punto de partida.

## Decisión durable — cada producto conserva su propio menú — 2026-10-16

- El dominio de Redes no debe renderizar el grupo de Artículos. La aplicación está determinada por el host, no por el catálogo completo de productos de la cuenta.
- El dominio de Artículos no debe renderizar el grupo de Redes. Solo el Hub compartido puede mostrar el selector completo.
- La corrección `d6b0ac2` filtra `PRODUCT_ENTRIES` por host antes de renderizar `DashboardNav`; no cambia autorización, rutas, datos ni permisos.

## Punto 6 histórico — paridad pixel a pixel del shell — supersedido por el punto cero vigente

- La verdad visual se comprobó en las URLs públicas vivas de Superlinks y Artículos, usando el mismo navegador y viewport; no se infirió desde un checkout histórico.
- Se igualaron métricas de margen, espaciado, alturas, tipografía, estados activos, líneas, colores y radios del encabezado global y de `app-subbar`.
- El shell servido por Superlinks no muestra el distintivo `L` ni un botón delineado para `Admin Hub`; Artículos quedó igualado a ese comportamiento observado.
- `Admin Artículos` conserva su función y el submenu se ancla por la derecha en el borde de la pantalla para no recortar opciones.
- Código final: `02b87b4f51a180a87460ce313b246199302fa5ca`; deployment `dpl_ETboyDP3AmkbNW8JH3BfuZN5WqnR` (`READY`).
- Se detectó y neutralizó una edición local concurrente que reintroducía el shell antiguo; no se usó `git reset`, no se crearon ramas ni worktrees y el árbol final quedó limpio.

## Corrección de regresión concurrente — 2026-10-16

- El commit `babd61c1` demostró el riesgo operativo: un proceso paralelo reescribió la paleta canónica de `app-subbar` en `main` y generó una regresión visual.
- La respuesta correcta fue corregir hacia delante desde ese estado, no usarlo como verdad ni hacer rollback de la funcionalidad administrativa.
- Estado vigente: código `82d33d878efabacce5b2af68eb4277c81ae18f0f`, deployment `dpl_6FBpAqVmxU39LjiTZGquBcwT9Fq7` (`READY`), producción comprobada.

- La segunda interferencia `0f7288dc` volvió a reintroducir el shell antiguo; la corrección definitiva es `964444a576b9f1e49bcf568981370f03b6769064`, deployment `dpl_Ehik784nNKkRoTsaoMUH9FBG7gsL` (`READY`).

## Reparaciones previstas

1. Excluir callbacks y APIs de cualquier redirección humana al HUB.
2. Hacer que `/auth/hub` emita la sesión mediante `applyCookie`.
3. Normalizar las entradas humanas `.net` al `.com` equivalente.
4. Corregir Instagram directo para devolver al origen permitido.
5. Revisar Bing y los demás callbacks directos para que no envíen a `seototal` sin sesión ni acepten destinos arbitrarios.
6. Mantener Tumblr y Composio según su flujo técnico actual, verificando sus destinos reales.
7. En `/auth/hub`, seleccionar el dominio de cookie según el host que recibió el callback (`.com` o `.net`).

## Alternativa no elegida ahora

Mantener toda la aplicación en `.net` exigiría una sesión/cookie propia de `.net` y transportar el origen mediante estado OAuth firmado o una transacción servidor. Es posible, pero aumenta el riesgo y no es necesario para conservar las conexiones actuales.

## Orden de trabajo

1. Documentar y congelar el punto cero.
2. Auditar y preparar los cambios mínimos.
3. Ejecutar pruebas unitarias, typecheck, build y pruebas funcionales sin autorizar conexiones reales.
4. Publicar desde `main`.
5. Verificar producción y después probar OAuth con una cuenta de prueba autorizada.
6. Actualizar todos los documentos con el resultado real.

## Estado de ejecución

- Punto 1 completado en `main` (`19f8ff5`) y verificado en producción (`dpl_6bzjEAAUEQGwtwkUaR2mWAyDgcRP`).
- La redirección activa solo para visitantes sin sesión en las rutas humanas de `seototal.com`.
- El Punto 2 corrigió `/auth/hub` para usar `applyCookie`; las sesiones emitidas por el HUB ya quedan preparadas para el dominio canónico `.com`.

## Punto 2 completado

- `/auth/hub` usa `applyCookie` desde `b7ce44c`.
- Con `DIA_CERO=on`, la sesión emitida por el HUB es válida en los subdominios `.com` y elimina la cookie host-only antigua.
- Deployment verificado: `dpl_9P62g85S79rBK8sfUN1HCocdoUnw`.
- Próximo punto: probar el retorno con una cuenta/código real del HUB autorizado; no se deben cambiar consolas de proveedores sin evidencia.

## Punto 3 completado — lanzamiento HUB → Redes en `.net`

- Hallazgo productivo: `redes.lasolucionweb.net/auth/hub` heredaba `Domain=.lasolucionweb.com` por `DIA_CERO=on`. El navegador rechazaba la cookie y el dashboard devolvía al usuario a `/login`.
- Decisión durable: `cookieEnvForHost()` fija `.lasolucionweb.net` cuando el callback llega por `.net` y conserva `.lasolucionweb.com` para `.com`.
- Código: `7112c1ac0a3c840640027cd93b094243ceebd980`.
- Producción: deployment `dpl_kzmJfxq2E2fS41QWAVKx76Jkgv8V` (`READY`).
- Evidencia E2E: la tarjeta del HUB llegó a `https://redes.lasolucionweb.net/dashboard/oportunidades-redes` con sesión activa y encabezado `SEO TOTAL REDES`.
- Estado final: cerrado y documentado en `CURRENT_STATE.md`, `BASELINE.md` y `CHECKPOINTS.md`.

## Punto 4 completado — shell y administración de Artículos

- El shell global y el grupo local `Admin Artículos` quedaron publicados en `main`.
- La regresión residual no era de sesión ni de hidratación: el filtro de host ocultaba las rutas `ADMIN` y dejaba el grupo sin elementos.
- La regla durable es: administración transversal visible para administradores; autorización de datos independiente y server-side.
- Código: `02861df21487a0704268b30946e8021f866972c9`.
- Producción: `dpl_3J97U2QwYPx2r5MhaU6snsfd8hLG`, `READY`.
- Evidencia: menú visible y desplegable verificado en vivo en `articulos.lasolucionweb.net`.

## Punto 5 completado — paridad visual con Superlinks

- Se movió el menú de aplicación fuera del `main` para que sea una barra independiente de ancho completo.
- Se aplicaron las proporciones, alineación, tipografía, estados, botón administrativo y superficie del submenú observados en Superlinks.
- No se modificaron rutas ni autorización.
- Código: `29d0c7b1689b2082c0939c87c075a2e50685fe37`.
- Producción: `dpl_32q6Rg5dppMPZXfwrep8qnWXdcWi`, `READY`.
- Evidencia: revisión visual E2E con `Admin Artículos` expandido y sus tres destinos presentes.

## Punto 6 — corrección final de la referencia visual — 2026-10-16

- La autoridad visual fue la producción viva de Superlinks, no los estilos heredados ni los documentos previos. La lectura final muestra `app-subbar` blanca/gris, no azul.
- Se corrigió `DashboardNav` sin tocar rutas, permisos, APIs ni datos: fondo `#ffffff`, borde `#e7e7eb`, contexto `#86868b`, enlaces `#6e6e73`, activo `#f2f2f4` y submenú de superficie blanca.
- `main`: `2050d88c6c70ab4f8c7a37aa73a5b40e0dd825a8`; producción: `dpl_D4CeNFCjs4P4UusUhgQym9dsv4CJ` (`READY`).
- E2E real: `articulos.lasolucionweb.net/dashboard` cargó la barra y el submenú `Usuarios`, `Composio`, `PostPeer`; typecheck/build OK.

## Corrección de tipografía del submenú — 2026-10-16

- La comparación final contra la URL viva demostró que la diferencia restante no era subjetiva: producción servía `12px` y pesos `650/600` en los elementos del submenú.
- La corrección canónica es `13px`, activo `600` y no activos `500`; el resto de la geometría y la paleta se conserva.
- Código: `3f5c953fbbf5b5269ee325f60a45c84f0c371c46`; deployment: `dpl_FsQ7hFKRRL195c3qEHBRv7EwPbF2` (`READY`).
- Verificación: DOM productivo confirmó `Usuarios`, `Composio` y `PostPeer` con `13px`, pesos `600/500`, filas de `31px` y padding `8px 10px`.

## Tipografía del menú de aplicación — 2026-10-16

- La regla canónica para la barra de Artículos es San Francisco `14px/400` en sus enlaces.
- La identidad del producto queda en `SEO Total Artículos` `15px`; el contexto `Artículos con IA` queda en `14px/400`.
- Código y producción: `57ac8e28346c6f8823f80338660745cd9a3a24b9`, deployment `dpl_LnWjSCLfamnVPssaRcyCFk87jVdi` (`READY`).
- La comprobación viva confirma la familia efectiva y conserva el submenú administrativo previamente fijado en `13px/500–600`.

## Propagación documental completada — 2026-10-16

Los siete archivos activos del Harness comparten ahora el mismo punto cero productivo, la misma evidencia y la misma regla de precedencia: producción verificada primero; historial solo como contexto.

## Corrección de navegación de Redes — 2026-10-16

- La tarjeta de Redes ya estaba visible en el Hub; el defecto real en la aplicación era que el grupo se llamaba `Admin Artículos` también dentro de Redes.
- `DashboardNav` ahora deriva el nombre del grupo del host, sin duplicar componentes ni alterar las guardas: `Admin Redes` en Redes y `Admin Artículos` en Artículos.
- Código y deployment verificados: `945fe5fcd2af2d1d7383bc4f61dc110bd6875805`, `dpl_FdSLPtRq3jC53rfZcekMT3W1H6f9` (`READY`).

## Decisión — anti-canibalización al publicar y rescate seguro — 2026-10-16

- La verificación de canibalización ya no vive solo al proponer (Oportunidades). Se repite al encolar (`/api/runs`), al listar Oportunidades y en el worker, antes de abrir el sitio o gastar OpenAI/imagen/FAQ.
- Regla de coincidencia: texto normalizado EXACTO (sin mayúsculas, tildes ni puntuación) contra `text` y `finalTitle` de artículos ya publicados con enlace del mismo sitio. No se usa similitud difusa contra lo publicado: bloqueó de más en la cuenta de Lorena (7/9/2026).
- Rescate de atascados: sin evidencia de inactividad no se declara muerto un título; el cierre exige `status = processing` en la misma transacción. Un título que termina en éxito retira su oportunidad restaurada.
- Evidencia de la causa: ver `COORDINACION_CLAUDE_CODEX.md`, reclamo del 2026-10-16.
