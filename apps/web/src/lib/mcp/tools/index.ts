import { OPPORTUNITY_TOOLS } from "./opportunities";
import { ACCOUNT_TOOLS } from "./account";
import { CONTENT_GENERATION_TOOLS } from "./content-generation";
import { GUIDANCE_TOOLS } from "./guidance";
import { HISTORY_TOOLS } from "./history";
import { PREFERENCE_TOOLS } from "./preferences";
import { SOCIAL_TOOLS } from "./social";
import { ACTION_TOOLS } from "./actions";
import { INDEXING_TOOLS } from "./indexing";
import type { ToolDef } from "./shared";

/**
 * Catálogo completo de tools MCP. Cómo sumar una función nueva (pedido de
 * Milton, 29/9/2026: que cada funcionalidad nueva de la plataforma se sume
 * sola a los asistentes de IA): crear o editar un archivo de dominio
 * (`opportunities.ts`, `account.ts`, o uno nuevo como `social.ts` cuando
 * toque la fase 4 del catálogo en `MCP_ACCIONES_UNIVERSALES.md`) que
 * exporte un array de `ToolDef` reusando el route handler existente, y
 * sumarlo acá abajo. Ni `app/api/mcp/route.ts` ni `middleware.ts` cambian
 * nunca por esto.
 */
export const TOOLS: ToolDef[] = [...OPPORTUNITY_TOOLS, ...ACCOUNT_TOOLS, ...CONTENT_GENERATION_TOOLS, ...GUIDANCE_TOOLS, ...HISTORY_TOOLS, ...PREFERENCE_TOOLS, ...SOCIAL_TOOLS, ...ACTION_TOOLS, ...INDEXING_TOOLS];

const duplicateNames = TOOLS.map((tool) => tool.name).filter((name, index, all) => all.indexOf(name) !== index);
if (duplicateNames.length > 0) {
  throw new Error(`Catálogo MCP inválido: tools duplicadas (${Array.from(new Set(duplicateNames)).join(", ")}).`);
}

export function findTool(name: string, scopes: string[]) {
  return TOOLS.find((tool) => tool.name === name && scopes.includes(tool.requiredScope));
}

/** Forma que espera `tools/list` (sin el handler, que es interno). */
export function listToolsPayload(scopes: string[]) {
  return TOOLS.filter((tool) => scopes.includes(tool.requiredScope)).map(({ name, title, description, inputSchema, annotations }) => ({
    name,
    title,
    description,
    inputSchema,
    annotations,
  }));
}
