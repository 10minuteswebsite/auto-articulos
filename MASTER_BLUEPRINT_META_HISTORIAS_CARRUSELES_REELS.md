# MASTER BLUEPRINT — Historias y Carruseles para META

## Documento maestro del proyecto

**Producto:** SEO Total Redes
**Superficie:** `redes.lasolucionweb.net`
**Área:** Panel META
**Estado:** Especificación para Fase 0; no autoriza todavía escribir código.

## Propósito

Definir la ampliación del sistema actual de oportunidades de Redes para que, desde el panel META, el usuario pueda generar oportunidades de Instagram de tipo Historia y Carrusel, manteniendo exactamente el flujo que ya existe. Los Reels quedan fuera de este lote mientras se busca una alternativa a PostPeer.

1. El usuario pulsa el botón para crear oportunidades.
2. El sistema selecciona el contexto y genera la propuesta.
3. La persona revisa la oportunidad.
4. La persona aprueba o descarta.
5. Una sola aprobación autoriza la publicación en las plataformas compatibles.
6. El sistema publica en Instagram y, cuando Meta lo permita, también en Facebook.
7. El Historial registra resultado, formato, audio, archivos usados, destino y errores claros.

## Rol que debe asumir Codex

Codex deberá actuar como arquitecto, implementador y verificador del sistema existente. Debe respetar la coordinación vigente, `CURRENT_STATE.md`, `BASELINE.md`, `CUIDADO_DE_TOKENS.md` y las decisiones productivas ya publicadas.

No deberá cambiar el puente del HUB, el logout, los callbacks OAuth ni la separación por host salvo que una evidencia directa de esta funcionalidad lo haga indispensable.

## Filosofía del producto

- La experiencia debe sentirse igual a las oportunidades actuales de Redes.
- La complejidad de formato, música, animación y compatibilidad debe quedar detrás del sistema.
- El usuario no debe elegir música ni configurar parámetros técnicos.
- La IA decide según el tema, el tono y el formato, pero no puede disparar gasto sin límites.
- La publicación nunca debe ocurrir antes de la aprobación explícita.
- El fallo de un destino no debe impedir publicar otro destino compatible.
- El producto debe preferir composición de bajo costo sobre generación de video con IA.

## Visión y objetivo

Convertir cada tema aprobado en una pieza social adecuada para META: una Historia vertical o un Carrusel editorial de cinco láminas, con adaptación automática, audio opcional y publicación segura.

## Alcance funcional

### Incluido

- Creación desde el botón existente de oportunidades.
- Integración dentro del grupo **META**.
- Instagram Historia.
- Instagram Carrusel de exactamente cinco láminas por defecto.
- Música o sonido opcional decidido automáticamente.
- Animación ligera de imágenes existentes.
- Publicación simultánea en Instagram y Facebook cuando sea compatible.
- Revisión, aprobación, descarte, reintento e historial usando los patrones actuales.
- Controles de créditos, límites, idempotencia y recuperación.

### Fuera del primer alcance

- Video generativo complejo de personas o escenas.
- Animación facial o movimiento realista generado por IA.
- Editor manual de video para usuarios.
- Elección manual de canciones por parte del usuario.
- Biblioteca de audio visible para usuarios normales.
- Nuevas conexiones OAuth o cambios de proveedor.

## Usuarios y permisos

- **Usuario autorizado de Redes:** genera, revisa, aprueba, descarta y reintenta sus oportunidades según sus límites.
- **Administrador:** administra límites, prompts, biblioteca de audio, pistas activas, reglas de compatibilidad y auditoría.
- **Worker:** genera los activos pendientes y publica únicamente oportunidades aprobadas.

Los derechos deben comprobarse en API y worker, no solo en la interfaz. La separación de productos por host se conserva: esta funcionalidad pertenece a Redes.

## Flujo de usuario

### Generación

1. El usuario entra en **META**.
2. Pulsa el botón existente de creación de oportunidades.
3. El sistema conserva la banda de progreso, contador y protección contra doble envío.
4. La IA selecciona el artículo o contexto según el algoritmo actual.
5. Se crean oportunidades de Historia, Carrusel y Reel de acuerdo con el cupo vigente y las reglas de no repetición.
6. La oportunidad queda pendiente; generar no publica.

