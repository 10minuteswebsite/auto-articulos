# Seguimiento — contrato BLOG IA → Artículos

Fecha: 2026-11-07 (America/New_York)
Alcance: exclusivamente Artículos y su contrato de destino con Hub/BLOG IA.

## Evidencia confirmada

- `main` contiene la compuerta de destino, la selección de BLOG IA, la lectura
  separada de categorías y el snapshot de destino por publicación.
- La migración `20261107120000_add_publication_destination_snapshot` se aplicó
  en producción de forma aditiva e idempotente.
- `public."Title"` conserva 15,163 registros después de la migración.
- Verificación local: typecheck, build web, build worker, 441 pruebas web y 38
  pruebas worker correctas.
- El dominio propio de Lorena responde en producción y BLOG IA lo muestra como
  conectado: `blog.segurosdesaludyvida.com`.

## Estado contractual de Lorena

La cuenta es BLOG IA, pero la proyección de Artículos todavía conserva el
hostname anterior `blogia-lorena.lasolucionweb.net`. No se corrigió mediante
SQL ni se derivó el dominio desde otra URL.

El receptor de Artículos está preparado para recibir la reemisión oficial:

1. `status` obtiene la revisión actual.
2. `select` usa `confirm: true` y `expected_revision`.
3. Un `destination_changed` solo permite un nuevo `status` y un reintento.

La reemisión debe ejecutarse desde el backend autenticado del Hub. Artículos no
puede fabricar `site_id`, `tenant_id` ni la revisión, ni debe modificar la base
directamente.

## Historial

Los snapshots nuevos se guardan al publicar con destino, publicador, tenant,
hostname y URL canónica. Los registros antiguos que no tienen snapshot no se
rellenan automáticamente: no se adivina el destino por la URL.

## Pendiente verificable

Después de que el Hub entregue la reemisión, comprobar en producción:

- `linked: true`;
- `selected: true`;
- `current_method: BLOG`;
- `current_hostname: blog.segurosdesaludyvida.com`;
- Configuración de Artículos muestra BLOG IA como destino listo;
- categorías de BLOG IA disponibles y de solo lectura en Artículos;
- no se muestra 10MWS como conexión activa.

No se declara cierre funcional de Lorena hasta observar esos resultados en
producción.
