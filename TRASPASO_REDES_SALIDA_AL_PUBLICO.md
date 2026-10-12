# TRASPASO — Redes: salida al público (2026-10-11)

Mensaje para quien retome (otra sesión de Claude u otro agente). Léelo completo, después `COORDINACION_CLAUDE_CODEX.md` (bloque «LISTA VIVA») y `PENDIENTES_SALIDA_AL_PUBLICO_REDES.md`.

## Quién es Milton y cómo trabajar con él
- Habla español. Respuestas cortas, claras, sin tecnicismos innecesarios. Va **en orden, una cosa a la vez**.
- No quiere que seas proactivo en temas que no tocan ahora (el panel de Administración se hará después, en local y en un solo commit grande).
- Todo debe ser **totalmente responsivo** (escritorio, tableta, móvil táctil) y cuidar el espacio vertical entre elementos.
- Antes de cada publicación real en una red pide SU visto bueno. **Una sola publicación por red** en las pruebas y **borrar las propuestas sobrantes** después (`DELETE /api/social-opportunities?scope=pending` solo borra pendientes).
- Reglas del repositorio: worktree aislado, tres auditorías (pruebas, typecheck, build) antes de producción, reclamar capitanía (`scripts/migration-coordinator.sh claim "Claude" "motivo"`) antes de subir y liberarla al terminar, nunca `git add .`, el manual (`apps/web/src/content/manual-usuario.ts`) se actualiza en el mismo lote, declarar «Subiré a producción de acuerdo al Protocolo de No Destrucción».
- El sistema de permisos a veces bloquea `gh pr merge` («Merge Without Review»). No lo esquives: pídele a Milton que fusione con «Squash and merge» o que añada una regla de permiso para `gh pr merge`.
- Cuenta de pruebas en producción: Lorena Álvarez (redes.lasolucionweb.com, sesión abierta en el navegador de la Mac mini). No usar otros navegadores conectados.

## Qué ya está en producción (PR #514–#516, #518–#525, #528)
- Redes siempre activa y **todas las redes abiertas en redes.lasolucionweb.com**; en seototal.lasolucionweb.com Redes sigue reservada (lista piloto). Lógica en `lib/modules.ts`, `lib/social-access.ts` (`getSocialHostContext`, `openAllNetworks`, `isNetworkApprovedForPublishing`).
- El **cupo diario limita publicaciones, no propuestas**: generar crea 1 propuesta por red por pulsación; el cupo se comprueba al pulsar Publicar y el worker lo repite.
- Enlaces clicables en Threads (espacio antes del enlace al recortar) y Bluesky (facets). Textos de IA ajustados al largo real de cada red.
- «Crear propuesta» ya no da 500 (`pg_advisory_xact_lock` usaba `$queryRawUnsafe`).
- Director Creativo de imágenes v2 + diagnóstico sin publicar (`diagnose-ai-image-prompt.yml`) + aplicar/restaurar (`apply-director-prompt.yml`).
- Proveedor de imágenes en producción: `IMAGE_PROVIDER=gpt-image-2` (fal.ai, edita la foto OG + logos como referencia; Vercel Blob). La foto de la persona está APAGADA (`PERSON_PHOTO_RATE = 0`).

## Qué NO está subido (no perderlo)
Rama local `claude/redes-meta-y-admin-ux`, worktree `/Users/miltondavila/Creador de articulos/.claude/worktrees/redes-lasolucionweb-live-review-9446b3`, varios commits locales:
tarjetas META y Otras redes y blogs en el Inicio y en `/dashboard/oportunidades-redes?grupo=meta|otras`, instrucciones con cupo dinámico («por día: Instagram 2, Threads 5…»), redes como rectángulos apilados con «Hoy X de N», lista compacta de propuestas, versión móvil táctil, `redes.localhost` reconocido solo en desarrollo (`lib/product-routes.ts`), `dailyLimits` en la respuesta de `GET /api/social-opportunities/generate`, `DELETE ?platforms=`.
**Antes de subirla:** corregir «Hoy X de N», decidir la vista previa, errores visibles, recorte de Pinterest y actualizar el manual (ver lista).

## Cómo levantar el entorno local
1. `brew services start postgresql@16` (se apaga al reiniciar). Base copia: `autoarticulos_redes_ui` (usuario `miltondavila`, ya migrada).
2. `.claude/launch.json` (no se versiona) tiene la configuración `redes-ui-local` (puerto 3011). Arráncala con `preview_start`.
3. Abrir `http://redes.localhost:3011/dashboard` (dominio Redes) o `http://127.0.0.1:3011` (vista compartida). Iniciar sesión con la cuenta de prueba local que dio Milton (Lorena); pídesela de nuevo si hace falta.
4. NO tocar el servidor del puerto 3001: es de Codex. En la copia local la cuenta de prueba tiene rol `user`, Redes habilitada y cupos de ejemplo.
5. Si `npm run build` falla con «Symlink node_modules … points out of the filesystem root», es por usar un worktree con `node_modules` enlazado; el build real lo hace el Preview de Vercel.

## Qué hacer ahora, en orden
1. Seguir la lista **A** de `PENDIENTES_SALIDA_AL_PUBLICO_REDES.md`: empezar por publicar en LinkedIn (una propuesta, con visto bueno de Milton), luego Facebook, Instagram, Pinterest, Tumblr, Blogger y Google Business; verificar el resultado abriendo el post.
2. Preguntar a Milton: ¿quitamos la vista previa (recomendado ahora) o la hacemos fiel? ¿tiene una cuenta de prueba distinta a Lorena?
3. Pedir a Milton que ejecute `apply-director-prompt.yml` con `mode=reemplazar` (activa el prompt nuevo; `mode=restaurar` lo devuelve).
4. Terminar la pantalla de Redes en local, actualizar el manual y subirla con las tres auditorías.

## Datos técnicos útiles
- Auditoría de inconsistencias con archivo y línea: `AUDITORIA_REDES_2026-10-11.md`.
- Otro programador trabaja la línea MCP (imágenes de texto a imagen en `ai_mcp_image_config`). No tocar `aiImageGenerator.ts`, `socialPublish.ts` ni `directorPromptV2.ts` sin coordinar; ya están liberados pero parte de `origin/main`.
- Infografía de Instagram (conflicto «datos y números» vs «cero números»): EN PAUSA por decisión de Milton.
