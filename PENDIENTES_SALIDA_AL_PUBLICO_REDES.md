# Pendientes para sacar Redes al público (2026-10-11)

Leyenda: [ ] pendiente · [x] hecho · Responsable: **M** = Milton, **C** = Claude, **O** = otro programador.

## A. Bloqueantes (sin esto NO se abre al público)

**Publicación real, red por red (una publicación por red, borrando las sobrantes)**
- [x] Threads (enlace clicable verificado).
- [x] Bluesky (enlace clicable verificado).
- [ ] LinkedIn · [ ] Facebook · [ ] Instagram · [ ] Pinterest · [ ] Tumblr · [ ] Blogger · [ ] Google Business — C, con visto bueno de M antes de cada publicación.

**Reglas de acceso y permisos**
- [x] Redes siempre activa y todas las redes abiertas en redes.lasolucionweb.com; seototal sin cambios (PR #514, #515, #528).
- [ ] Probar con una cuenta que NO sea Lorena y sin aprobaciones en Administración (hoy solo se ha probado con Lorena) — C + M (hace falta una cuenta de prueba).
- [ ] Permisos al publicar coherentes: LinkedIn y X no se comprueban; Instagram no deja pasar al administrador — C.
- [ ] Quitar el correo fijo `lorenalvarez30@gmail.com` de `generate/route.ts:496` — C.

**Pantalla de Redes (hoy solo en local, sin subir)**
- [ ] Corregir «Hoy X de N» (cuenta todos los formatos pero muestra el cupo de uno) — C.
- [ ] Vista previa: decidir quitarla o hacerla fiel a lo que se publica — M decide, C ejecuta.
- [ ] Errores de publicación visibles en la pantalla del grupo, con reintento — C.
- [ ] Pinterest: el generador pide 800 caracteres y se recorta a 500 con «...» — C.
- [ ] Manual de usuario actualizado (META/Otras redes y blogs, instrucciones y botones nuevos) en el mismo lote — C.
- [ ] Subir el rediseño con las tres auditorías: pruebas, typecheck, build y Preview verde — C; la fusión la hace M si el sistema vuelve a bloquearla.

**Imágenes**
- [ ] Activar el prompt nuevo del Director Creativo: ejecutar `apply-director-prompt.yml` con `mode=reemplazar` (guarda respaldo; `mode=restaurar` lo devuelve) y verificar con una imagen real — M ejecuta, C verifica.

## B. Importantes (primera semana tras salir)
- [ ] Unificar nombres: google-business / business-profile / googleBusiness; «Facebook Pages» vs «Facebook»; «oportunidad» vs «propuesta»; etiqueta del menú «1) PUBLICA EN REDES SOCIALES…» — C.
- [ ] Formatos sin dueño: Administración da cupos a Instagram carrusel/reel/infografía y Facebook Story que la pantalla nunca genera; Instagram crea 2 propuestas por pulsación — decidir qué formatos existen — M.
- [ ] Un solo selector de grupo (hoy el Inicio y `/dashboard/oportunidades-redes` muestran las mismas tarjetas) — C.
- [ ] Eliminar la ruta huérfana `generate-all` — C.
- [ ] Revisión del algoritmo de generación: elección del artículo, repetición entre redes, calidad y recorte del texto — C.
- [ ] Worker que distinga dominio, o activar los derechos del HUB (`enforce`) — C + M.

## C. Después (no bloquea)
- [ ] Rediseño del panel de Administración (se hará en local y en un solo commit grande) — C.
- [ ] Infografía de Instagram («datos y números» vs «cero números») — EN PAUSA.
- [ ] Foto de la persona en imágenes IA — APAGADA hasta que el rostro salga idéntico.
- [ ] Imágenes para la línea MCP — O (otro programador).
- [ ] Menores: vista previa tarda ~70 s; título de pestaña «SEO TOTAL — Artículos…»; asteriscos en App Móvil; recuadro amarillo en un post antiguo de Facebook; propuestas antiguas de devto/mastodon; Tumblr usa prompt corto.

## Criterio de salida
Se abre al público cuando: (1) las 9 redes publicaron una vez con enlace y texto correctos, (2) una cuenta nueva sin aprobaciones publica en redes.lasolucionweb.com sin 403, (3) no queda correo fijo ni permiso sin comprobar, (4) la pantalla nueva está en producción con manual, (5) los registros de producción no muestran 500 en las rutas de Redes.
