# MCP-CLOUDFLARE-BIC-20261027

## Estado

Cloudflare 1010 corregido y verificado en ambos productos. La prueba real del
cliente pasó a 401; autenticación de MUSE todavía ABIERTA. Diagnóstico seguro
publicado y verificado; falta correlacionar el siguiente intento real de MUSE.
No declarar E2E.

## Punto cero y causa confirmada

- Producción Vercel READY: `d0690cde1b27dcedb4b2614398b04b202dc5fb0f`,
  deployment `dpl_E9Cmx3tW8dTckJ99XbUtkGXS9XQB`, proyecto `auto-articulos-web`.
- Artículos y Redes siguen en Vercel. Sus CNAME `.net` apuntan a
  `e90300f8cff5d462.vercel-dns-017.com` con proxy Cloudflare activo.
- Cuenta Cloudflare `99a41fca77e1459354e6fe519a9ff042`; zona
  `b2fcfe38fbdf5911022c4b495cac6ed2` (`lasolucionweb.net`).
- Evento real `a51337823ebe9d92`, 27/10 12:53:25 EDT (16:53:25 UTC):
  POST `/api/mcp`, host Redes, `Python-urllib/3.12`, acción Block,
  servicio Browser Integrity Check. Confirmado en Security Events.
- Antes del cambio se reprodujo 403/1010 con esa firma en ambos hosts.
  La corrección previa de Origin no quitaba este filtro anterior a Vercel.

## Cambio publicado en Cloudflare

Regla `MCP Articulos y Redes - clientes IA`, id
`bc768b93c8584a57acddd2c285d9fc0c`, activa, orden1. Única acción: `bic=false`.
El ajuste BIC global continúa ON, comprobado después por UI y controles HTTP.

```text
(http.host in {"articulos.lasolucionweb.net" "redes.lasolucionweb.net"} and http.request.uri.path in {"/api/mcp" "/.well-known/oauth-protected-resource" "/.well-known/oauth-authorization-server" "/api/oauth2/authorize" "/api/oauth2/token"})
```

No hay wildcard de host ni de ruta. No se deshabilitó WAF/rate limiting,
no se cambió DNS, no se rotaron credenciales ni se modificaron permisos.
Respaldo: capturas del BIC global y listado previo de Configuration Rules;
no se afirma una exportación completa del WAF.

Rollback: desactivar únicamente la regla nueva por su id y repetir controles.
No apagar el BIC global ni tocar reglas de otros productos.

## Comprobación productiva

18/18 peticiones con la firma original pasaron el resultado esperado, a las
14:17 EDT: sin token/token falso401; Origin ajeno con Bearer falso401;
Origin ajeno sin Bearer403 de la aplicación; discovery200; authorize sin
parámetros400; GET al endpoint token405; `/login` fuera de regla403/1010.
Las respuestas que llegaron a la aplicación llevan `x-vercel-id`.
[Recibos HTTP sin secretos](../evidence/mcp-cloudflare-20261027-http.json).

## Nuevo resultado del cliente: 401

El usuario informó que desde14:22 EDT MUSE llega al servidor pero obtiene
`{"error":"No autenticado"}`. El informe describe un código temporal usado
por el conector `custom.seo-total`. Eso NO demuestra que el token real esté mal:
Meta documenta que Sentinel sustituye una credencial surrogada en la frontera
de red. No se debe aceptar ese código temporal en el servidor ni pedir al
agente que revele la credencial real.

En la base nativa `uqqclaezxagukoyiiiol`, el tenant del caso tiene token
personal existente desde30/09, no revocado; no hay tokens OAuth. Solo se
leyeron metadatos, sin valor ni hash. `lastUsedAt=null` NO prueba ausencia
de autenticación: la actualización de ese campo es asíncrona y no esperada.
No se encontraron eventos de bloqueo para `/api/mcp/token-lookup` en los
logs muestreados. Un timeout aislado de esa ruta queda registrado; no es
evidencia suficiente para atribuirle el 401 real de MUSE.

Se añade `[mcp-auth]` exclusivamente a fallos: familia de credencial,
Ray ID validado y estado HTTP de la comprobación interna cuando corresponde.
No registra cabeceras completas, valor/hash del token, cuerpo ni usuario.
La autenticación y las respuestas públicas permanecen iguales. Se quitó
además un import no usado de una prueba Bing que impedía el typecheck.

Validación local: `npm run verify` PASS (tipos/build web/build worker y26
pruebas worker);258 pruebas web PASS, incluidas las de diagnóstico/Origin.
URL de base de pruebas apuntada a localhost; ninguna publicación real.

## Publicación del diagnóstico y control productivo

Commit `654b311cdd07e094de43061b046a551aba753b6c` en main, Vercel producción
READY `dpl_919g1r4DimziKbKUs7pqvRkZ9yBn`. Ambos alias .net apuntan a este
deployment; los dos checks Vercel de GitHub terminaron success.

A las18:52:47–51 UTC se hicieron cuatro controles deliberadamente negativos:
sin token y con PAT falso en cada host, todos401 de la aplicación. Los logs
del deployment muestran las seis líneas esperadas: missing/rejected y
personal/personal_lookup_rejected401/rejected. Ray IDs:
`a513e65bd9fed8c6-ATL`, `a513e65d89038c9c-ATL`,
`a513e66e0b31726a-ATL`, `a513e66fb8eeb08e-ATL`.
Esto verifica el diagnóstico y el rechazo seguro; NO valida el token de MUSE.
[Recibos del diagnóstico](../evidence/mcp-cloudflare-20261027-diagnostic-http.json).

Limitación del conector Vercel observada: la búsqueda textual mcp-auth no
devolvió estas líneas de middleware. La consulta sin query sí las devuelve;
filtrar después por `[mcp-auth]` y Ray ID, sin inferir ausencia de tráfico de
una búsqueda vacía.

## Siguiente verificación obligatoria

1. READY y logs con token falso confirmados; conservar este punto cero.
2. Reintentar initialize/tools/list desde MUSE con la credencial guardada.
3. Correlacionar `[mcp-auth]` y Ray ID: missing/unsupported/other_bearer
   orienta a envío o sustitución del conector; personal_lookup401 exige
   contrastar la credencial guardada con la vigente;403/5xx exige investigar
   esa respuesta interna. No atribuir causa sin ese dato.
4. No regenerar el token real ni habilitar nuevas publicaciones para probar.
   Conexión completa solo cuando tools/list válido devuelva200 en MUSE.

Fuentes: [Meta/Sentinel](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse),
[BIC por petición](https://developers.cloudflare.com/rules/configuration-rules/settings/#browser-integrity-check),
[mapa central](https://github.com/10minuteswebsite/Harness-Mario/blob/main/docs/ECOSISTEMA_APLICACIONES.md).
