# TRASPASO — PROYECTO BLOG IA

Punto de entrada para cualquier agente (Claude, Codex) que retome el proyecto.

## Leer primero, en este orden

1. `COORDINACION_CLAUDE_CODEX.md` — protocolo obligatorio (capitanía con `scripts/migration-coordinator.sh`, PR normal, nada de `git add .`, migración antes que el código que la usa, anotar cada cambio).
2. `MASTER_BLUEPRINT_BLOG_IA_SEO_TOTAL.md` — especificación aprobada por Milton (v1.0, 15/10/2026). Las decisiones de producto de la sección 2 son vinculantes; solo las decisiones de ingeniería (sección 16) se validan en Fase 0.
3. Este archivo — estado y bitácora.

## Regla que no se negocia

BLOG IA es un **destino de salida** del pipeline editorial que ya existe en SEO Total. No se crea un segundo motor de artículos ni reglas nuevas de aprobación/calendario. No se toca el código de la web principal del cliente. No se programa contra suposiciones: primero Fase 0.

## Estado por fase

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Auditoría y validación (código real, Cloudflare Custom Hostnames, DB, GSC/GA/Bing) | EN CURSO |
| 1 | Núcleo BLOG IA (multi-tenant, render, ingestión, SEO básico) | Pendiente |
| 2 | Wizard y personalización | Pendiente |
| 3 | Integración operativa con SEO Total | Pendiente |
| 4 | Calidad, SEO y piloto (3 negocios) | Pendiente |

## Fase 0 — lista de verificación

- [ ] 0.1 Documentar el flujo editorial real de SEO Total (dónde se aprueba/publica; punto de enganche del nuevo destino) sin alterarlo.
- [ ] 0.2 Cloudflare: cuenta, plan, Custom Hostnames / Cloudflare for SaaS, límites y costes (requiere acceso de Milton a la cuenta).
- [ ] 0.3 Prueba real: subdominio externo con CNAME, HTTPS, render SSR y sitemap.
- [ ] 0.4 Base de datos (D1 u otra), medios en R2, backups.
- [ ] 0.5 Requisitos de conexión GSC/GA/Bing existentes para la propiedad del subdominio.
- [ ] 0.6 Mapeo de campos del blueprint (sección 5.2) contra el modelo actual de artículo.

## Bitácora (más reciente arriba)

**2026-10-15**
- DOCUMENTACIÓN · Blueprint guardado en el repo y este traspaso creado. Capitanía de Claude (solo documentación). Siguiente: punto 0.1 (auditoría del flujo editorial en el código).
