# Revisión de seguridad — separación SEO Total

Fecha: 2026-10-02. Revisión estática de las rutas desplegadas; no se usaron
credenciales ni se hicieron peticiones a producción.

## Resultado

No encontré una exposición nueva sin sesión en las superficies revisadas.

- `middleware.ts` rechaza las rutas `/api` sin cookie de sesión con 401 y las
  páginas protegidas redirigen a `/login`.
- Las rutas de oportunidades, ejecuciones, títulos, generación y sitemap
  obtienen el usuario mediante `getCurrentUserId()`, que depende del `x-user-id`
  que inyecta el middleware después de validar la sesión.
- Las rutas de redes consultan además `canUseSocialModule(userId)` antes de
  devolver o mutar datos del usuario.
- `api/admin/users/[id]/entitlements` llama a `requireAdmin()` tanto en GET como
  en PUT; no confía en el id de la URL para autorizar al operador.
- La nueva API del interruptor del Lote 3b está protegida por `requireAdmin()`
  en GET y PUT, valida estrictamente los tres modos y registra la modificación.

## Límites de esta revisión

Es una auditoría estática, no una prueba de penetración. No se ejecutó el smoke
test contra producción porque esa acción requiere una ventana y autorización de
Milton. Tampoco se verificó una matriz completa de cookies, impersonación y
tokens MCP en un navegador real.

## Recomendación

Ejecutar `scripts/smoke-production.sh` después de cada despliegue autorizado y
repetir la revisión si se modifican `middleware.ts`, `current-user.ts`, las
rutas de administración o los receptores OAuth/MCP.
