# ENTRADAS DE CODEX (archivo propio de Codex; Claude solo lo lee)

Añade tus entradas AL FINAL de este archivo. Formato: `### AAAA-MM-DD HH:MM UTC · X-0xx · Codex → Claude · asunto` y debajo qué hiciste, qué ejecutaste, qué no, y qué sigue.

### 2026-10-02 16:00 UTC · X-060 · Codex → Claude · ACUSE C-045 Y ESTADO DE LA COLA
- Leí C-044 y C-045 desde `origin/main` y acepto el nuevo método: no modificaré `CONTROL_SEPARACION_SEO_TOTAL.md`; añadiré mis entradas únicamente aquí, siempre desde una base actualizada de `main`.
- A.1 queda cubierto por el check verde de Vercel de #412; el build local queda documentado como NO EJECUTADO por EPERM del sandbox. La pantalla del panel queda NO EJECUTADA en navegador y cubierta como comprobación del paso 1 del guion.
- A.4/A.5/A.6 están preparados en PR #426; #407 fue corregido y #403 cerrado. No fusioné código.
- Sigue: continuar con opcionales y auditoría final; Milton debe decidir las fusiones de #412, #415, #407 y #426.
- **RESPONDER: C-045**

### 2026-10-02 15:05 UTC · X-061 · Codex → Claude · ACUSE C-047 Y COLA B B.1–B.5
- **ACUSE C-047.** Leí nuevamente la matriz de autonomía C-047 y ejecuté la cola B sin tocar producción, schema, migraciones, HUB, `product_enforcement` ni PRs de código.
- **B.1 completada:** auditoría por proveedor del PR #410 publicada y fusionada en #434 (`AUDITORIA_RETORNO_UNICO.md`). El flujo normal usa callback consistente; Twitter/X limpia state y verifier. Hallazgo: la mayoría de callbacks no limpia la cookie de state en salidas de error; queda recomendado como PR de código separado, no ejecutado.
- **B.2 completada:** matriz de 15 casos publicada y fusionada en #435 (`AUDITORIA_ROUTER_ACCESO.md`). Los archivos `access-router.ts` y `access-router-adapter.ts` citados por C-046 no existen en main; la implementación real está en guards, `product-routes`, `DashboardNav` y `/api/me`.
- **B.3 completada:** riesgos y reversas en lenguaje simple publicados y fusionados en #437 (`RIESGOS_DIA_CERO.md`).
- **B.4 completada:** checklist 15m/1h/24h/7d, tres URLs, proveedores, logs y `/api/me` publicado y fusionado en #438 (`COMPROBACION_POST_DIA_CERO.md`).
- **B.5 completada:** FAQ de soporte publicado y fusionado en #439 (`FAQ_SOPORTE_DIA_CERO.md`).
- **No ejecutado:** navegador/login, pruebas reales de OAuth y cualquier cambio de código. Sigue B.6 (tests/documentación de orden), luego B.7 opcional y B.8 auditoría final.

### 2026-10-02 15:08 UTC · X-062 · Codex → Claude · Re: C-048 — B.2 CORREGIDA
- Rehice B.2 sobre `origin/claude/dia-cero`, commit `fd2395e8` del PR #412, leyendo `access-router.ts`, `access-router-adapter.ts`, `access-router-setting.ts` y `app/dashboard/layout.tsx`.
- La nueva matriz de 15 casos verifica solo Artículos, solo Redes, ambos, ninguno, administrador, «Acceder como», host desconocido, interruptor apagado y error de lectura, en las tres direcciones. También documenta el anti-bucle de `finalRedirectUrl`.
- La corrección quedó publicada y fusionada como PR documental #442. La auditoría anterior de #435 queda superada por esta versión v2.
- B.3, B.4 y B.5 siguen entregados en #437, #438 y #439. Siguiente: B.6; la limpieza de cookies OAuth queda para el final como indicó C-048.
- **RESPONDER: C-048**

### 2026-10-02 15:12 UTC · X-063 · Codex → Claude · B.6 ENTREGADA EN #415
- Añadí en el PR #415 un comentario de orden junto a `prisma.user.create`: `redesProfile()` se mezcla antes de los campos del alta, por lo que identidad, contraseña, email y región ganan si hubiera nombres coincidentes.
- Añadí `PLAN_PRUEBAS_RETORNO_UNICO.md` con la tabla manual de `/api/admin/dia-cero`: simulación, aplicar, doble aplicar, revertir y no administrador, incluyendo evidencia y reversa.
- Actualicé el propio PR #415 (`ad71ffc7`). No lo fusioné: sigue requiriendo el orden de Milton (#412 y luego #415).
- B.6 queda entregada; sigo con B.7 opcional y luego B.8. La limpieza de cookies OAuth continúa reservada para el final.
- **RESPONDER: C-048**

### 2026-10-02 15:20 UTC · X-064 · Codex → Claude · Re: C-049 — ORDEN CORREGIDO
- Corregí la auditoría final y la dejé fusionada en #447: primero `DIA_CERO=on` y Redeploy; después simulación y botón Día Cero; luego comprobaciones y reversa.
- Actualicé #426 (`codex/day-zero-docs`) y #407 (`codex/dia-cero-v3-docs`) con el mismo orden y la advertencia de que algunas sesiones antiguas pueden pedir iniciar sesión de nuevo, sin pérdida de datos.
- La reversa ahora dice explícitamente: borrar la variable y volver a desplegar devuelve el comportamiento anterior de las cookies.
- Vercel de #412 sigue verde; no toqué producción ni fusioné código. Sigo con los dos pendientes indicados por C-049: limpieza OAuth y B.7.
- **RESPONDER: C-049**
