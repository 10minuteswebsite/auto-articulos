# Canal de preguntas y respuestas — Transferencia BLOG IA

Estado: activo para la transferencia local  
Fecha de apertura: 2026-10-21  
Responsable de responder: Codex

**Aviso:** este archivo queda como historial del worktree. El canal compartido entre sesiones es `/Users/miltondavila/Creador de articulos/.claude_shared/BLOG_IA_COMUNICACION_CLAUDE_CODEX.md`.

## Cómo usar este documento

Claude debe escribir aquí cualquier pregunta, bloqueo o ambigüedad que pueda resolverse con el contexto ya disponible, sin detener el trabajo por preguntas innecesarias.

Formato obligatorio para cada entrada nueva:

```md
## PREGUNTA [número] — [fecha/hora]
- Estado: ABIERTA
- Contexto:
- Pregunta:
- Archivos o decisión afectada:
```

Codex revisará periódicamente este archivo. Cuando exista suficiente información, añadirá debajo:

```md
### RESPUESTA DE CODEX
- Estado: RESPONDIDA
- Respuesta:
- Acción autorizada:
- Evidencia:
```

Claude debe continuar con trabajo seguro mientras una pregunta está abierta. Solo debe detenerse si la decisión cambia materialmente el producto, puede causar una migración irreversible, afecta credenciales/secretos, modifica producción o puede perder trabajo ajeno.

## Respuestas permanentes ya conocidas

### PREGUNTA PREVIA — ¿Dónde está el estado completo?

Respuesta: leer `TRANSFERENCIA_CLAUDE_BLOG_IA_2026-10-21.md`, después `PROMPT_CLAUDE_CONTINUACION_BLOG_IA.md`, `TRASPASO_BLOG_IA.md` y `AUDITORIA_BLOG_IA_FASE_0.md`. Luego aplicar Harness-Mario y leer los documentos canónicos de `main`.

### PREGUNTA PREVIA — ¿Está BLOG IA en producción?

Respuesta: no. El núcleo y la integración están validados localmente, pero no hay Worker, D1, R2, Custom Hostnames, dominio de prueba ni E2E productivo BLOG IA confirmado.

### PREGUNTA PREVIA — ¿Qué fase sigue?

Respuesta: Fase 2 local: wizard de configuración de BLOG IA, estados de dominio/suscripción, marca, idioma, WhatsApp, permisos y pruebas de aislamiento.

### PREGUNTA PREVIA — ¿Qué pruebas deben seguir pasando?

Respuesta:

- Web: typecheck y 219/219 pruebas.
- BLOG IA: typecheck y 44/44 pruebas.
- `git diff --check`.

### PREGUNTA PREVIA — ¿Puede volver automáticamente a BROWSER?

Respuesta: no asumirlo. La decisión registrada es BLOG IA únicamente cuando `publishMethod === BLOG`; el comportamiento al desactivar BLOG IA debe documentarse y aprobarse antes de implementarlo.

### PREGUNTA PREVIA — ¿Se puede inventar un proveedor de pagos o billing?

Respuesta: no. El repositorio actual tiene `ProductEntitlement`; no se debe inventar Stripe ni otro proveedor. Si falta un flujo real, documentarlo como pendiente.

### PREGUNTA PREVIA — ¿Dónde está el blueprint?

Respuesta: el traspaso referencia `MASTER_BLUEPRINT_BLOG_IA_SEO_TOTAL.md` y el archivo original entregado por Milton fue `BLUEPRINT_BLOG_IA_SEO_TOTAL.md`. No se encontró una copia en el checkout actual. Claude debe buscar la copia durable en GitHub/archivo seguro y, mientras tanto, usar las decisiones explícitas de `TRASPASO_BLOG_IA.md` sin inventar requisitos.

## Registro

No hay preguntas nuevas pendientes al abrir este canal.
