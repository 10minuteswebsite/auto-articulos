import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { toolText, type ToolDef } from "./shared";

export const HISTORY_TOOLS: ToolDef[] = [
  {
    name: "ver_historial_publicaciones",
    title: "Ver historial de publicaciones",
    description:
      "Propósito: mostrar las últimas ejecuciones y el resultado de cada artículo. Cuándo usarla: cuando el usuario pide historial, resultados recientes o fallos. Cuándo NO usarla: para saber qué oportunidades siguen pendientes.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const userId = await getCurrentUserId();
      const runs = await prisma.run.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { category: true, titles: { orderBy: { order: "asc" } } },
      });
      if (runs.length === 0) return toolText("Todavía no hay publicaciones registradas.");
      const text = runs.map((run) => {
        const titles = run.titles.map((title) => {
          const suffix = title.status === "success" && title.articleUrl
            ? ` — ${title.articleUrl}`
            : title.status === "error"
              ? ` — error: ${title.errorMessage ?? "sin detalle"}`
              : "";
          return `  - ${title.finalTitle ?? title.text}: ${title.status}${suffix}`;
        }).join("\n");
        return `${run.id} | ${run.createdAt.toISOString()} | ${run.category.name} | ${run.status}\n${titles}`;
      }).join("\n");
      return toolText(text);
    },
  },
  {
    name: "ver_detalle_publicacion",
    title: "Ver detalle de publicación",
    description:
      "Propósito: explicar por qué una ejecución o artículo terminó bien, falló o sigue en curso. Cuándo usarla: cuando el usuario pide el detalle de un ID del historial.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "ID de la ejecución o del artículo." } },
      required: ["id"],
      additionalProperties: false,
    },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async (args) => {
      const userId = await getCurrentUserId();
      const id = typeof args.id === "string" ? args.id.trim() : "";
      if (!id) return toolText("Indica el ID de la publicación o ejecución.", true);
      const run = await prisma.run.findFirst({
        where: { id, userId },
        include: { category: true, titles: { orderBy: { order: "asc" }, include: { events: { orderBy: { createdAt: "asc" } } } } },
      });
      if (run) {
        return toolText(`${run.id} | categoría: ${run.category.name} | estado: ${run.status}\n${run.titles.map((title) => {
          const events = title.events.map((event) => `    ${event.createdAt.toISOString()}: ${event.message}`).join("\n");
          return `- ${title.id} | ${title.finalTitle ?? title.text} | ${title.status}${title.errorMessage ? ` | error: ${title.errorMessage}` : ""}${events ? `\n${events}` : ""}`;
        }).join("\n")}`);
      }
      const title = await prisma.title.findFirst({ where: { id, run: { userId } }, include: { run: { include: { category: true } }, events: { orderBy: { createdAt: "asc" } } } });
      if (!title) return toolText("No encontré una publicación con ese ID dentro de tu cuenta.", true);
      return toolText(`${title.id} | ${title.run.category.name} | ${title.status}\nTítulo: ${title.finalTitle ?? title.text}\n${title.errorMessage ? `Error: ${title.errorMessage}\n` : ""}${title.events.map((event) => `${event.createdAt.toISOString()}: ${event.message}`).join("\n")}`);
    },
  },
];
