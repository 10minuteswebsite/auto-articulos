# Runtime productivo — Artículos y Redes

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

[Estado, recibos y pasos siguientes](docs/audits/mcp-cloudflare-bic-20261027.md).
