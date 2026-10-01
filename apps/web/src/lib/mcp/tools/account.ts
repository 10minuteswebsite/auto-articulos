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
      "Propósito: panorama general — cuánto se publicó hoy y este mes, cupo restante, racha y categorías con más oportunidades.\n" +
      "Cuándo usarla: el usuario pregunta '¿cómo voy?', '¿cuánto llevo publicado?', o para orientarte antes de proponer una acción.\n" +
      "Cuándo NO usarla: para saber QUÉ falta configurar (usa ver_estado_configuracion) o el detalle de una publicación puntual (usa estado_de_publicaciones).\n" +
      "Contexto necesario: ninguno.\n" +
      "Siguiente paso típico: si hay cupo y oportunidades pendientes, ofrecer publicarlas.",
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
      "Propósito: saber qué le falta a la cuenta para poder publicar (credenciales, categorías, idioma, créditos) y qué integraciones opcionales le faltan.\n" +
      "Cuándo usarla: SIEMPRE antes de iniciar un flujo de publicación nuevo (primer paso recomendado), o cuando cualquier acción falle sin motivo claro.\n" +
      "Cuándo NO usarla: para ver cuánto se publicó (usa ver_resumen_cuenta) o el detalle de cada integración (usa ver_integraciones).\n" +
      "Contexto necesario: ninguno.\n" +
      "Siguiente paso típico: si falta algo obligatorio, explicárselo al usuario en lenguaje claro y detener el flujo hasta que lo resuelva en la web; si todo está bien, seguir con listar_categorias o listar_oportunidades.",
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
      "Propósito: detalle de qué integraciones externas (Google Search Console, Analytics, Bing, redes sociales) están conectadas y cuáles no.\n" +
      "Cuándo usarla: antes de crear_oportunidades (para confirmar que Search Console está conectado), o cuando el usuario pregunta por una red social o buscador puntual.\n" +
      "Cuándo NO usarla: para el panorama general de configuración obligatoria (usa ver_estado_configuracion, que ya incluye esto resumido).\n" +
      "Contexto necesario: ninguno.\n" +
      "Siguiente paso típico: si falta una integración que el usuario necesita, indícale que se conecta desde Configuración → Conexiones (no puedes conectarla vos desde el chat).",
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
    description:
      "Propósito: listar las categorías reales sincronizadas de la cuenta.\n" +
      "Cuándo usarla: antes de publicar (para confirmar el nombre exacto de una categoría) o cuando el usuario pregunta en qué categorías puede publicar.\n" +
      "Cuándo NO usarla: no reemplaza a ver_estado_configuracion para saber si hay categorías configuradas en general.\n" +
      "Contexto necesario: ninguno.\n" +
      "Siguiente paso típico: usar el nombre exacto devuelto aquí en crear_titulos_con_ia, publicar_titulos_en_categoria o publicar_categoria — nunca inventar un nombre de categoría.",
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
    description:
      "Propósito: ver el idioma actual de redacción de artículos y los idiomas disponibles en la cuenta.\n" +
      "Cuándo usarla: el usuario pregunta en qué idioma se escribe, o quiere confirmar antes de publicar en una cuenta con varios idiomas.\n" +
      "Cuándo NO usarla: no permite CAMBIAR el idioma — eso solo se hace en Configuración → Cuenta, esta tool es solo lectura.\n" +
      "Contexto necesario: ninguno.\n" +
      "Siguiente paso típico: si el usuario quiere otro idioma, indícale que lo cambie desde la web; no puedes hacerlo por él.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const userId = await getCurrentUserId();
      const [idiomas, user] = await Promise.all([
        prisma.language.findMany({ where: { userId, platform: "10minutesWebsite" }, select: { name: true, externalId: true }, orderBy: { name: "asc" } }),
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { contentLanguage: true } }),
      ]);
      const lineas = idiomas.length
        ? idiomas.map((l) => `- ${l.name ?? l.externalId}`).join("\n")
        : "(sin idiomas sincronizados)";
      return toolText(`Idioma actual de redacción: ${user.contentLanguage}.\nIdiomas disponibles:\n${lineas}`);
    },
  },

  {
    name: "ver_limites_y_creditos",
    title: "Ver límites y créditos",
    description:
      "Propósito: ver el cupo diario/mensual de artículos, el máximo por lote, y si hay créditos de imagen disponibles.\n" +
      "Cuándo usarla: antes de un lote grande de publicación, o cuando una publicación falla y sospechas que fue por cupo agotado.\n" +
      "Cuándo NO usarla: para ver cuánto YA se publicó (usa ver_resumen_cuenta, que tiene esos números).\n" +
      "Contexto necesario: ninguno.\n" +
      "Siguiente paso típico: si el cupo está agotado, explicarle al usuario cuándo se renueva en vez de reintentar la publicación.",
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
