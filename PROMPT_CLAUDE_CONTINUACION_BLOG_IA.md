# Prompt de continuación para Claude Code — BLOG IA

Lee primero, en este orden:

1. `TRANSFERENCIA_CLAUDE_BLOG_IA_2026-10-21.md`
2. `TRASPASO_BLOG_IA.md`
3. `AUDITORIA_BLOG_IA_FASE_0.md`
4. `https://github.com/10minuteswebsite/Harness-Mario`
5. `IA_JOURNEY.md`
6. `.ai/standards/INDICE_ESTANDARES.md`
7. `CURRENT_STATE.md`
8. `BASELINE.md`
9. `CHECKPOINTS.md`
10. `CONTROLADOR_DE_VERSIONES.md`
11. `CEREBRO.md`
12. `INVENTARIO_CONVERSACIONES.md`
13. el documento vigente de Coordinación

## Misión

Continúa el proyecto BLOG IA de SEO Total desde el estado local documentado. El núcleo local ya está implementado y validado. Tu siguiente objetivo es completar la Fase 2 local: wizard de configuración de BLOG IA, sin publicar nada todavía.

## Reglas obligatorias

- Producción es la verdad funcional.
- GitHub es la memoria durable.
- `main` es la única rama publicable.
- No crees ramas ni worktrees nuevos.
- No toques producción durante esta fase local.
- No borres, resetees ni sobrescribas cambios ajenos.
- No uses `git add .` ni `git add -A`.
- No cambies el publisher BROWSER existente salvo que exista evidencia específica y documentada.
- BLOG IA no debe publicar en paralelo a 10minutesWebsite cuando `publishMethod === BLOG`.
- No declares terminado el proyecto por tener solo typecheck o pruebas locales.
- Si falta una decisión material, documenta el bloqueo y continúa con lo que sí sea seguro.

## Estado que debes aceptar como hecho

- BLOG IA local: typecheck correcto y 44/44 pruebas.
- Web local: typecheck correcto y 219/219 pruebas.
- Integración local de derechos: implementada y validada mediante los tipos y suites locales.
- La API bloquea publicaciones durante suspensión con 503 reintentable.
- La reactivación permite publicar sin duplicar.
- Cloudflare, D1, R2, Custom Hostnames, dominio real y propiedades externas todavía no están verificados en producción.

## Trabajo inmediato

### 1. Auditoría de arranque

Antes de editar:

- ejecuta `git status --short`;
- ejecuta `git log -5 --oneline`;
- revisa si hay cambios ajenos;
- confirma qué checkout estás usando;
- no cambies de rama ni crees worktree;
- localiza el modelo `BlogIaBlog`, `PublishMethod.BLOG`, la cola y el publisher.

### 2. Diseña el wizard antes de codificar

Entrega primero un breve diseño local en la documentación:

- mapa de navegación;
- pasos del wizard;
- permisos por usuario/admin;
- endpoints;
- estados de `BlogIaBlog`;
- validaciones de hostname;
- contrato de eventos hacia BLOG IA;
- errores y recuperación;
- pruebas previstas.

No inventes una conexión de facturación ni un proveedor de pagos. El repositorio actual usa `ProductEntitlement`; si no existe un flujo real de billing, deja la integración como pendiente explícita.

### 3. Implementa el wizard local

Debe permitir, como mínimo:

1. Crear o continuar el registro BLOG IA de la cuenta.
2. Mostrar el estado actual.
3. Configurar nombre/marca, idioma y WhatsApp.
4. Introducir un hostname con validación estricta.
5. Mostrar que DNS/TLS están pendientes cuando todavía no hay verificación real.
6. No activar el blog antes de recibir confirmación de dominio/TLS.
7. Mostrar suspensión y error de forma clara.
8. Impedir que una cuenta de usuario manipule el tenant de otra.
9. Mantener todas las acciones administrativas protegidas.

Si el diseño del blueprint exige más pasos, conservarlos, pero no inventar un paso que cree un dominio real o modifique DNS sin autorización.

### 4. Pruebas

Añade pruebas para:

- usuario no autenticado;
- usuario sin acceso a Artículos;
- cuenta sin `BlogIaBlog`;
- creación idempotente;
- hostname inválido;
- hostname duplicado;
- tenant de otra cuenta;
- estado `pending_dns`;
- estado `pending_tls`;
- estado `active`;
- estado `suspended`;
- error de red hacia BLOG IA;
- reintento idempotente;
- no regresión BROWSER/MCP.

Ejecuta como mínimo:

```bash
npm run typecheck --workspace=apps/web
npm run test --workspace=apps/web
npm run typecheck --workspace=@auto-articulos/blog
npm run test --workspace=@auto-articulos/blog
git diff --check
```

## Canal obligatorio de comunicación con Codex

No uses un archivo de preguntas situado dentro de un worktree. Usa exclusivamente esta ruta absoluta compartida:

`/Users/miltondavila/Creador de articulos/.claude_shared/BLOG_IA_COMUNICACION_CLAUDE_CODEX.md`

Si aparece una pregunta o bloqueo, escríbelo allí con estado `ABIERTA`, contexto, pregunta y archivos afectados. Codex responderá en la misma entrada. No borres entradas ni esperes una respuesta para continuar con trabajo seguro.

## Criterios de aceptación de esta continuación

La Fase 2 local solo está completa si:

- el wizard funciona en local de inicio a fin;
- las rutas están protegidas;
- la creación es idempotente;
- no se puede cruzar tenant;
- los estados de dominio y suscripción se reflejan correctamente;
- las pruebas nuevas y existentes pasan;
- el typecheck pasa;
- el diff exacto fue revisado;
- la documentación de transferencia y Coordinación se actualiza;
- se registra qué queda exclusivamente pendiente de Cloudflare/producción.

## Antes de publicar cualquier cosa

Detente y vuelve a ejecutar el protocolo Harness:

1. Lee el punto cero vigente en GitHub.
2. Comprueba el commit de `main` y el artefacto productivo.
3. Comprueba si producción cambió desde este snapshot local.
4. Reaplica solo los cambios propios sobre el estado real.
5. Repite pruebas y revisa migraciones.
6. Publica solo con el flujo autorizado por la coordinación vigente.
7. Verifica producción con evidencia real.
8. Actualiza `CURRENT_STATE.md`, Coordinación, `CHECKPOINTS.md`, `CONTROLADOR_DE_VERSIONES.md`, `CEREBRO.md`, `BASELINE.md` e Inventario cuando corresponda.

## Resultado que debes entregar al terminar tu turno

No respondas solo “hecho”. Entrega:

- archivos cambiados;
- comportamiento implementado;
- pruebas exactas y resultado;
- bloqueadores reales;
- decisiones pendientes;
- siguiente punto cero;
- confirmación explícita de si hubo o no publicación.
