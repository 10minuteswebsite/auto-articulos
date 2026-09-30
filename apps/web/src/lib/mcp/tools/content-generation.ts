import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { jsonRequest, readRoute, toolText, type ToolDef } from "./shared";

/**
 * "Crear con la IA del sistema" (proyecto CREACION DE PUBLICACIONES PROPIAS,
 * `/dashboard/publicar`): preguntas guiadas (cliente tipo, tema, qué desea
 * el cliente, ubicaciones) que la IA convierte en hasta 9 propuestas de
 * títulos. Reusa el mismo route handler que usa esa pantalla — mismo cupo de
 * 3 solicitudes por día, mismo filtro de títulos repetidos, mismo prompt del
 * administrador.
 */
import { POST as generarTitulosIARoute } from "@/app/api/title-generation/route";

export const CONTENT_GENERATION_TOOLS: ToolDef[] = [
  {
    name: "crear_titulos_con_ia",
    title: "Crear títulos con la IA (a partir de una descripción del negocio)",
    description:
      "Genera hasta 9 propuestas de títulos para una categoría, a partir de una descripción que TÚ das (cliente tipo, tema, qué busca resolver el cliente) — la misma función 'Crear con la IA del sistema' del panel Publicar. No requiere Google Search Console ni categorías con datos previos: pide los 4 datos obligatorios antes de llamarla. Distinto de crear_oportunidades: esta no analiza nada externo, solo usa lo que le describas. No publica nada — para publicar después usa publicar_titulos_en_categoria con los textos exactos devueltos aquí. Cupo de 3 solicitudes de este tipo por día por cuenta.",
    inputSchema: {
      type: "object",
      properties: {
        categoria: { type: "string", description: "Nombre de la categoría existente donde se publicarían estos títulos." },
        cliente_tipo: { type: "string", description: "Quién es el cliente tipo de este negocio (ej. 'familias jóvenes buscando su primera casa')." },
        tema: { type: "string", description: "Tema o servicio sobre el que deben tratar los títulos." },
        deseo_cliente: { type: "string", description: "Qué busca resolver o lograr el cliente con este tema." },
        ubicacion_clientes: { type: "string", description: "Opcional. De dónde son los clientes reales (ciudades/países)." },
        ubicacion_negocio: { type: "string", description: "Opcional. Dónde opera o vende el negocio." },
      },
      required: ["categoria", "cliente_tipo", "tema", "deseo_cliente"],
      additionalProperties: false,
    },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    handler: async (args) => {
      const categoryName = String(args.categoria ?? "").trim();
      const clienteTipo = String(args.cliente_tipo ?? "").trim();
      const tema = String(args.tema ?? "").trim();
      const deseoCliente = String(args.deseo_cliente ?? "").trim();
      if (!categoryName || !clienteTipo || !tema || !deseoCliente) {
        return toolText("Indica categoría, cliente tipo, tema y qué desea el cliente.", true);
      }

      const userId = await getCurrentUserId();
      const [categories, user] = await Promise.all([
        prisma.category.findMany({
          where: { userId, platform: "10minutesWebsite", source: { not: "archived" }, name: { equals: categoryName, mode: "insensitive" } },
          select: { id: true, name: true },
        }),
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { contentLanguage: true } }),
      ]);
      if (categories.length !== 1) {
        return toolText(`No encontré una categoría exacta llamada "${categoryName}". Usa listar_categorias para ver las disponibles.`, true);
      }

      const { ok, data } = await readRoute(
        await generarTitulosIARoute(
          jsonRequest("/api/title-generation", {
            categoryId: categories[0].id,
            contentLanguage: user.contentLanguage,
            inputs: {
              clienteTipo,
              tema,
              deseoCliente,
              ubicacionClientes: String(args.ubicacion_clientes ?? ""),
              ubicacionNegocio: String(args.ubicacion_negocio ?? ""),
            },
          }),
        ),
      );
      if (!ok) {
        return toolText(String(data.error ?? "No se pudieron crear los títulos."), true);
      }
      const titulos = (data.titles ?? []) as string[];
      if (titulos.length === 0) {
        return toolText("La IA no devolvió títulos nuevos esta vez (probablemente ya se sugirieron antes). Intenta con un tema o deseo del cliente más específico.", true);
      }
      const restantes = typeof data.requestsRemaining === "number" ? data.requestsRemaining : undefined;
      return toolText(
        `Se generaron ${titulos.length} título(s) para "${categories[0].name}":\n${titulos.map((t) => `- ${t}`).join("\n")}\n\n` +
          `Estos títulos NO están publicados todavía. Muéstraselos al usuario; si quiere publicarlos, usa publicar_titulos_en_categoria con los textos exactos.` +
          (restantes !== undefined ? `\n\nSolicitudes de este tipo restantes hoy: ${restantes}.` : ""),
      );
    },
  },
];
