# MANUAL DEL DÍA CERO v3 — separación con login actual

Para Milton. Este manual no ejecuta nada: describe una ventana reversible para separar Artículos y Redes conservando el usuario y contraseña actuales.

## Principios y puertas

- El Día Cero no migra el login al HUB. El HUB de Mario funciona en paralelo y no participa en este procedimiento.
- `seototal.lasolucionweb.com` es el origen canónico; `articulos.lasolucionweb.com` y `redes.lasolucionweb.com` son los destinos. `site`, `net` y `tagcrush` usan los mismos subdominios.
- Mario crea DNS y certificados. SEO Total conserva callbacks de proveedor; no se registran consolas nuevas.
- Antes de actuar: DNS con candado, login actual probado, permisos de Redes simulados y rollback ensayado. Nunca `db push`, `force_sync` ni `accept_data_loss` en producción.

## Preparación

1. Milton decide fecha y ventana.
2. Mario crea los dos DNS apuntando al proyecto, sin cambiar el dominio canónico.
3. Configurar solo en el entorno: `SHARED_COOKIE_DOMAIN=.lasolucionweb.com` y `OAUTH_CANONICAL_ORIGIN=https://seototal.lasolucionweb.com`. Ausentes/apagadas conserva el comportamiento actual.
4. Ejecutar smoke test y comprobar login actual, `/api/mcp`, conexiones y «Acceder como».
5. Ejecutar `scripts/corte/encender-permisos-redes-simulacion.sql`; revisar conteos con Milton y aplicar solo después de aprobarlos.

## Día Cero

1. Congelar cambios de la ventana y registrar hora.
2. Confirmar ambos subdominios con candado.
3. Encender permisos de Redes a cuentas actuales; las nuevas reciben el mismo perfil. No tocar administradores ni módulos explícitamente deshabilitados.
4. Activar `vista-productos` para el grupo aprobado; verificar tarjetas Artículos/Redes sin pérdida de datos.
5. Mantener `product_enforcement` apagado hasta autorización de Milton.
6. Probar `routeAfterLogin`: un producto va a su subdominio, ambos permanecen, sin acceso usa el `hubUrl` configurado y previews/localhost nunca redirigen.
7. Probar OAuth desde `articulos` y `redes`; el callback de siempre devuelve al origen guardado. No tocar consolas.
8. Smoke test final y bitácora.

## Cookies, OAuth y reversa

Con `SHARED_COOKIE_DOMAIN` activo, sesión, «Acceder como» y state OAuth deben leer/borrar la variante compartida y la host-only antigua. El state firmado contiene proveedor, origen, usuario, expiración y jti único. `OAUTH_CANONICAL_ORIGIN` solo cambia el URI cuando se configura.

- Fallo cookies/OAuth: quitar ambas variables y redeplegar; vuelven callbacks y cookies actuales.
- Fallo permisos: restaurar el respaldo SQL; no usar SQL improvisado.
- Fallo de vista: quitar `vista-productos`; fallo de derechos: mantener enforcement apagado.
- Fallo DNS: retirar solo registros nuevos; nunca mover `seototal`.

## Fuera de alcance

No se construye `/auth/hub`, no se redirige el dominio canónico al HUB, no se convierte a gracia y no se elimina el login actual. Todo eso requiere orden posterior de Milton.

## Cierre

Probar administrador, Artículos, Redes, ambos y sin derechos; cierre de sesión en los tres hosts; «Acceder como»; una integración por origen; y ausencia de bucles. Registrar hora, variables, commit y reversa en `TRASPASO_SEPARACION_SEO_TOTAL.md`.
