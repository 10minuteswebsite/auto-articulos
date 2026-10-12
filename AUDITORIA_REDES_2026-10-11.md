# Auditoría de Redes — inconsistencias (2026-10-11)

Alcance: pantalla de Redes, rutas de generar/publicar/vista previa, worker, cupos, Administración, menú y manual.
Solo lectura salvo el punto 1. Evidencia = archivo y línea del código en `main`.

## Corregido
1. **Precedencia en publicar (error mío, PR #528, en producción).** `redesHost || platform === "pinterest" ? A : B` se leía `(redesHost || pinterest) ? A : B`: en redes.lasolucionweb.com Pinterest, Tumblr y Bluesky exigían la aprobación de Pinterest. Ahora cada red usa la suya y el dominio redes las abre todas.

## Alto
2. **La vista previa no es lo que se publica.** `/api/social-opportunities/preview` genera una imagen con un método simple; la publicación real usa la foto del artículo o el Director Creativo. Además solo existe para Instagram, Threads y LinkedIn (lista fija en la pantalla).
3. **Permisos al publicar incoherentes.** `publish/route.ts` no comprueba aprobación para LinkedIn ni X; Instagram no tiene bypass de administrador (los demás sí); Pinterest/Tumblr/Bluesky ya usan una función. Aparte existe `canPublishToNetwork` (otras rutas de conexión): dos sistemas para lo mismo.
4. **Correo fijo en el código.** `generate/route.ts:496` activa todas las redes para `lorenalvarez30@gmail.com` sin pasar por Administración (Bluesky queda fuera de ese atajo).
5. **«Hoy X de N» puede mostrar números imposibles (pantalla nueva, local).** Cuenta publicadas hoy en todos los formatos de Instagram/Facebook pero muestra el cupo de un solo formato (`instagram-post`, `facebook-page`).
6. **Pinterest se corta.** El generador pide hasta 800 caracteres y el worker recorta la descripción a 500 con «...».

## Medio
7. **Formatos sin dueño.** Administración da cupos a Instagram carrusel/reel/infografía y Facebook Story, pero la pantalla nunca los genera (solo `instagram-story` + `instagram-post` y `facebook-page`). Una pulsación en Instagram crea 2 propuestas con cupos separados mientras el botón dice «Crear propuesta» (singular).
8. **Errores invisibles.** La pantalla del grupo solo lista «pendientes»; una publicación en error o en cola solo se ve en Progreso/Historial, aunque la ruta de publicar acepta reintentar los errores.
9. **Ruta huérfana.** `generate-all` ya no la usa ninguna pantalla.
10. **Nombres distintos para lo mismo.** `google-business` / `business-profile` / `googleBusiness`; «Facebook Pages» (Administración) vs «Facebook»; «oportunidad» vs «propuesta»; el menú Publicaciones aún dice «1) PUBLICA EN REDES SOCIALES Y EN BLOGS PÚBLICOS» mientras el Inicio muestra META y Otras redes y blogs.
11. **Dos selectores de grupo.** El Inicio y `/dashboard/oportunidades-redes` muestran las mismas tarjetas.
12. **Manual sin actualizar** con META/Otras redes y blogs, las instrucciones nuevas y los botones renombrados (orden permanente: va en el mismo lote).

## Bajo
13. `preview/route.ts`: el `catch` traga el fallo de sesión (comentario «sin usuario autenticado»); la protege el middleware, pero el código engaña.
14. Tumblr usa el prompt corto de redes (360 caracteres) aunque es un blog.
15. Propuestas históricas de `devto` y `mastodon` (integraciones ya retiradas) siguen en el historial.
16. El worker no distingue dominio (solo importa si el interruptor de derechos del HUB pasa a `enforce`).
