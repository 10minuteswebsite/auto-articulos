# FASE 0 — META: HISTORIAS Y CARRUSELES

Fecha de auditoría: 2026-10-20 (America/New_York)

## Estado de control

- Checkout: worktree administrado, actualmente detached en `c2e1e11d`.
- `origin/main`: `12f6a619`.
- No se crearon ramas ni worktrees.
- Se conserva el archivo local `MASTER_BLUEPRINT_META_HISTORIAS_CARRUSELES_REELS.md`.
- El cambio de referencia a `origin/main` fue bloqueado por permisos sobre el `.git` común; no se forzó.
- El repositorio oficial Harness-Mario no pudo descargarse: GitHub devolvió 404 para el repositorio y para `IA_JOURNEY.md`. El checkout sí contiene referencias históricas que documentan la aplicación del harness.

## Punto cero productivo comprobado

- `https://redes.lasolucionweb.net/login` → HTTP 200.
- `https://articulos.lasolucionweb.net/login` → HTTP 200.
- `https://seototal.lasolucionweb.net/login` → HTTP 200.
- `https://redes.lasolucionweb.net/api/me` sin sesión → HTTP 401.
- `https://redes.lasolucionweb.net/api/mcp` sin sesión → HTTP 401.
- No se ejecutaron autorizaciones OAuth, publicaciones reales, migraciones ni cambios de datos.

El SHA exacto del deployment productivo no pudo obtenerse desde este entorno; la documentación vigente registra `d6b0ac20000c70ee66b79cdf54ae9783b1f3da08`/`dpl_2H4BhWtbetcEkAFHUgLpBzixZZFE` como referencia productiva anterior y `origin/main` contiene documentación posterior. Antes de publicar será obligatorio resolver esta discrepancia con el deployment Vercel real.

## Auditoría del código existente

### UI y generación

- La pantalla actual agrupa META en `apps/web/src/app/dashboard/oportunidades-redes/page.tsx`.
- El botón existente llama a `/api/social-opportunities/generate`.
- La ruta ya reconoce `instagram-story`, `instagram-reel-image` e `instagram-carousel`.
- La generación actual crea oportunidades separadas por formato y respeta el historial de oportunidades previas.
- El carrusel ya intenta generar cinco imágenes, pero actualmente permite publicar con dos o más; el nuevo contrato exige cinco.

### Worker

- `apps/worker/src/socialPublish.ts` ya contiene ramas para `carousel`, `story` y `reel-image`.
- `carousel` genera cinco imágenes y publica mediante la integración directa existente.
- `story` publica una imagen vertical.
- `reel-image` adapta o genera una imagen vertical y la publica como imagen; no crea un MP4.
- No existe compositor de video ni almacenamiento de video.

### PostPeer

- `packages/shared/src/postpeer-api.ts` tipa `PostPeerPlatform` como `googlebusiness | threads`.
- El cliente actual admite únicamente `image` como media item.
- El worker usa PostPeer para Threads y Google Business; no hay contrato local para Instagram.
- PostPeer documenta publicación de Instagram Stories, Carousels y Reels, pero la implementación local debe confirmar los nombres exactos de campos, cuentas y estados antes de codificar.

### Datos

- `SocialOpportunity` contiene plataforma, texto, estado, `imageUrl`, prompt de imagen, progreso, error y publicación.
- No hay campos específicos para cinco láminas, video, duración, pista de audio, estado por destino ni costo de composición.
- La Fase 1 debe decidir si se extiende `SocialOpportunity` o se crea una entidad hija de activos; no se crea migración todavía.

## Decisiones actualizadas

1. Reutilizar la pantalla y el endpoint actuales.
2. Mantener aprobación explícita antes de publicar.
3. Mantener una sola aprobación para destinos compatibles.
4. Carrusel válido solo con cinco activos.
5. Reels quedan fuera de este lote; se buscará una alternativa independiente a PostPeer.
6. El Carrusel será editorial y multimodal: texto maquetado, iconos, capturas, diagramas, comparaciones, tarjetas, cifras solo cuando estén respaldadas y fotografías cuando aporten.
7. Reintentos deben reutilizar activos válidos y no repetir llamadas pagadas.
8. Instagram y Facebook deben tener estados independientes aunque compartan aprobación.

## Buenas prácticas incorporadas

La investigación de referencia coincide en estas reglas: una función comunicativa por lámina, portada con una promesa concreta, una idea por lámina, jerarquía tipográfica clara, alto contraste, numeración consistente y una última lámina de resumen o llamada a guardar/compartir.

Referencias consultadas:

- ContentMation: estructura educativa, jerarquía y legibilidad móvil.
- Sprout Social: consistencia de paleta, tipografía, estructura y uso educativo.
- Caroush: una tarea comunicativa por lámina, zonas de layout y revisión a tamaño real.
- EditingKaro: portada, continuidad visual entre láminas, márgenes y tamaños tipográficos.

La implementación debe producir cinco láminas 1080×1350, con texto dentro del área segura, sin párrafos diminutos y con una prueba automática de desbordamiento/contraste antes de dejar la oportunidad lista.

## Resultado de la investigación de casos y formatos

La evidencia revisada confirma que no hay que imponer un único tipo visual:

