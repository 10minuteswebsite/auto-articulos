import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { loadWritingStyles } from "../writing-style";
import { toolText, type ToolDef } from "./shared";

export const WRITING_STYLE_TOOLS: ToolDef[] = [
  {
    name: "listar_estilos_escritura",
    title: "Listar estilos de escritura",
    description:
      "Propósito: ver los estilos de escritura con los que se pueden generar los artículos (STANDARD y los estilos propios de SEO TOTAL) y cuál tiene la cuenta por defecto.\n" +
      "Cuándo usarla: ANTES de publicar si la persona menciona un estilo («en estilo guía», «comparativo»), o si pregunta con qué estilo se escriben sus artículos.\n" +
      "Cuándo NO usarla: no cambia el estilo por defecto de la cuenta; eso se hace en la web (Configuración → Contenido).\n" +
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
      return toolText(`Estilos de escritura disponibles:\n${lines.join("\n")}\n\nSin indicar estilo, los artículos se escriben con el de la cuenta. No cambies el estilo por defecto por tu cuenta: eso lo decide la persona en Configuración → Contenido.`);
    },
  },
];
