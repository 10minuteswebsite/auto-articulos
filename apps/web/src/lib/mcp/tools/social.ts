import { GET as socialHistoryRoute } from "@/app/api/social-opportunities/route";
import { readRoute, toolText, type ToolDef } from "./shared";
import { networkLabel, resolveNetworks, SOCIAL_NETWORKS } from "../social-networks";

export const SOCIAL_TOOLS: ToolDef[] = [
  {
    name: "listar_propuestas_sociales",
    title: "Listar propuestas para redes y blogs",
    description:
      "Propósito: ver las propuestas de publicación de redes y blogs y su estado. ES la herramienta para monitorear una publicación social (no existe un estado_de_publicaciones para redes): después de publicar, vuelve a llamarla y mira el estado y el enlace. Son las mismas propuestas que ve la persona en la pantalla «Oportunidades Redes» de la web (misma tabla, mismos datos).\n" +
      "Estados: pending = propuesta lista sin publicar · queued = en cola · processing = publicándose ahora · published = publicada (con enlace a la publicación) · error = falló (con el motivo) · skipped = descartada o cancelada.\n" +
      "Cuándo usarla: antes de publicar (para ver qué hay pendiente), después de publicar (para confirmar estado y enlace) y para ver errores.\n" +
      "Cuándo NO usarla: para ver redes conectadas o cupo (usa ver_redes_sociales).\n" +
      "Argumentos (todos opcionales): red = nombre de la red (facebook, instagram, linkedin, threads, pinterest, tumblr, bluesky, blogger, google business) · estado = pending, queued, processing, published, error o skipped · id = ID de una propuesta para ver su detalle completo. Devuelve hasta 30, las más recientes primero.\n" +
      "Siguiente paso típico: publicar_propuestas_sociales (o reintentar las que están en error).",
    inputSchema: {
      type: "object",
      properties: {
        red: { type: "string", description: "Opcional. Nombre de la red: facebook, instagram, linkedin, threads, pinterest, tumblr, bluesky, blogger o google business." },
        estado: { type: "string", enum: ["pending", "queued", "processing", "published", "error", "skipped"], description: "Opcional. Filtra por estado." },
        id: { type: "string", description: "Opcional. ID de una propuesta para ver su detalle completo." },
      },
      additionalProperties: false,
    },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async (args) => {
      const { ok, data } = await readRoute(await socialHistoryRoute());
      if (!ok) return toolText(String(data.error ?? "No se pudieron consultar las propuestas sociales."), true);
      type Row = { id?: string; platform?: string; articleTitle?: string; suggestedText?: string; status?: string; articleUrl?: string; errorLog?: string | null; postId?: string | null; publishedAt?: string | null; createdAt?: string; progressStage?: string | null };
      let rows = (data.opportunities ?? []) as Row[];
      if (rows.length === 0) return toolText("No hay propuestas sociales registradas.");
      const id = typeof args.id === "string" ? args.id.trim() : "";
      if (id) {
        const row = rows.find((item) => item.id === id);
        if (!row) return toolText("No encontré esa propuesta dentro de tu cuenta.", true);
        return toolText(
          `ID: ${row.id}\nRed: ${networkLabel(String(row.platform))} (${row.platform})\nEstado: ${row.status}${row.progressStage ? ` — ${row.progressStage}` : ""}\nArtículo: ${row.articleTitle ?? "sin título"}${row.articleUrl ? ` (${row.articleUrl})` : ""}\nCreada: ${row.createdAt ?? "?"}${row.publishedAt ? `\nPublicada: ${row.publishedAt}` : ""}${row.postId ? `\nPublicación: ${row.postId}` : ""}${row.errorLog ? `\nError: ${row.errorLog}` : ""}\nTexto:\n${row.suggestedText ?? ""}`,
        );
      }
      if (typeof args.red === "string" && args.red.trim()) {
        const { networks, unknown } = resolveNetworks(args.red);
        if (unknown.length > 0) return toolText(`No reconozco la red «${args.red}». Las disponibles son: ${SOCIAL_NETWORKS.map((n) => n.label).join(", ")}.`, true);
        const platforms = new Set(networks.flatMap((network) => network.platforms));
        rows = rows.filter((item) => platforms.has(String(item.platform)));
      }
      if (typeof args.estado === "string" && args.estado.trim()) rows = rows.filter((item) => item.status === args.estado);
      if (rows.length === 0) return toolText("No hay propuestas con ese filtro.");
      const shown = rows.slice(0, 30);
      const body = shown.map((item) => `${item.id} | ${networkLabel(String(item.platform))} | ${item.status} | ${item.articleTitle ?? "sin título"}${item.errorLog ? ` | error: ${item.errorLog}` : ""}${item.status === "published" && item.postId ? ` | publicación: ${item.postId}` : ""}\n${item.suggestedText ?? ""}`).join("\n\n");
      return toolText(`${body}${rows.length > shown.length ? `\n\n(Mostrando ${shown.length} de ${rows.length}; usa los filtros red o estado para acotar.)` : ""}`);
    },
  },
  {
    name: "previsualizar_publicacion_social",
    title: "Previsualizar publicación social",
    description:
      "Propósito: mostrar exactamente el texto y la red de una propuesta social sin publicarla. Solo lectura, no usa comprobante.\n" +
      "Cuándo usarla: la persona quiere ver una propuesta antes de decidir. Para ver varias a la vez usa listar_propuestas_sociales.\n" +
      "Argumentos: id (obligatorio).\n" +
      "Siguiente paso típico: publicar_propuestas_sociales o publicar_propuesta_social.",
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
