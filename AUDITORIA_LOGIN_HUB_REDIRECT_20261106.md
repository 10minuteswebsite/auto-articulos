# Login de Artículos y Redes hacia el Hub · 2026-11-06

## Incidencia

Estas entradas mostraban el login local en vez del Hub:

- `https://articulos.lasolucionweb.net/login`
- `https://redes.lasolucionweb.net/login`

## Causa

El middleware de `auto-articulos` ya había cambiado los enlaces canónicos a
`.net`, pero `isSeoTotalHumanEntry` solo aceptaba
`seototal.lasolucionweb.com`. Por eso las solicitudes llegaban a la página
local `/login`.

## Corrección y pruebas

- Commit `3a877f4f` en `main`.
- La regla reconoce los hosts de Artículos y Redes en `.com` y `.net`, solo
  para rutas humanas (`/`, `/login`, `/dashboard...`).
- Callbacks `/auth/hub` y APIs quedan fuera de la redirección humana.
- Tests del redirect: 2/2 PASS.
- Prisma Client generado y typecheck PASS.
- Build Vercel PASS; producción READY:
  `dpl_791HBrgsjFsWFFAR4MxyxZ2Y2TJT`.
- Verificación productiva sin sesión:
  - Artículos `/login` → HTTP 307, `Location: https://hub.lasolucionweb.net/`.
  - Redes `/login` → HTTP 307, `Location: https://hub.lasolucionweb.net/`.
- `/auth/hub` sin código conserva su error local; no se creó ningún bucle.

No se tocaron datos, usuarios, secretos, credenciales, OAuth ni base de datos.
