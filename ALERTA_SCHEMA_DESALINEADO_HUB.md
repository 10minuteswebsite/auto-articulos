# ALERTA — schema desalineado con columnas HUB en producción

## Resumen ejecutivo

Producción contiene en `User` las columnas `hubUserId`, `hubAuth0Sub`, `hubSyncedAt`, `hubSyncAttemptedAt` y `hubSyncError`. El `schema.prisma` de `main` no las declara. Por tanto, la ruta normal del workflow (`prisma db push`) puede querer borrarlas, incluyendo datos de 106 usuarios.

**No ejecutar `prisma db push`, `--accept-data-loss` ni `force_sync` contra esa base.** Tampoco ejecutar este documento como una orden operativa.

## Evidencia que debe conservarse

- Las columnas llegaron desde `codex/hub-seo-total-migration`, run #73 del workflow, el 2026-10-01 21:11Z.
- Los runs #74 (main) y #75 (rama de verificación) abortaron sin cambios al detectar la divergencia.
- El `schema.prisma` actual de `main` no contiene esas cinco columnas.
- La reproducción en base desechable documentada por Claude confirma que `db push` produce el mismo error; al declarar las cinco columnas, Prisma informa «already in sync» sin tocar los datos.

Para repetir la comprobación sin mutar nada:

```bash
gh run list --workflow migrate.yml --limit 10
gh run view <RUN_ID> --log-failed
rg -n "hubUserId|hubAuth0Sub|hubSyncedAt|hubSyncAttemptedAt|hubSyncError" packages/db/prisma/schema.prisma
```

No se debe chequear, editar o fusionar la rama HUB.

## Riesgo

Un `db push` normal compara el schema declarado con la base y puede emitir una operación destructiva para eliminar columnas que la aplicación HUB todavía usa. Perderlas rompería la sincronización/identidad HUB y podría borrar datos.

## Salidas posibles, pendientes de decisión de Milton

### A. Adoptar el schema del HUB

Fusionar el cambio correspondiente del HUB a `main` solo tras revisión separada, regenerar Prisma y ajustar el workflow. Esta opción adopta oficialmente el modelo de identidad HUB.

### B. Declarar las columnas de forma aislada y aditiva

Añadir las cinco columnas a `schema.prisma` mediante un cambio aislado, aditivo y revisado, con la migración/documentación correspondiente. Primero confirmar tipos, nulabilidad, índices y propiedad real en Supabase.

Hasta elegir A o B, no ejecutar el workflow normal de schema contra producción y aplicar solo SQL explícito previamente aprobado.
