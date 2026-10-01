import { GET as socialHistoryRoute } from "@/app/api/social-opportunities/route";
import { readRoute, toolText, type ToolDef } from "./shared";

export const SOCIAL_TOOLS: ToolDef[] = [
  {
    name: "listar_propuestas_sociales",
    title: "Listar propuestas para redes y blogs",
    description: "Muestra propuestas de publicaciones sociales pendientes, publicadas o con error. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const { ok, data } = await readRoute(await socialHistoryRoute());
      if (!ok) return toolText(String(data.error ?? "No se pudieron consultar las propuestas sociales."), true);
      const opportunities = (data.opportunities ?? []) as Array<{ id?: string; platform?: string; articleTitle?: string; suggestedText?: string; status?: string; articleUrl?: string; errorLog?: string | null }>;
      if (opportunities.length === 0) return toolText("No hay propuestas sociales registradas.");
      return toolText(opportunities.slice(0, 30).map((item) => `${item.id} | ${item.platform} | ${item.status} | ${item.articleTitle ?? "sin título"}${item.errorLog ? ` | error: ${item.errorLog}` : ""}\n${item.suggestedText ?? ""}${item.articleUrl ? `\n${item.articleUrl}` : ""}`).join("\n\n"));
    },
  },
  {
    name: "previsualizar_publicacion_social",
    title: "Previsualizar publicación social",
    description: "Muestra exactamente el texto y destino de una propuesta social sin publicarla.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "ID de la propuesta devuelto por listar_propuestas_sociales." } }, required: ["id"], additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async (args) => {
      const { ok, data } = await readRoute(await socialHistoryRoute());
      if (!ok) return toolText(String(data.error ?? "No se pudieron consultar las propuestas sociales."), true);
      const id = typeof args.id === "string" ? args.id : "";
      const item = ((data.opportunities ?? []) as Array<{ id?: string; platform?: string; articleTitle?: string; suggestedText?: string; articleUrl?: string; status?: string }>).find((candidate) => candidate.id === id);
      if (!item) return toolText("No encontré esa propuesta dentro de tu cuenta.", true);
      return toolText(`Destino: ${item.platform}\nArtículo: ${item.articleTitle ?? "sin título"}\nEstado actual: ${item.status}\nTexto:\n${item.suggestedText ?? ""}${item.articleUrl ? `\nArtículo: ${item.articleUrl}` : ""}`);
    },
  },
];