- **Solo texto/diseño:** puede funcionar cuando entrega una checklist, comparación, mito/realidad, pasos o una frase que la gente quiera guardar. El diseño debe ser deliberadamente limpio; no es texto corrido colocado sobre un fondo.
- **Solo imágenes:** funciona mejor como historia visual, antes/después, secuencia cotidiana, fotografía documental o recorrido. Cada imagen debe tener una función narrativa; si no, se percibe como álbum sin aprendizaje.
- **Mixto:** combina una imagen, captura, icono o diagrama con una explicación breve y suele ser la opción más flexible para artículos educativos.
- **Multimedia:** Instagram permite combinar fotos y videos en un carrusel, pero para este proyecto no se activará video hasta tener un publicador y una prueba de compatibilidad seguros. El audio podrá ser una decisión posterior del proveedor y no debe darse por garantizado solo porque el formato lo soporte en la aplicación.

Casos y referencias consultados:

- Un caso de guía de viaje reporta más de 50.000 visualizaciones, 90+ guardados y 48 compartidos con portada de alto contraste, mini-guía, transiciones y tipografía clara: [Fueler](https://fueler.io/srishtigupta/case-study-generating-50k-organic-reach-via-high-retention-travel-carousels).
- Una biblioteca de 243 carruseles de casos muestra el patrón resultado → problema → decisiones → lección final, normalmente con ocho láminas: [Top Carousels](https://topcarousels.com/carousel-examples/case-study).
- Sprout Social documenta ejemplos de tutoriales, historias de clientes y secuencias paso a paso; menciona a Frank Body como ejemplo de uso secuencial: [Sprout Social](https://sproutsocial.com/insights/instagram-carousel/).
- Un análisis de 10.743 carruseles encontró que los carruseles de imágenes pueden superar a los que mezclan video, lo que respalda no añadir video por obligación: [Novitckii](https://www.novitckii.com/resources/viral-carousels/).
- Otro experimento comparó el mismo contenido comprimido en una sola imagen contra un carrusel y observó menos likes pero más guardados y vida útil más larga para el carrusel: [Reddit case study](https://www.reddit.com/r/InstagramMarketing/comments/1rlpi77/i_posted_the_same_content_as_a_carousel_and_as_a_single_image_to_see_which_one_the_algorithm_liked_the_gap_surprised_me/).

### Numeración

La numeración es recomendable porque crea progreso visible y ayuda a que cada lámina tenga un papel. El sistema debe usar `01/05`, `02/05`, etc., en una posición fija y discreta. No debe convertirse en el elemento dominante de la lámina 1 ni sustituir un buen titular.

### Decisión final del producto

La IA elegirá aleatoriamente entre solo texto, solo imágenes o mezcla, pero dentro de una familia coherente con el tema. La aleatoriedad no será completamente libre: estará limitada por reglas de legibilidad, contraste, continuidad, numeración, carga de texto y evidencia disponible en el artículo.

## Identidad visual derivada del logo

Cuando la persona haya cargado un logo, el archivo será una **referencia de identidad visual**, no una obligación de colocación. El sistema analizará sus colores, tipografías aparentes, formas, contraste, tono y personalidad para construir la paleta, la jerarquía y los estilos de las láminas. El logo puede no aparecer en ninguna lámina. Nunca se deformará, redibujará ni se usará como sustituto del diseño.

## Tamaños de salida

- **Carrusel de Instagram:** 1080 × 1350 px, relación 4:5, todas las láminas con el mismo tamaño y orientación.
- **Historia de Instagram:** 1080 × 1920 px, relación 9:16.
- Los textos importantes deben permanecer dentro de un área segura con margen suficiente para evitar recortes de la interfaz de Instagram.

### Regla obligatoria de texto visible

Ninguna lámina podrá pasar a revisión si un texto está cortado, desbordado, fuera del área segura, oculto por una imagen, con contraste insuficiente o reducido a un tamaño ilegible. El renderizador debe medir el bloque final, detectar overflow y rechazar/regenerar la composición antes de crear la oportunidad. La revisión a tamaño móvil será parte de la validación automática.

## Familias de diseño que sí se pueden ejecutar

1. **Editorial de revista:** portada con titular grande, etiqueta de sección, numeración, reglas finas y una lámina final de resumen.
2. **Problema → solución:** primera lámina con dolor concreto, tres láminas con pasos o decisiones, quinta con síntesis y CTA.
3. **Comparación:** dos columnas, antes/después, error/corrección o mito/realidad; funciona bien cuando el artículo contiene contraste.
4. **Checklist:** una acción por lámina, casilla o icono consistente, texto breve y final guardable.
5. **Captura + explicación:** captura o recorte visual de apoyo, acompañada por un bloque textual grande y legible; no usar la imagen como relleno.
6. **Tira continua:** fondo o ilustración que cruza los cinco cortes para incentivar el desplazamiento.

No se copiarán plantillas de terceros. Se implementará un sistema propio de layout con tokens de tipografía, color, márgenes, contraste y espaciado.

## Riesgos que bloquean una implementación ciega

- No se puede inventar el contrato de PostPeer para Instagram.
- No se puede asumir que el API permita audio en Stories/Carruseles del mismo modo que un archivo local.
- No existe aún una dependencia de composición MP4 en el worker.
- La referencia exacta de producción no está disponible desde este entorno.
- El checkout no puede cambiar de referencia por el lock del worktree común.

## Siguiente lote autorizado

Antes de modificar el worker de publicación:

1. Resolver la versión productiva exacta.
2. Obtener y guardar la documentación/contrato real de PostPeer para Instagram.
3. Definir el modelo de activos y la estrategia de almacenamiento.
4. Definir el motor de maquetación de imágenes y la prueba de legibilidad.
5. Añadir pruebas de contrato y de guardia de tokens.
6. Implementar primero el Carrusel editorial y validar cinco láminas.
7. Buscar en paralelo una alternativa de publicación para Reels, como proyecto separado.

**No deberá escribirse código de publicación META nuevo hasta cerrar estas decisiones.**
