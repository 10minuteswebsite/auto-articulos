# CUIDADO DE TOKENS — reglas para que el gasto rinda

Orden de Milton (2026-10-16): los tokens y créditos de PostPeer, Composio, imágenes (OpenAI y fal.ai) y OpenAI se piden **solo en el momento preciso y no se juega con ellos**. Este documento es de lectura obligatoria antes de agregar o cambiar cualquier llamada de pago. La prueba `apps/worker/src/paidApiGuard.test.ts` falla si aparece una llamada de pago nueva sin registrarse aquí.

## Las 8 reglas

1. **Una llamada de pago por acción real.** Nunca dentro de un bucle de reintentos, de un `Promise.all` sobre la misma cosa ni de un sondeo (polling).
2. **Reservar antes de gastar.** Se marca el registro en la base con una actualización atómica (`updateMany` con la condición del estado anterior) y solo quien gana la reserva llama a la API. Así tres workers a la vez no duplican.
3. **Idempotencia siempre que la API la ofrezca.** PostPeer recibe `idempotencyKey`; la clave debe ser estable para el mismo contenido.
4. **Guardar lo comprado en cuanto llega.** Una imagen generada se guarda (URL y prompt) antes del siguiente paso que pueda fallar; un reintento la reutiliza y no la paga otra vez.
5. **Un fallo no dispara otro cobro solo.** Un error deja el registro en error; solo una persona lo reintenta. Ningún proceso automático reenvía lo fallido.
6. **Sin cascadas de modelos pagados.** Si hay modelo de respaldo, se usa solo ante un rechazo explícito de la API (no ante un fallo local como descargar el logo) y se registra cuál se usó.
7. **Lo barato primero y lo mínimo necesario.** No pedir imagen IA si ya existe la imagen del artículo y la cuenta no tiene IA activa; no pedir un texto a OpenAI si ya hay uno guardado.
8. **Sin pruebas en vivo que gasten sin permiso.** Una prueba que publique o genere imagen real se hace con una sola propuesta, con orden de Milton, y se anota.

## Inventario de llamadas de pago (auditado 2026-10-16)

| Servicio | Dónde | Estado |
| --- | --- | --- |
| PostPeer (publicar) | `apps/worker/src/businessProfilePublish.ts`, `apps/worker/src/socialPublish.ts` (Threads) | SEGURO en Google Business: reserva atómica + clave de idempotencia + sin reintentos. Threads: una llamada; no se auditó a fondo. |
| PostPeer (conectar/probar) | `packages/shared/src/postpeer-api.ts` | Solo al conectar o probar una cuenta. |
| Composio | `apps/web/src/lib/composio.ts`, `packages/shared/src/composio.ts` y usos del worker | PENDIENTE de auditar el conteo de llamadas por publicación. |
| Imágenes OpenAI | `packages/shared/src/social-image.ts`, `apps/worker/src/socialPublish.ts`, `apps/worker/src/threadsIndexing.ts`, `apps/worker/src/aiImageGenerator.ts` | RIESGOS R1 y R2 abajo. |
| Imágenes fal.ai | `apps/worker/src/aiImageGenerator.ts` | PENDIENTE de auditar la cadena de respaldo. |
| Texto OpenAI | `apps/web/src/app/api/assistant/chat/route.ts`, `apps/web/src/app/api/social-opportunities/generate/route.ts`, `apps/web/src/lib/opportunity-analysis.ts`, `apps/web/src/lib/title-generation.ts`, `apps/worker/src/automation/generateCustomArticle.ts`, `apps/worker/src/businessProfilePublish.ts`, `apps/worker/src/faqPrompt.ts`, `apps/worker/src/imagePrompt.ts`, `apps/worker/src/translateText.ts` | Costo bajo por llamada; sin auditar bucles. |

## Riesgos de doble gasto conocidos (NO corregidos todavía)

- **R1 — imagen IA que se paga otra vez en un reintento.** En `socialPublish.ts` la imagen IA de Instagram se genera antes de publicar y `imageUrl`/`aiImagePrompt` solo se guardan cuando la publicación sale bien. Si Meta o Composio fallan después de generarla, la imagen se pierde y el reintento la vuelve a pagar. Arreglo propuesto: guardar `imageUrl` + `aiImagePrompt` en la propuesta al generarla y reutilizarla si `aiImagePrompt` ya existe (regla 4).
- **R2 — cascada de hasta 3 modelos pagados.** `packages/shared/src/social-image.ts` prueba `gpt-image-1` con logo, `gpt-image-1` sin logo y `dall-e-3`; un fallo local (no se pudo bajar el logo) también salta al siguiente. Arreglo propuesto: distinguir rechazo de la API de fallo local y registrar el modelo usado (regla 6).

## Cómo agregar una llamada de pago nueva

1. Léete estas reglas. 2. Agrega la fila en el inventario. 3. Agrega el archivo a `PAID_API_FILES` en la prueba guardiana. 4. Anota el cambio en `COORDINACION_CLAUDE_CODEX.md`.
