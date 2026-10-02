# Auditoría de rutas API sin barrera de producto

Revisión estática de `apps/web/src/app/api/**/route.ts` sobre `origin/main` en C-026. Abrí las rutas candidatas y busqué la llamada efectiva a `requireProductAccess`; no se modificó ninguna ruta. Las rutas de autenticación, callbacks OAuth, MCP/OAuth2, administración y conexiones compartidas se consideran fuera de esta barrera por contrato.

## Rutas con barrera encontrada

La protección está presente en las familias de artículos `opportunities`, `title-generation`, `pre-validation`, `runs`, `sitemap/send`, `titles/[id]/*` y `opportunities/titles|groups`; y en las familias de redes `social-opportunities` (incluidos `generate`, `generate-all`, `preview`, `publish`, `cancel`, `instagram-link`). La comprobación usa `requireProductAccess` y no una copia local de la regla.

## Huecos candidatos

| Ruta | Clasificación propuesta | Por qué revisar / barrera propuesta |
|---|---|---|
| `apps/web/src/app/api/credentials/route.ts` | Artículos | Lee/guarda la configuración que habilita publicación de artículos. Revisar `ARTICULOS` en las operaciones autenticadas; conservar la separación de credenciales como requisito adicional. |
| `apps/web/src/app/api/categories/route.ts` y `categories/sync/route.ts` | Artículos | Las categorías alimentan el flujo de creación de artículos. Proponer `ARTICULOS` para operaciones de usuario autenticado. |
| `apps/web/src/app/api/configuration-status/route.ts` | Común/Artículos | Es un resumen de configuración usado por Inicio; confirmar si solo informa estado común o si expone datos exclusivos de Artículos. Si es exclusivo, `ARTICULOS`; si es resumen de shell, mantener común. |
| `apps/web/src/app/api/dashboard-stats/route.ts` | Común con datos de Artículos | El nombre es común, pero el archivo consulta estadísticas de artículos. Revisar producto solicitado o dividir la lectura; no aplicar una barrera a ciegas si el dashboard mixto debe mostrar ambos productos. |
| `apps/web/src/app/api/assistant/chat/route.ts` | Común/ambigua | El asistente puede operar desde varias pantallas. Determinar el contexto de producto en la petición; si genera o modifica contenido de Artículos, exigir `ARTICULOS`, y si es ayuda general dejarlo común. |
| `apps/web/src/app/api/title-generation/route.ts` | Artículos | En `origin/main` sí contiene `requireProductAccess`; queda listado como control positivo, no como hueco. |
| `apps/web/src/app/api/me/upload-image/route.ts` | Común | Es perfil/cuenta, no una capacidad de producto; no debe bloquearse por Artículos o Redes. Verificar que su autorización sea la de sesión/propiedad. |
| `apps/web/src/app/api/prompts/route.ts` | Común/admin según operación | La lectura de prompts puede servir a ambos productos y la escritura puede ser administrativa; exigir el control existente correspondiente, no inventar una sola clave de producto. |

## Rutas que no deben recibir `requireProductAccess`

`auth/*`, `me`, `admin/**`, callbacks y conexiones OAuth de proveedores, `composio/**`, `mcp`, `oauth2/**`, `actualizaciones`, idiomas, selección/detección del sitio, diagnósticos y salud/integraciones compartidas. Estas rutas tienen contratos propios (sesión, administrador, `state` OAuth, token MCP o configuración común) y se romperían si se les añade una barrera de producto genérica.

## Conclusión

No encontré una ausencia inequívoca en las rutas de ejecución principales: las familias que crean, ejecutan, publican, reintentan, cancelan o inspeccionan trabajo ya llaman a `requireProductAccess`. Los candidatos de la tabla necesitan decisión de producto/semántica antes de modificar código, especialmente `dashboard-stats`, `assistant/chat`, `configuration-status` y `prompts`. Recomiendo no implementar ninguno desde esta auditoría documental.
