import { NextRequest } from "next/server";
import { toolText } from "../protocol";

/**
 * Piezas compartidas por todos los dominios de tools (`opportunities.ts`,
 * `account.ts`, y los que se agreguen después). Cómo sumar una función
 * nueva: crear (o editar) un archivo de dominio que exporte un array de
 * `ToolDef`, y sumarlo en `index.ts` — ni el servidor (`app/api/mcp/route.ts`)
 * ni el middleware necesitan cambiar nunca.
 */

export type ToolHandler = (args: Record<string, unknown>) => Promise<ReturnType<typeof toolText>>;

export type McpScope = "oportunidades:leer" | "oportunidades:publicar";

export type ToolDef = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiredScope: McpScope;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
  handler: ToolHandler;
};

/** Construye un request sintético para pasarle el body a un route handler. */
export function jsonRequest(path: string, body: unknown) {
  return new NextRequest(`https://interno.local${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

/** Lee la respuesta de un route handler y normaliza el error de negocio. */
export async function readRoute(response: Response) {
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, data };
}

export { toolText };
