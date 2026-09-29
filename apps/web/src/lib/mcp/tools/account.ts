import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { toolText, type ToolDef } from "./shared";

/**
 * Fase 2 del catálogo (`MCP_ACCIONES_UNIVERSALES.md`, "Panorama y
 * diagnóstico"): panorama de la cuenta, estado de configuración, categorías,
 * idiomas e integraciones. Todo de solo lectura, reusando los mismos route
 * handlers que ya usa la interfaz web — mismo patrón que
 * `opportunities.ts`.
 */
import { GET as dashboardStatsRoute } from "@/app/api/dashboard-stats/route";
import { GET as configurationStatusRoute } from "@/app/api/configuration-status/route";
import { GET as languagesRoute } from "@/app/api/languages/route";

type ConfigurationCheck = {
  id: string;
  label: string;
  configured: boolean;
  required: boolean;
  section: "platform" | "seo" | "social" | "content";
  description: string;
};

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export const ACCOUNT_TOOLS: ToolDef[] = [
  {
    name: "ver_resumen_cuenta",
    title: "Ver resumen de la cuenta",
    description:
      "Muestra cuántos artículos se publicaron hoy y este mes, el cupo diario/mensual, la racha de publicación y las categorías con más oportunidades. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const data = await readJson(await dashboardStatsRoute());
      const publicadoHoy = data.publishedToday ?? 0;
      const cupoDiario = data.dailyArticleLimit ?? "sin límite";
      const publicadoMes = data.publishedThisMonth ?? 0;
      const cupoMensual = data.monthlyArticleLimit ?? "sin límite";
      const racha = data.streak ?? 0;
      const pendientes = data.pendingOpportunityTitles ?? 0;
      const topCategorias = (data.topCategories ?? []) as Array<{ name: string; opportunities: number }>;
      const lineasCategorias = topCategorias.length
        ? topCategorias.map((c) => `  - ${c.name}: ${c.opportunities} oportunidades`).join("\n")
        : "  (sin categorías con oportunidades todavía)";
      return toolText(
        `Hoy: ${publicadoHoy} de ${cupoDiario} artículos publicados.\n` +
          `Este mes: ${publicadoMes} de ${cupoMensual} artículos publicados.\n` +
          `Racha de días consecutivos publicando: ${racha}.\n` +
          `Títulos pendientes de publicar en Oportunidades: ${pendientes}.\n` +
          `Categorías con más oportunidades:\n${lineasCategorias}`,
      );
    },
  },

  {
    name: "ver_estado_configuracion",
    title: "Ver estado de configuración",
    description:
      "Indica qué le falta configurar a la cuenta para poder publicar (credenciales, categorías, idioma, créditos de imagen) y qué integraciones opcionales tiene o no tiene conectadas. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const data = await readJson(await configurationStatusRoute());
      const checks = (data.checks ?? []) as ConfigurationCheck[];
      const faltantesRequeridos = checks.filter((c) => c.required && !c.configured);
      const opcionalesSinConectar = checks.filter((c) => !c.required && !c.configured);
      if (faltantesRequeridos.length === 0) {
        const extra = opcionalesSinConectar.length
          ? ` Integraciones opcionales sin conectar: ${opcionalesSinConectar.map((c) => c.label).join(", ")}.`
          : "";
        return toolText(`Todo lo necesario para publicar está configurado.${extra}`);
      }
      return toolText(
        `Falta configurar lo siguiente antes de poder publicar:\n${faltantesRequeridos
          .map((c) => `- ${c.label}: ${c.description}`)
          .join("\n")}`,
        true,
      );
    },
  },

  {
    name: "ver_integraciones",
    title: "Ver integraciones conectadas",
    description:
      "Lista qué integraciones (Google Search Console, Analytics, Bing, redes sociales) están conectadas y cuáles no. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const data = await readJson(await configurationStatusRoute());
      const checks = (data.checks ?? []) as ConfigurationCheck[];
      const relevantes = checks.filter((c) => c.section === "seo" || c.section === "social");
      if (relevantes.length === 0) return toolText("No hay integraciones para mostrar.");
      const lineas = relevantes.map((c) => `- ${c.label}: ${c.configured ? "conectada" : "sin conectar"}`);
      return toolText(lineas.join("\n"));
    },
  },

  {
    name: "listar_categorias",
    title: "Listar categorías",
    description: "Devuelve las categorías sincronizadas desde la plataforma del usuario. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const userId = await getCurrentUserId();
      const categorias = await prisma.category.findMany({
        where: { userId, source: { not: "archived" } },
        select: { name: true },
        orderBy: { name: "asc" },
      });
      if (categorias.length === 0) {
        return toolText("No hay categorías sincronizadas todavía. Sincronízalas desde Configuración → Cuenta.");
      }
      return toolText(`Categorías (${categorias.length}):\n${categorias.map((c) => `- ${c.name}`).join("\n")}`);
    },
  },

  {
    name: "listar_idiomas",
    title: "Listar idiomas disponibles",
    description: "Devuelve los idiomas sincronizados desde la plataforma y cuál está configurado para escribir los artículos. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const userId = await getCurrentUserId();
      const [data, user] = await Promise.all([
        readJson(await languagesRoute()),
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { contentLanguage: true } }),
      ]);
      const idiomas = (data.languages ?? []) as Array<{ name?: string; externalId?: string }>;
      const lineas = idiomas.length
        ? idiomas.map((l) => `- ${l.name ?? l.externalId}`).join("\n")
        : "(sin idiomas sincronizados)";
      return toolText(`Idioma actual de redacción: ${user.contentLanguage}.\nIdiomas disponibles:\n${lineas}`);
    },
  },

  {
    name: "ver_limites_y_creditos",
    title: "Ver límites y créditos",
    description: "Muestra el cupo diario y mensual de artículos, y si hay créditos de imagen disponibles. Solo lectura.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const userId = await getCurrentUserId();
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { dailyArticleLimit: true, monthlyArticleLimit: true, maxTitlesPerBatch: true, hasImageCredits: true },
      });
      return toolText(
        `Cupo diario: ${user.dailyArticleLimit ?? "sin límite"} artículos.\n` +
          `Cupo mensual: ${user.monthlyArticleLimit ?? "sin límite"} artículos.\n` +
          `Máximo por lote de publicación: ${user.maxTitlesPerBatch}.\n` +
          `Créditos de imagen: ${user.hasImageCredits ? "disponibles" : "agotados"}.`,
      );
    },
  },
];
