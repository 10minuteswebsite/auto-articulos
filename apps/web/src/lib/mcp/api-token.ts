import { createHash, randomBytes } from "crypto";
import { MCP_API_TOKEN_PREFIX } from "./api-token-prefix";

/**
 * Token personal de API para el servidor MCP propio (`/api/mcp`). Mismo
 * esquema que los tokens OAuth (`apps/web/src/lib/oauth/server.ts`): se
 * guarda solo el hash y se busca por él (índice único), nunca comparando
 * en un bucle — el hash de entrada o coincide exactamente con una fila o no
 * coincide con ninguna. El valor real solo existe en el momento de
 * generarlo. Prefijo `sta_` (SEO Total API) para que sea reconocible a
 * simple vista y distinguible de otros tipos de token.
 */
export { MCP_API_TOKEN_PREFIX };

export function generateMcpApiToken(): string {
  return `${MCP_API_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashMcpApiToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}
