import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { PATCH as meRoute } from "@/app/api/me/route";
import { consumeConfirmation, issueConfirmation } from "../confirmation";
import { jsonRequest, readRoute, toolText, type ToolDef } from "./shared";

export const PREFERENCE_TOOLS: ToolDef[] = [
  {
    name: "cambiar_preferencias_contenido",
    title: "Cambiar preferencias de contenido",
    description:
      "Actualiza preferencias existentes de la cuenta: idioma, firma, teléfono, ubicaciones, temas excluidos, prompt visual e indexación automática. Siempre muestra el cambio y exige confirmación; solo modifica los campos enviados.",
    inputSchema: { type: "object", properties: { idioma: { type: "string" }, firma: { type: ["string", "null"] }, telefono: { type: ["string", "null"] }, ubicacionesClientes: { type: ["string", "null"] }, ubicacionesNegocio: { type: ["string", "null"] }, temasExcluidos: { type: ["string", "null"] }, promptImagen: { type: ["string", "null"] }, desactivarIndexacion: { type: "boolean" }, confirmar: { type: "boolean" }, confirmacion: { type: "string" } }, additionalProperties: false },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async (args) => {
      const userId = await getCurrentUserId();
      const updates: Record<string, unknown> = {};
      const fields: Array<[string, string]> = [["idioma", "contentLanguage"], ["firma", "articleSignature"], ["telefono", "phone"], ["ubicacionesClientes", "clientLocations"], ["ubicacionesNegocio", "businessLocations"], ["temasExcluidos", "excludedTopics"], ["promptImagen", "imagePrompt"]];
      for (const [input, output] of fields) if (input in args) updates[output] = args[input];
      if ("desactivarIndexacion" in args) updates.disableIndexing = args.desactivarIndexacion;
      if (Object.keys(updates).length === 0) return toolText("Indica al menos una preferencia para cambiar.", true);
      const operation = { updates };
      const labels = Object.entries(updates).map(([key, value]) => `${key}: ${value === null || value === "" ? "vacío" : String(value)}`).join("\n");
      if (args.confirmar !== true) {
        const token = await issueConfirmation({ userId, toolName: "cambiar_preferencias_contenido", operation });
        return toolText(`Sin cambiar todavía. Se actualizaría:\n${labels}\n\nPide confirmación explícita y vuelve a llamar con confirmar=true y confirmacion="${token}".`);
      }
      const confirmed = await consumeConfirmation({ userId, toolName: "cambiar_preferencias_contenido", operation, token: args.confirmacion });
      if (!confirmed) return toolText("La confirmación expiró, ya fue usada o no corresponde a este cambio. Genera una vista previa nueva.", true);
      const { ok, data } = await readRoute(await meRoute(jsonRequest("/api/me", updates) as never));
      return ok ? toolText("Preferencias actualizadas correctamente.") : toolText(String(data.error ?? "No se pudieron actualizar las preferencias."), true);
    },
  },

  {
    name: "ver_preferencias_contenido",
    title: "Ver preferencias de contenido",
    description: "Muestra el idioma, firma, ubicaciones y temas excluidos configurados para la redacción. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const userId = await getCurrentUserId();
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { contentLanguage: true, articleSignature: true, clientLocations: true, businessLocations: true, excludedTopics: true, defaultPrompt: { select: { name: true } } } });
      return toolText([
        `Idioma: ${user.contentLanguage ?? "no configurado"}`,
        `Firma: ${user.articleSignature ? "configurada" : "no configurada"}`,
        `Ubicaciones de clientes: ${user.clientLocations || "no configuradas"}`,
        `Ubicaciones del negocio: ${user.businessLocations || "no configuradas"}`,
        `Segmento de no publicar: ${user.excludedTopics || "no configurado"}`,
        `Estilo de escritura por defecto: ${user.defaultPrompt?.name ?? "STANDARD (10minutesWebsite)"}`,
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
