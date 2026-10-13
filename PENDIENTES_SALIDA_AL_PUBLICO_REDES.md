# Pendientes para sacar Redes al público (2026-10-11)

Leyenda: [ ] pendiente · [x] hecho · Responsable: **M** = Milton, **C** = Claude, **O** = otro programador.

## A. Bloqueantes (sin esto NO se abre al público)

**Publicación real, red por red (una publicación por red, borrando las sobrantes)**
- [x] Threads (enlace clicable verificado).
- [x] Bluesky (enlace clicable verificado).
- [x] LinkedIn · [x] Facebook · [x] Instagram con imagen IA del Director (2026-10-12) · [x] Pinterest (2026-10-12) · [x] Tumblr (2026-10-12; enlace del Historial arreglado en este lote) · [x] Blogger (2026-10-12) · [x] Google Business (2026-10-12: publicado con PostPeer desde el worker de Redes; carril limitado a lo aprobado y con cupo) — C, con visto bueno de M antes de cada publicación.

**Reglas de acceso y permisos**
- [x] Redes siempre activa y todas las redes abiertas en redes.lasolucionweb.com; seototal sin cambios (PR #514, #515, #528).
- [x] Probar con una cuenta que NO sea Lorena y sin aprobaciones (hecho por Milton 2026-10-12, funciona) — C + M.
- [x] Permisos al publicar coherentes: LinkedIn comprueba su aprobación e Instagram deja pasar al administrador (2026-10-12) — C.
- [x] Quitar el correo fijo `lorenalvarez30@gmail.com` de `generate/route.ts` (2026-10-12) — C.

**Pantalla de Redes (hoy solo en local, sin subir)**
- [x] Corregir «Hoy X de N» (2026-10-12, en el PR del rediseño) — C.
- [~] Vista previa: APARCADA por decisión de Milton («no me interesa por ahora»); se retoma cuando él lo pida.
- [x] Errores de publicación visibles en la pantalla del grupo, con reintento (2026-10-12) — C.
- [x] Pinterest: el generador ya pide menos de 450 caracteres y no se recorta (2026-10-12) — C.
- [x] Manual de usuario actualizado (2026-10-12, en el PR del rediseño) — C.
- [x] Subir el rediseño con las tres auditorías (PR #532, en producción desde 2026-10-12) — C.

**Imágenes**
- [x] Instagram por Composio con imagen del Director Creativo: PR #535, generador activo para Lorena y verificado con un post real (2026-10-12) — M + C.
- [x] Activar el prompt nuevo del Director Creativo: `apply-director-prompt.yml` modo reemplazar ejecutado (2026-10-12); respaldo en `ai_social_image_prompt_backup` (`mode=restaurar` lo devuelve); verificado con imágenes reales de Instagram y Pinterest — M + C.

## B. Importantes (primera semana tras salir)
- [x] Google Business: ya sale en ~40 s desde el worker de Redes (se dispara al pulsar Publicar) — C.
- [ ] Reutilizar una imagen IA entre redes del mismo artículo/formato y guardar el costo por imagen — C.
- [x] Instrucciones de conexión estándar: plantilla única de 6 pasos + «Si falla» para todas las redes y blogs; Bluesky en el mismo formato (2026-10-12) — C.
- [x] Unificar nombres: menú/tarjeta, «propuesta» y «Facebook» en los textos visibles (2026-10-12); los nombres internos no se cambian — C.
- [x] Formatos sin dueño: quitados de Administración carrusel, reel, infografía de Instagram y Story de Facebook (2026-10-12, decisión de Milton) — C.
- [x] Tarjeta única en el Inicio «PUBLICACIÓN EN REDES SOCIALES Y BLOGS» con META y Otras redes y blogs dentro (2026-10-12) — C.
- [x] Eliminar la ruta huérfana `generate-all` (2026-10-12) — C.
- [x] Revisión del algoritmo de generación (2026-10-12): selección con señales reales y sin repetir; corregidos el «hoy» (Florida) y los mensajes en español neutro — C.
- [ ] Worker que distinga dominio, o activar los derechos del HUB (`enforce`) — C + M.

## C. Después (no bloquea)
- [ ] Rediseño del panel de Administración (se hará en local y en un solo commit grande) — C.
- [ ] Infografía de Instagram («datos y números» vs «cero números») — EN PAUSA.
- [ ] Foto de la persona en imágenes IA — APAGADA hasta que el rostro salga idéntico.
- [ ] Imágenes para la línea MCP — O (otro programador).
- [ ] Menores: vista previa tarda ~70 s; título de pestaña «SEO TOTAL — Artículos…»; asteriscos en App Móvil; recuadro amarillo en un post antiguo de Facebook; propuestas antiguas de devto/mastodon; Tumblr usa prompt corto.

## Criterio de salida
Se abre al público cuando: (1) las 9 redes publicaron una vez con enlace y texto correctos, (2) una cuenta nueva sin aprobaciones publica en redes.lasolucionweb.com sin 403, (3) no queda correo fijo ni permiso sin comprobar, (4) la pantalla nueva está en producción con manual, (5) los registros de producción no muestran 500 en las rutas de Redes.
