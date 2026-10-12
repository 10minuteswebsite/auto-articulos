# ENCARGO PARA DAVID DEL SACRAMENTO — Seguridad del repositorio

**De:** Milton Dávila
**Para:** David del Sacramento, jefe de sistemas
**Fecha:** 2026-10-12
**Repo:** https://github.com/10minuteswebsite/auto-articulos

---

## Mensaje de Milton

David:

El repositorio **se queda público (plan Free)**. Lo evaluamos: pasarlo a privado cuesta entre unos $96 y $212 al mes en minutos de GitHub Actions (hoy gastamos ~14.500 min/mes, casi todo el Worker de Auto Artículos), o dejaría la producción dependiendo de la Mac mini. No lo hacemos por ahora.

Pero un repo público no significa un repo desprotegido. **Tú eres el jefe de sistemas y esta responsabilidad es tuya: tomar las medidas para proteger el activo.**

Te soy sincero: yo soy el máximo NEO, super programador TEMU, y de seguridad entiendo poco. Prefiero que lo revises tú, decidas qué medidas tomar y las apliques. Me avisas qué hiciste y qué necesitas de mí.

---

## Qué se encontró (auditoría de solo lectura, 2026-10-12)

**Bien**
- Historial de git sin claves reconocibles (Anthropic, OpenAI, GitHub, AWS, Google, Slack, llaves privadas, URLs de base de datos con contraseña). Ojo: la búsqueda no cubre todos los formatos posibles.
- No hay archivos `.env` reales versionados, solo `.env.example`.
- Ningún workflow usa `pull_request_target`; todos corren por horario (`schedule`) o a mano (`workflow_dispatch`). Un extraño no puede ejecutarlos.
- Permisos por defecto de Actions: solo lectura. No pueden aprobar PRs.
- Colaboradores: `10minuteswebsite` (admin), `miltondavila-ux` y `daviddelsacramento` (sin admin).

**Huecos**
1. **`main` sin protección de rama.** Cualquiera con permiso de escritura puede empujar directo a producción, borrar la rama o reescribir el historial.
2. **Secret scanning y push protection apagados.**
3. **Dependabot (alertas y actualizaciones de seguridad) apagado.**
4. **Los logs de los workflows son públicos.** Los workflows de diagnóstico y de arreglos puntuales (`query-users`, `diagnose-lorena-status`, `diagnose-mauricio-status`, `diagnose-ignacio-cubas`, `diagnose-temp-guillermo`, `fix-patricia`, etc.) podrían imprimir datos de usuarios reales a un log que cualquiera puede leer. **Hay que revisarlos y, si imprimen datos personales, corregirlos o borrarlos.**
5. **No hay `LICENSE` ni `SECURITY.md`.**
6. **No sé si las cuentas de GitHub (la de Milton y la tuya) tienen 2FA.** Es la protección más importante contra hackeo de cuenta.
7. **Acciones de terceros sin fijar a SHA** (`sha_pinning_required: false`).

---

## Lista de tareas (todo gratis en repo público)

Marca cada casilla al terminar y anota la fecha.

### A. Cuentas (urgente)
- [ ] 2FA activado en tu cuenta (app de autenticación o passkey, no SMS).
- [ ] 2FA activado en la cuenta de Milton (`miltondavila-ux`) y en la dueña `10minuteswebsite`. Coordina con Milton para hacerlo juntos.
- [ ] Revisar y borrar tokens personales, llaves SSH y apps OAuth que ya no se usen (Settings → Developer settings, SSH keys, Applications).
- [ ] Confirmar que cada colaborador tiene el permiso mínimo necesario.

### B. Protección del repo
- [ ] **Proteger `main`** (Settings → Branches o Rulesets): PR obligatorio, bloquear push directo, bloquear borrado y force-push. Ojo: el flujo actual es PR + merge; debe seguir funcionando. Decidir si se exige aprobación de un revisor (con un equipo de dos personas, puede dejarse en 0 aprobaciones pero PR obligatorio).
- [ ] Activar **Secret scanning** y **Push protection**.
- [ ] Activar **Dependabot alerts** y **Dependabot security updates**.
- [ ] Activar **CodeQL** (Security → Code scanning → Set up → Default).
- [ ] Revisar y atender las alertas que aparezcan.
- [ ] Añadir `SECURITY.md` (a quién y cómo reportar una vulnerabilidad).
- [ ] Añadir `LICENSE`: "Todos los derechos reservados" (Milton prefiere que nadie pueda reutilizar el código).

### C. Workflows (`.github/workflows/`)
- [ ] Revisar qué imprimen los workflows de diagnóstico y de arreglos puntuales; quitar cualquier dato personal de los logs. Borrar los workflows temporales que ya no se usen (`diagnose-temp-guillermo`, `fix-patricia`, `diagnose-ignacio-cubas`, etc.) si ya cumplieron su función.
- [ ] Declarar `permissions:` mínimos en cada workflow (`contents: read` salvo que necesite más).
- [ ] Fijar las acciones de terceros a un SHA exacto.
- [ ] Mover los secretos de producción a un **Environment** con aprobación manual para los workflows delicados (`migrate`, `query-users`, `run-product-update-script`, `set-daily-limit`).
- [ ] Verificar que ningún workflow imprime variables de entorno ni secretos (`env`, `printenv`, `set -x`).

### D. Secretos
- [ ] Confirmar que las claves viven solo en GitHub Secrets / Vercel y no en el código.
- [ ] Decidir un calendario de rotación de claves importantes (base de datos, Anthropic, PostPeer, Composio, etc.) y rotar de inmediato cualquier clave de la que haya sospecha.
- [ ] Revisar con una herramienta más completa (por ejemplo `gitleaks` o `trufflehog`) el historial completo, para cubrir formatos que mi búsqueda no cubrió.

---

## Reglas del proyecto que debes respetar

Todo esto está en `COORDINACION_CLAUDE_CODEX.md` (léelo antes de tocar nada):
- **Protocolo del capitán:** reclamar antes de cualquier push.
- **Migración antes o junto con el merge.**
- **No hay push directo a `main`:** siempre PR normal (y con la protección de rama será obligatorio).
- **Anotar cada cambio** en la bitácora del documento de coordinación, en el mismo lote que el cambio.
- **Cuidado al tocar `worker.yml` y `social-worker.yml`:** son los que mantienen la producción viva. Un error ahí detiene la generación de artículos y las publicaciones de Redes.

## Cómo reportar

Cuando termines, deja en este archivo las casillas marcadas y una nota corta con lo que hiciste, lo que decidiste no hacer y por qué, y lo que necesites de Milton.

**Notas de David:**

_(escribe aquí)_
