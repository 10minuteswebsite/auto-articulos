import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { PATCH as meRoute } from "@/app/api/me/route";
import { consumeConfirmation, issueConfirmation } from "../confirmation";
import { loadWritingStyles, matchWritingStyle } from "../writing-style";
import { jsonRequest, readRoute, toolText, type ToolDef } from "./shared";

export const WRITING_STYLE_TOOLS: ToolDef[] = [
  {
    name: "listar_estilos_escritura",
    title: "Listar estilos de escritura",
    description:
      "Propósito: ver los estilos de escritura con los que se pueden generar los artículos (STANDARD y los estilos propios de SEO TOTAL) y cuál tiene la cuenta por defecto.\n" +
      "Cuándo usarla: ANTES de publicar si la persona menciona un estilo («en estilo guía», «comparativo»), o si pregunta con qué estilo se escriben sus artículos.\n" +
      "Cuándo NO usarla: no cambia nada; para cambiar el estilo por defecto de la cuenta usa cambiar_estilo_escritura_por_defecto.\n" +
      "Contexto necesario: ninguno.\n" +
      "Siguiente paso típico: publicar con el parámetro estilo en publicar_oportunidades_seleccionadas, publicar_categoria o publicar_titulos_en_categoria. Sin estilo se usa el de la cuenta.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const userId = await getCurrentUserId();
      const [styles, user] = await Promise.all([
        loadWritingStyles(),
        prisma.user.findUnique({ where: { id: userId }, select: { defaultPromptId: true } }),
      ]);
      const mark = (id: string | null) => (user?.defaultPromptId === id ? " ← por defecto de la cuenta" : "");
      const lines = [
        `- STANDARD (lo genera directamente 10minutesWebsite)${mark(null)}`,
        ...styles.map((style) => `- ${style.name}${mark(style.id)}`),
      ];
      return toolText(`Estilos de escritura disponibles:\n${lines.join("\n")}\n\nSin indicar estilo, los artículos se escriben con el de la cuenta. Puedes cambiar el estilo por defecto de la cuenta con cambiar_estilo_escritura_por_defecto, pero solo si la persona lo pide o lo aprueba.`);
    },
  },

  {
    name: "cambiar_estilo_escritura_por_defecto",
    title: "Cambiar el estilo de escritura por defecto",
    description:
      "Propósito: cambiar el estilo de escritura por defecto de la cuenta (el que se usa en TODOS los artículos cuando no se indica otro, también en la web). Con «STANDARD» vuelve al estilo estándar de 10minutesWebsite.\n" +
      "Cuándo usarla: la persona pide cambiar el estilo por defecto («déjame las guías como estilo normal», «vuelve a STANDARD»), o quiere usar STANDARD y la cuenta tiene otro por defecto.\n" +
      "Cuándo NO usarla: para publicar UN artículo en otro estilo sin cambiar el de la cuenta (usa el parámetro estilo al publicar). Nunca la uses por tu cuenta ni sin que la persona lo haya pedido o aprobado.\n" +
      "Contexto necesario: nombre del estilo (confírmalo con listar_estilos_escritura).\n" +
      "Siguiente paso típico: llamar con confirmar=false, decirle a la persona el cambio exacto y esperar su sí; luego confirmar=true con el comprobante.",
    inputSchema: {
      type: "object",
      properties: {
        estilo: { type: "string", description: "Estilo que será el de la cuenta: STANDARD, comparativos, estadísticos, guías o problema solución." },
        confirmar: { type: "boolean", description: "false para ver el cambio; true solo tras la confirmación de la persona y con el comprobante." },
        confirmacion: { type: "string", description: "Comprobante de la vista previa. Obligatorio al confirmar=true." },
      },
      required: ["estilo"],
      additionalProperties: false,
    },
    requiredScope: "oportunidades:publicar",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async (args) => {
      const userId = await getCurrentUserId();
      const styles = await loadWritingStyles();
      const match = matchWritingStyle(args.estilo, styles);
      if (match.kind === "default") return toolText("Indica a qué estilo quieres cambiar el de la cuenta (STANDARD, comparativos, estadísticos, guías o problema solución).", true);
      if (match.kind === "ambiguous") return toolText(`«${String(args.estilo)}» coincide con varios estilos: ${match.options.map((s) => s.name).join(" | ")}. Pregúntale a la persona cuál quiere.`, true);
      if (match.kind === "none") return toolText(`No existe el estilo «${String(args.estilo)}». Los disponibles son: STANDARD | ${styles.map((s) => s.name).join(" | ")}.`, true);
      const targetId = match.kind === "match" ? match.style.id : null;
      const targetName = match.kind === "match" ? match.style.name : "STANDARD (10minutesWebsite)";
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { defaultPromptId: true, defaultPrompt: { select: { name: true } } } });
      if ((user?.defaultPromptId ?? null) === targetId) return toolText(`«${targetName}» ya es el estilo por defecto de la cuenta; no hay nada que cambiar.`);
      const operation = { promptId: targetId ?? "standard" };
      if (args.confirmar !== true) {
        const token = await issueConfirmation({ userId, toolName: "cambiar_estilo_escritura_por_defecto", operation });
        return toolText(`Sin cambiar todavía: el estilo por defecto pasaría de «${user?.defaultPrompt?.name ?? "STANDARD (10minutesWebsite)"}» a «${targetName}». Afecta a todos los artículos que se publiquen desde ahora, también desde la web, hasta que se vuelva a cambiar.\n\nPídele confirmación a la persona y vuelve a llamar con confirmar=true y confirmacion="${token}".`);
      }
      const confirmed = await consumeConfirmation({ userId, toolName: "cambiar_estilo_escritura_por_defecto", operation, token: args.confirmacion });
      if (!confirmed) return toolText("La confirmación expiró, ya fue usada o no corresponde a este cambio. Genera una vista previa nueva.", true);
      const { ok, data } = await readRoute(await meRoute(jsonRequest("/api/me", { defaultPromptId: targetId }) as never));
      return ok ? toolText(`Listo: el estilo por defecto de la cuenta ahora es «${targetName}».`) : toolText(String(data.error ?? "No se pudo cambiar el estilo."), true);
    },
  },
];
