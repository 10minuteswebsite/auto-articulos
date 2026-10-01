import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { toolText, type ToolDef } from "./shared";

export const PREFERENCE_TOOLS: ToolDef[] = [
  {
    name: "ver_preferencias_contenido",
    title: "Ver preferencias de contenido",
    description: "Muestra el idioma, firma, ubicaciones y temas excluidos configurados para la redacción. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const userId = await getCurrentUserId();
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { contentLanguage: true, articleSignature: true, clientLocations: true, businessLocations: true, excludedTopics: true } });
      return toolText([
        `Idioma: ${user.contentLanguage ?? "no configurado"}`,
        `Firma: ${user.articleSignature ? "configurada" : "no configurada"}`,
        `Ubicaciones de clientes: ${user.clientLocations || "no configuradas"}`,
        `Ubicaciones del negocio: ${user.businessLocations || "no configuradas"}`,
        `Segmento de no publicar: ${user.excludedTopics || "no configurado"}`,
      ].join("\n"));
    },
  },
  {
    name: "ver_estado_indexacion",
    title: "Ver estado de indexación",
    description: "Muestra el estado de las conexiones de Google Search Console y Bing, y el sitio seleccionado. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const userId = await getCurrentUserId();
      const [user, integrations] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { selectedSiteDomain: true } }),
        prisma.searchIntegration.findMany({ where: { userId, provider: { in: ["google", "bing"] } }, select: { provider: true, siteUrl: true, siteDomain: true, updatedAt: true }, orderBy: { updatedAt: "desc" } }),
      ]);
      const lines = integrations.length
        ? integrations.map((item) => `- ${item.provider}: conectado${item.siteUrl ? ` — ${item.siteUrl}` : ""} (${item.updatedAt.toISOString()})`)
        : ["- Google y Bing: sin conexiones registradas"];
      return toolText(`Sitio seleccionado: ${user.selectedSiteDomain || "no seleccionado"}\n${lines.join("\n")}`);
    },
  },
];