### Revisión

La tarjeta debe mostrar el formato, texto, estado, destino previsto y una vista previa cuando el activo esté disponible. No debe exponer al usuario el nombre técnico del modelo, el prompt, el proveedor de audio ni decisiones internas.

### Aprobación y publicación

1. El usuario aprueba la oportunidad una sola vez.
2. El sistema intenta Instagram.
3. Intenta Facebook solo si la cuenta Meta está conectada y el formato es compatible.
4. Un resultado exitoso y otro omitido o fallido deben quedar separados en el historial.
5. Si Facebook no admite la pieza, Instagram no se bloquea.

## Formatos y composición

### Tamaños estándar

- Carrusel de Instagram: 1080 × 1350 px, relación 4:5. Las cinco láminas deben compartir exactamente estas dimensiones.
- Historia de Instagram: 1080 × 1920 px, relación 9:16.
- Los elementos importantes deben permanecer dentro del área segura para que la interfaz de Instagram no tape ni recorte texto.

### Historia

- Canvas vertical 9:16.
- Imagen o video corto.
- Movimiento ligero opcional: zoom in/out, paneo, desplazamiento, parallax simple o transición.
- Duración corta y automática.
- Sonido opcional decidido por la IA.

### Carrusel

- Cinco láminas.
- 1080 × 1350 px por lámina, relación 4:5.
- Cada lámina debe ser legible por separado y formar una secuencia coherente.
- La imagen y el texto deben derivarse del mismo tema.
- Sonido opcional decidido por la IA cuando el canal lo admita.
- El sistema debe validar que existan cinco activos válidos antes de aprobar la publicación.

### Uso del logo como referencia

Si existe un logo cargado por la persona, el sistema debe analizar sus colores, letras, formas, contraste y personalidad para derivar la identidad visual del Carrusel o la Historia. El logo no tiene que aparecer dentro de la pieza. Puede omitirse por completo; lo obligatorio es que el diseño resultante sea coherente con su identidad. El archivo original no se deforma ni se redibuja.

### Reel

- Video MP4 o MOV real, no solo una portada estática.
- Formato vertical 9:16.
- Duración automática recomendada: aproximadamente 8–15 segundos.
- Puede repetir o cerrar en bucle si hay pocas escenas.
- Composición económica a partir de imágenes: zoom, paneo, movimiento lento, transiciones y audio.
- La portada puede reutilizar una imagen generada.
- El Reel generativo queda fuera del MVP por costo y riesgo de tokens.

PostPeer soporta la publicación de Reels, pero requiere video compatible. El sistema actual tiene `reel-image`, que debe considerarse una base visual, no una implementación completa de Reel.

## Inteligencia artificial

La IA podrá decidir, sin mostrar controles técnicos al usuario:

- Si el tono requiere Historia, Carrusel, Reel o más de un formato.
- Si el movimiento aporta valor.
- Qué tipo de animación económica usar.
- Si usar música, sonido ambiente o silencio.
- Qué pista autorizada encaja con el tema.
- Cómo adaptar copy y texto para Instagram y Facebook.

Regla crítica: la IA no puede generar video generativo ni llamar a un modelo pagado adicional sin pasar por el guard de créditos, límites diarios, idempotencia y registro de costo.

## Biblioteca de audio

- Administrada solo por usuarios administradores.
- Pistas precargadas y reutilizables.
- Debe registrar licencia, fuente, duración, formato, estado activo y etiquetas de tono.
- La IA selecciona internamente la pista.
- El usuario normal no ve selector ni biblioteca.
- El historial interno debe guardar la pista utilizada para auditoría.
- Si no existe una pista adecuada, se publica sin sonido.

Preferencias iniciales: piano clásico o instrumental suave para contenido educativo, reflexivo o inspirador; música instrumental más dinámica para temas de energía; silencio cuando el audio pueda distraer o no sea compatible.

## Arquitectura funcional propuesta

