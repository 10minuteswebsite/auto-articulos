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
3. Ejecutar smoke test y comprobar login actual, `/api/mcp`, conexiones y «Acceder como».
4. En Administración → Usuarios, abrir Día Cero y pulsar Simular. Revisar los conteos antes de activar.
5. Tener a mano la reversa: botón Revertir y eliminación de la variable `DIA_CERO`.

## Día Cero

1. Congelar cambios de la ventana y registrar hora.
2. Confirmar ambos subdominios con candado.
3. En Vercel crear `DIA_CERO=on` y hacer Redeploy. Esta variable debe estar activa antes del botón para que las cookies funcionen en las tres direcciones.
4. Escribir `DIA CERO` y pulsar Activar Día Cero. El botón enciende los permisos de Redes con respaldo reversible.
5. Mantener `product_enforcement` apagado.
6. Probar las tres direcciones, el router y una conexión OAuth desde cada subdominio. No tocar consolas.
7. Smoke test final y bitácora.

## Cookies, OAuth y reversa

Con `DIA_CERO=on`, sesión, «Acceder como» y state OAuth usan el comportamiento compartido de Día Cero. El state firmado conserva proveedor, origen, usuario, expiración y jti único.

- Fallo cookies/OAuth: borrar `DIA_CERO` y redeplegar; vuelve el comportamiento anterior.
- Fallo permisos: pulsar Revertir. Los SQL de `scripts/corte/` son solo plan B documentado; no usar SQL improvisado.
- Fallo de vista: quitar `vista-productos`; fallo de derechos: mantener enforcement apagado.
- Fallo DNS: retirar solo registros nuevos; nunca mover `seototal`.

## Fuera de alcance

No se construye `/auth/hub`, no se redirige el dominio canónico al HUB, no se convierte a gracia y no se elimina el login actual. Todo eso requiere orden posterior de Milton.

## Cierre

Probar administrador, Artículos, Redes, ambos y sin derechos; cierre de sesión en los tres hosts; «Acceder como»; una integración por origen; y ausencia de bucles. Registrar hora, variables, commit y reversa en `TRASPASO_SEPARACION_SEO_TOTAL.md`.
