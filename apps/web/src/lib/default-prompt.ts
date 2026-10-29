import { prisma } from "@auto-articulos/db";

// Estilo editorial que toda cuenta nueva usa por defecto (decisión de Milton, 19/10/2026).
// STANDARD (defaultPromptId = NULL) solo queda como elección explícita de la persona.
export const DEFAULT_ARTICLE_PROMPT_NAME = "GENERADOR DE ARTÍCULOS PROBLEMA SOLUCION";

/** Datos para `prisma.user.create`: el prompt predeterminado o nada si aún no existe. */
export async function newUserDefaultPromptData(): Promise<{ defaultPromptId?: string }> {
  try {
    const prompt = await prisma.prompt.findUnique({ where: { name: DEFAULT_ARTICLE_PROMPT_NAME }, select: { id: true } });
    if (prompt) return { defaultPromptId: prompt.id };
    console.warn(`[default-prompt] No existe el prompt "${DEFAULT_ARTICLE_PROMPT_NAME}"; la cuenta nueva queda con el estándar.`);
  } catch (error) {
    console.warn("[default-prompt] No se pudo leer el prompt predeterminado:", error);
  }
  return {};
}