1. **UI META:** reutilizar la pantalla y botón actuales de oportunidades.
2. **Generador de oportunidades:** ampliar los formatos válidos sin crear un flujo paralelo.
3. **Orquestador de activos:** producir imagen, cinco láminas o video compuesto.
4. **Selector de audio:** seleccionar solo una pista autorizada o silencio.
5. **Compositor de video:** crear MP4 con movimiento barato y límites de duración/tamaño.
6. **Publicador META:** adaptar el activo a Instagram/Facebook y usar PostPeer donde corresponda.
7. **Historial:** mostrar estados por destino y guardar metadatos internos.
8. **Guard de créditos:** impedir consumo inesperado y proteger reintentos.

## Modelo de datos conceptual

Codex debe intentar extender el modelo actual, especialmente `SocialOpportunity`, sin duplicar entidades innecesarias.

Campos conceptuales que deben existir o derivarse:

- `format`: `story`, `carousel`, `reel`.
- `assetType`: `image`, `image_set`, `video`.
- `assetUrls`: URL de imagen, cinco URLs o video final.
- `coverUrl` para Reel.
- `audioTrackId` o estado explícito `none`.
- `audioDecisionReason` interno.
- `animationProfile` interno.
- `durationSeconds`.
- `slideCount`.
- Estado independiente por destino: Instagram y Facebook.
- `generationCost` y fuente del costo.
- `generationAttempts` e idempotency key.
- Motivo de incompatibilidad o omisión por destino.

La Fase 0 debe confirmar si estos datos caben en `SocialOpportunity`, en una tabla hija de activos o en una combinación mínima. No se debe migrar hasta justificarlo.

## Reglas de negocio

- Crear oportunidades no publica.
- Aprobar una vez autoriza todos los destinos compatibles.
- No duplicar una oportunidad equivalente pendiente, aprobada o publicada.
- No repetir artículos dentro de la ventana definida por el algoritmo actual.
- Carrusel: cinco láminas válidas o no se puede publicar.
- Reel: video real, duración y tamaño válidos o no se puede publicar.
- Historia: usar movimiento solo cuando aporte al tema y sea seguro producirlo.
- Música: nunca usar una pista sin licencia registrada.
- Si un formato no es compatible con Facebook, publicar Instagram y registrar Facebook como omitido.
- Reintentar no debe generar otra imagen o video pagado si el activo existente sigue siendo válido.
- Toda acción debe respetar cupos, permisos y límites actuales.

## Seguridad, privacidad y tokens

- Seguir `CUIDADO_DE_TOKENS.md` antes de modificar llamadas pagadas.
- Prohibir cascadas silenciosas de modelos pagados.
- Registrar cada llamada y costo de generación.
- Reutilizar activos válidos durante reintentos.
- Usar locks o reclamación atómica del job.
- No publicar automáticamente por el mero hecho de generar.
- No mostrar prompts, tokens, URLs privadas ni errores técnicos al usuario.
- Mantener errores traducidos y accionables.
- Proteger los archivos generados con URLs públicas solo cuando el proveedor lo requiera.

## APIs e integraciones

La Fase 0 debe auditar y reutilizar:

- `/api/social-opportunities/generate`.
- `/api/social-opportunities`.
- `/api/social-opportunities/publish`.
- `/api/social-opportunities/cancel`.
- `apps/worker/src/socialPublish.ts`.
- `apps/worker/src/aiImageGenerator.ts`.
- Integración PostPeer de Instagram y Facebook.
- Persistencia actual de historial y eventos.

No se deben crear nuevas rutas si el contrato actual puede ampliarse de forma compatible.

## UX y accesibilidad

- Mantener la pantalla META, sus tarjetas y el botón existente.
- Mantener la banda azul de progreso.
- Mostrar etiquetas claras: Historia, Carrusel, Reel.
- Mostrar una vista previa útil, sin convertirla en un editor complejo.
- Indicar si el destino Facebook fue publicado, omitido o falló.
- En móvil, mantener tarjetas y acciones fáciles de pulsar.
- No mostrar al usuario la selección de música ni parámetros de IA.

## Historial y auditoría

El historial debe conservar:

- Artículo o fuente.
- Formato.
- Fecha de generación y publicación.
- Destino por plataforma.
- URLs finales cuando existan.
- Estado de cada destino.
- Audio usado o silencio.
- Número de láminas.
- Duración del Reel.
- Motivo de error u omisión en español claro.
- Reintentos y reutilización de activos.
- Consumo de créditos.

## Fase 0 obligatoria antes de programar

