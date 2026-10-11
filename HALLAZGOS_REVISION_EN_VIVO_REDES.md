# Revisión en vivo de redes.lasolucionweb.com — hallazgos (2026-10-10)

Cuenta usada: Lorena Álvarez (rol `user`). Revisión de solo lectura; no se tocó producción ni código.
Protocolo leído: COORDINACION_CLAUDE_CODEX.md (No Destrucción, capitán, tres auditorías).

## H1 — CRÍTICO — La API de Redes responde 403 a toda cuenta no administradora
- Síntoma: `/dashboard/oportunidades-redes` muestra «Todavía no tienes ninguna red conectada» y no pinta botones de redes, aunque `/dashboard/configuracion/conexiones` muestra 8 redes con ✓.
- Evidencia: `GET /api/social-opportunities` y `/generate` → 403 «Esta sección no está habilitada para tu cuenta». `/api/me` de Lorena: las 9 `allow*Publishing` en true, `moduleOverrides.oportunidades-redes = "enabled"`, `products.redes.allowed = true`.
- Causa raíz: commit `480abb4b` (2026-10-07, «enforce social account allowlist») hizo que `hasSocialModuleAccess` llame a `canSeeSocialModule`, que decide por nombre/correo (lista fija: admin, «zulmad», «lorena alvarez»). `canUseSocialModule` (`apps/web/src/lib/social-access.ts:16`) hace `select` SIN `name`, `firstName`, `lastName` ni `email`, así que la identidad queda vacía y devuelve false para todo no-admin. (`product-access.ts` sí se actualizó con esos campos; `social-access.ts` no.)
- Alcance: todas las rutas que usan `canUseSocialModule` (social-opportunities/*, search-integrations/facebook-pages, instagram, pinterest/tumblr test…).
- Arreglo propuesto (mínimo): añadir `name, firstName, lastName, email` al `select` de `canUseSocialModule` + prueba que lo cubra. Sin schema ni migración.

## H2 — DISEÑO — El permiso de Redes está atado a una lista fija de nombres
- `canSeeSocialModule` (`modules.ts:107`) reserva Redes a admin + «zulmad» + «lorena alvarez»; para cualquier otra cuenta los interruptores de Administración (módulo «Dárselo a esta cuenta» y aprobación por red) NO tienen efecto. El panel usa la misma función (`usuarios/page.tsx:2935`) y solo cambia el rótulo a «Quitárselo / Quitado». Comentado como «temporal» en el código. Decisión de Milton pendiente: ¿mantener piloto o dejar que mandan los interruptores?

## H3 — MENOR — Rutas API 404 desde pantallas de Redes
- `/api/credentials`, `/api/categories`, `/api/search-integrations/google` (en cada carga) y `/api/runs` (Progreso) devuelven 404 en el dominio redes; Progreso muestra «No hay ninguna ejecución en curso» sin distinguir error. Verificar si es el bloqueo intencional por dominio.

## H4 — MENOR
- Título de pestaña «SEO TOTAL — Artículos con IA que se publican solos» en todas las pantallas de Redes (debería decir Redes).
- App Móvil: se ven asteriscos literales (`**Compartir**`, `**"Instalar aplicación"**`).
- Actualizaciones: única entrada es de Artículos (23 ago) «Comienza aquí… Oportunidades».
- Inicio: primer pintado muestra «Elige una acción para comenzar» vacío unos segundos.
- `/api/me` se consulta en ráfagas de 3 cada ~5 s.
- Prefetch RSC con 503 intermitente (oportunidades-redes, actualizaciones).

## Pendiente de revisar
Panel de Administración con sesión de administrador (quién tiene/no tiene Redes; si cada interruptor guarda y se respeta), cada red en Conexiones, flujo de crear propuesta/publicar.


---

## Estado al 2026-10-11 (cierre del día)

### Resuelto y verificado en producción
- H1: 403 de la API de Redes a toda cuenta no administradora (PR #514).
- Redes siempre activa y todas las redes abiertas en redes.lasolucionweb.com; seototal sin cambios (PR #514 y #515).
- «Crear oportunidad» devolvía 500 por `pg_advisory_xact_lock` (void) desde 2026-10-06 (PR #516).
- El cupo diario limita publicaciones, no propuestas (PR #520): generar crea 1 por red; el cupo se comprueba al pulsar «Publicar».
- Enlaces clicables: Threads (espacio antes del enlace al recortar) y Bluesky (facets) (PR #518); verificado en posts reales.
- Texto de la IA ajustado al largo real de Bluesky/Threads (PR #519): Bluesky pasó de 365-407 a 159-196 caracteres.
- Flujo completo probado con la cuenta de Lorena: crear propuesta → vista previa → publicar → post vivo (Threads y Bluesky).
- Director Creativo de imágenes v2 basado en la guía de estilo de Lorena, materiales de marca (2 logos, 3 fotos), Pinterest con IA y diagnóstico sin publicar (PR #521-#525).

### Decisiones de Milton
- Las historias inventadas en los textos de la IA están aprobadas.
- Una sola publicación por red en las pruebas; borrar las propuestas sobrantes después de cada prueba.
- Infografía de Instagram («datos y números» vs «cero números»): EN PAUSA.
- La foto de la persona en las imágenes IA queda APAGADA (`PERSON_PHOTO_RATE = 0`): en las pruebas el rostro generado no era el de Lorena.

### Pendiente
1. **Aplicar el prompt nuevo del Director** en producción: ejecutar el workflow `apply-director-prompt.yml` con `mode=reemplazar` (guarda respaldo exacto en `ai_social_image_prompt_backup`; `mode=restaurar` lo devuelve). Aún NO ejecutado.
2. Pedidos de Milton sin iniciar: rediseñar la interfaz de Redes, separar META de las otras redes y revisar el algoritmo de generación (elección de artículo, repetición, calidad del texto).
3. Probar el resto de redes una por una (LinkedIn, Facebook, Instagram, Pinterest, Tumblr, Blogger, Google Business) y el botón «Generar propuestas para redes y blogs».
4. Revisar Administración con una sesión de administrador (cupos por red, que 0 bloquee de verdad).
5. Posibles mejoras menores: la vista previa tarda ~70 s sin aviso; título de pestaña «SEO TOTAL — Artículos…»; asteriscos sueltos en App Móvil; recuadro amarillo en la imagen de un post antiguo de Facebook (21-sep); titulares de imagen a veces sin sentido.
6. Worker (`apps/worker/src/product-access.ts`) no distingue dominio: solo importa si el interruptor de derechos del HUB pasa de «off» a «enforce».
7. Coordinación con la línea MCP (otro programador): imágenes de texto a imagen en `ai_mcp_image_config`; mis archivos de imágenes quedaron liberados.
