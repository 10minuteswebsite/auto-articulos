# Runtime productivo — Artículos y Redes

`MCP-AUTH-FIX-20261027`: código620e0cc9, Vercel
`dpl_7wM3UkkfJHLUe9jstGuZSm5wHMVV` READY. Metadata nullable aplicada sin
backfill. Emisión/revocación con revisión, lookup10s/redirect:error y401 vs503,
uso persistido, producto Hub confiable .net/.com.300 pruebas y18 controles API
productivos PASS; UI verificada. Fixture limpiado0/0/0,30 credenciales reales
intactas. MUSE requiere tools/list real con su credencial guardada.
[Evidencia y rollback](docs/audits/mcp-auth-fix-20261027.md).

`MCP-CREDENTIAL-LOGIC-20261027`: reproducción local confirma que token
compartido se reemplaza sin aviso, createdAt no fecha su última rotación y
el lookup503 se transforma en401. Contexto Hub MCP no fija producto. No
reparado aún. Prueba productiva temporal espera autorización; no ejecutada.
[Revisión y plan](docs/audits/mcp-auth-logic-20261027.md).

Auditoría19:26 EDT `MCP-MUSE-READONLY-20261027`: no cambios de runtime.
Personal_lookup401 precede a la consulta de derechos Hub; un log de rechazo
no identifica al dueño del token. No atribuir a un tenant por hora solamente.
[Evidencia y pendiente](docs/audits/mcp-muse-readonly-20261027.md).

## MCP-CLOUDFLARE-BIC-20261027

Aplicación Next.js en Vercel (`auto-articulos-web`); dominios `.net` protegidos
por proxy Cloudflare. El Hub autoriza acceso comercial y el producto valida
sus propias credenciales MCP; no son mecanismos intercambiables.

Regla Cloudflare `bc768b93c8584a57acddd2c285d9fc0c`: BIC OFF solo en las cinco
rutas exactas MCP/discovery/OAuth y los dos hosts registrados en el informe.
Global BIC ON; otras protecciones intactas.18 controles HTTP productivos PASS.
Reversión: desactivar solo esa regla. No cambiar DNS ni apagar el BIC global.

El 401 real de MUSE sigue abierto. El token personal no se puede recuperar
en texto plano desde la base; solo se guarda un hash. No rotarlo para un
diagnóstico sin autorización específica. Los logs `[mcp-auth]` guardan solo
familia, identificador acotado y estado de lookup, nunca credenciales.

Diagnóstico en producción `654b311c` / `dpl_919g1r4DimziKbKUs7pqvRkZ9yBn`,
READY y logs correlacionados con cuatro controles negativos. Consultar logs
de Vercel sin query textual y filtrar después por mcp-auth/Ray ID: el filtro
textual no devolvía líneas de middleware en la comprobación realizada.

[Estado, recibos y pasos siguientes](docs/audits/mcp-cloudflare-bic-20261027.md).