Antes de escribir una sola línea de código, Codex debe entregar para aprobación:

- Arquitectura completa.
- Stack tecnológico.
- Modelo de datos.
- Flujos de usuario.
- Mapa de navegación.
- Estructura de carpetas.
- Roadmap por fases.
- Riesgos técnicos.
- Propuestas de mejora.
- Auditoría del flujo actual de generación y publicación.
- Confirmación de capacidades reales de PostPeer para Historia, Carrusel y Reel.
- Prueba de que el compositor MP4 no necesita generación de video pagada.
- Plan de pruebas de no consumo de tokens.

**No deberá escribirse una sola línea de código hasta que esta fase haya sido revisada y aprobada.**

## Roadmap sugerido

### Fase 1 — Contrato y seguridad

- Auditar contratos actuales.
- Definir formatos, estados y compatibilidad.
- Añadir guards de costos, locks e idempotencia.
- Confirmar límites de PostPeer.

### Fase 2 — Historia y Carrusel

- Integrar Historia en el flujo actual.
- Generar cinco láminas.
- Añadir audio transparente y biblioteca administrable.
- Reutilizar imágenes en reintentos.

### Fase 3 — Compositor de Reel

- Crear MP4 a partir de imágenes.
- Aplicar zoom, paneo, transiciones y loop.
- Validar formato, audio, duración y tamaño.
- Publicar con PostPeer.

### Fase 4 — Publicación simultánea META

- Intentar Instagram y Facebook con una aprobación.
- Manejar incompatibilidad por destino.
- Historial independiente por plataforma.

### Fase 5 — Pruebas productivas controladas

- Probar sin publicar piezas sobrantes.
- Confirmar una publicación real por formato con autorización.
- Verificar costos, reintentos, enlaces e historial.
- No abrir el flujo a todos hasta superar las auditorías.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Reels requieren video real | Compositor MP4 determinista a partir de imágenes |
| Costo inesperado de IA | Guard de créditos, límites, registro y reutilización |
| Música con copyright | Biblioteca administrada con licencia registrada |
| Facebook no admite el formato | Publicación independiente por destino |
| Carrusel incompleto | Validación obligatoria de cinco láminas |
| Reintentos duplican costos | Reutilización de activos e idempotencia |
| Worker publica sin aprobación | Guard explícito de estado aprobado |
| Usuario ve errores técnicos | Traductor único de errores y mensajes claros |
| Cambios rompen Redes actual | Extender contratos existentes y pruebas de regresión |

## Criterios de aceptación

1. El usuario crea oportunidades desde el botón actual del panel META.
2. La generación no publica por sí sola.
3. El flujo de aprobación es el mismo que el de Redes actual.
4. Se genera un Carrusel de cinco láminas válidas.
5. Se genera una Historia vertical válida.
6. Se genera un Reel MP4 real, no únicamente una imagen de portada.
7. El Reel puede usar movimiento ligero y repetición limpia.
8. El audio es opcional y lo decide la IA sin intervención del usuario.
9. No se usa música sin licencia registrada.
10. Facebook se intenta simultáneamente cuando es compatible.
11. Una incompatibilidad de Facebook no bloquea Instagram.
12. Los estados de Instagram y Facebook aparecen separados en el historial.
13. Los reintentos reutilizan activos válidos y no generan gasto duplicado.
14. La generación respeta derechos, cupos y permisos en API y worker.
15. No hay publicación sin aprobación explícita.
16. Las pruebas demuestran que una pieza puede generarse sin video generativo pagado.
17. Las pruebas productivas no dejan publicaciones sobrantes.
18. La experiencia no expone proveedores, prompts, modelos ni decisiones técnicas.

## Instrucciones finales antes de escribir código

Codex debe comenzar por la Fase 0 y presentar sus decisiones para aprobación. Debe leer nuevamente los documentos de coordinación vigentes y verificar producción como verdad funcional. No debe crear una implementación paralela ni cambiar conexiones, OAuth, HUB, permisos globales o dominios sin una justificación específica y aprobación.

La primera implementación debe priorizar seguridad de tokens, compatibilidad con el flujo actual y publicación controlada. Los Reels generativos quedan fuera hasta que exista una decisión separada sobre costo, proveedor y límites.
