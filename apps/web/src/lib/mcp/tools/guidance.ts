import { BASE_USER_MANUAL } from "@/content/manual-usuario";
import { getCurrentUserId } from "@/lib/current-user";
import { canUseSocialModule } from "@/lib/social-access";
import { toolText, type ToolDef } from "./shared";

/**
 * Pedido de Milton (30/9/2026): el asistente conectado por MCP debe poder
 * "leerse el manual" en cualquier momento — el MISMO manual que ya usa el
 * robot de ayuda dentro de la web (`apps/web/src/content/manual-usuario.ts`,
 * `BASE_USER_MANUAL`). No es un documento nuevo: es el que ya se mantiene
 * actualizado en cada PR, así que esta tool nunca queda desactualizada por
 * sí sola — si el manual cambia, la próxima llamada ya lo refleja.
 */

/** Extrae solo los títulos de sección (## / ###) para un índice corto. */
function tableOfContents(manual: string): string {
  return manual
    .split("\n")
    .filter((line) => /^#{2,3}\s/.test(line))
    .map((line) => line.replace(/^#{2,3}\s*/, "").replace(/\$\{[^}]+\}/g, "").trim())
    .filter(Boolean)
    .join("\n- ");
}

/**
 * Devuelve las secciones cuyo título O CONTENIDO coincide con el filtro (sin
 * acentos ni mayúsculas). Buscar solo en el título dejaba afuera secciones
 * reales — ej. "oportunidades" no aparece en el título "${MENU_NAMES.ia}"
 * (Contenido Generado por IA), pero sí en su cuerpo.
 */
function sectionsMatching(manual: string, filtro: string): string {
  const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const target = normalize(filtro);
  const lines = manual.split("\n");
  const blocks: string[] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (/^#{2,3}\s/.test(line)) {
      if (current && normalize(current.join("\n")).includes(target)) blocks.push(current.join("\n"));
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current && normalize(current.join("\n")).includes(target)) blocks.push(current.join("\n"));
  return blocks.join("\n\n---\n\n");
}

export const GUIDANCE_TOOLS: ToolDef[] = [
  {
    name: "mostrar_menu",
    title: "Mostrar menú de casos de uso",
    description: "Accionador directo para MENU. Devuelve cinco casos numerados de Artículos y, si Redes está habilitado, cinco casos separados de Redes. Usa esta tool cuando la persona escriba MENU; ofrece MÁS ARTÍCULOS o MÁS REDES para ampliar.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async () => {
      const socialEnabled = await canUseSocialModule(await getCurrentUserId());
      const articles = [
        "1) Ver y publicar títulos propios.",
        "2) Generar títulos con IA.",
        "3) Crear oportunidades con datos de Search Console.",
        "4) Revisar publicaciones, estados y enlaces.",
        "5) Consultar o cambiar preferencias de contenido.",
      ];
      const social = [
        "1) Ver redes conectadas y cupo diario.",
        "2) Generar propuestas para una o varias redes.",
        "3) Editar una propuesta pendiente.",
        "4) Publicar propuestas con confirmación.",
        "5) Revisar estados, enlaces, errores y reintentos.",
      ];
      return toolText(`ARTÍCULOS\n${articles.join("\n")}\n${socialEnabled ? `\nREDES Y BLOGS\n${social.join("\n")}` : "\nREDES Y BLOGS: no habilitado por el HUB."}\n\nEscribe «MÁS ARTÍCULOS» o «MÁS REDES» para ver cinco casos adicionales.`);
    },
  },
  {
    name: "ver_manual_seo_total",
    title: "Ver el manual de SEO Total",
    description:
      "Propósito: consultar el manual real y actualizado de la plataforma — cómo funciona cada módulo, qué significa cada botón, orden recomendado de pasos.\n" +
      "Cuándo usarla: no tienes claro cómo guiar al usuario, te pide ayuda general, o necesitas verificar un paso exacto de la interfaz web antes de explicarlo.\n" +
      "Cuándo NO usarla: para el estado actual de la cuenta del usuario (usa ver_estado_configuracion, ver_resumen_cuenta, etc.) — el manual explica cómo funciona la plataforma en general, no los datos de esta cuenta.\n" +
      "Contexto necesario: ninguno. Sin argumentos devuelve el índice completo; con 'tema' devuelve solo las secciones que coincidan (ej. 'oportunidades', 'configuración', 'redes sociales').\n" +
      "Siguiente paso típico: explicarle al usuario lo que encontraste en tus propias palabras, sin inventar nada que no esté en el manual.",
    inputSchema: {
      type: "object",
      properties: {
        tema: { type: "string", description: "Opcional. Palabra o frase para buscar una sección concreta del manual (ej. 'categorías', 'idioma', 'redes sociales')." },
      },
      additionalProperties: false,
    },
    requiredScope: "oportunidades:leer",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: async (args) => {
      const tema = typeof args.tema === "string" ? args.tema.trim() : "";
      if (!tema) {
        return toolText(
          `Índice del manual de SEO Total. Llama de nuevo con "tema" para leer una sección completa (ej. tema="oportunidades").\n\n- ${tableOfContents(BASE_USER_MANUAL)}`,
        );
      }
      const encontrado = sectionsMatching(BASE_USER_MANUAL, tema);
      if (!encontrado) {
        return toolText(
          `No encontré ninguna sección del manual que coincida con "${tema}". Llama sin argumentos para ver el índice completo.`,
          true,
        );
      }
      return toolText(encontrado);
    },
  },
];
