import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

/**
 * Estilos de escritura (los «Prompt» de Publicar → «Estilo de escritura»).
 * STANDARD no es un prompt nuestro: lo genera directamente 10minutesWebsite
 * cuando no se manda ningún `promptId`. Los otros cuatro (comparativos,
 * estadísticos, guías, problema-solución) son prompts propios de SEO TOTAL.
 * La web los manda como `promptId`; sin `promptId` las rutas usan el estilo por
 * defecto de la cuenta (`User.defaultPromptId`) y, si no hay, el estándar de la
 * plataforma. El asistente los nombra («guías», «comparativos»), así que aquí se
 * traducen a un `promptId` real sin aceptar coincidencias dudosas.
 */
export type WritingStyle = { id: string; name: string };

export type StyleMatch =
  | { kind: "default" }
  | { kind: "standard" }
  | { kind: "match"; style: WritingStyle }
  | { kind: "ambiguous"; options: WritingStyle[] }
  | { kind: "none" };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

const STANDARD_WORDS = new Set(["standard", "estandar", "predeterminado", "estilo predeterminado", "de la plataforma"]);

/** Sin nombre = el estilo por defecto de la cuenta; «standard» = el estándar de 10minutesWebsite (sin prompt propio). */
export function matchWritingStyle(input: unknown, styles: WritingStyle[]): StyleMatch {
  const wanted = typeof input === "string" ? normalize(input) : "";
  if (wanted === "" || wanted === "por defecto" || wanted === "default") return { kind: "default" };
  if (STANDARD_WORDS.has(wanted)) return { kind: "standard" };
  const exact = styles.filter((style) => normalize(style.name) === wanted);
  if (exact.length === 1) return { kind: "match", style: exact[0] };
  const words = wanted.split(" ").filter((word) => word.length > 2);
  const partial = styles.filter((style) => {
    const name = normalize(style.name);
    return name.includes(wanted) || (words.length > 0 && words.every((word) => name.includes(word)));
  });
  if (partial.length === 1) return { kind: "match", style: partial[0] };
  if (partial.length > 1) return { kind: "ambiguous", options: partial };
  return { kind: "none" };
}

export async function loadWritingStyles(): Promise<WritingStyle[]> {
  return prisma.prompt.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

/** Resuelve el argumento `estilo` de una herramienta. `promptId` solo viene si la persona pidió un estilo concreto. */
export async function resolveStyleArg(input: unknown): Promise<{ promptId?: string; label?: string; error?: string }> {
  const match = matchWritingStyle(input, await loadWritingStyles());
  if (match.kind === "default") return {};
  if (match.kind === "standard") {
    // Las rutas de publicación, sin promptId, usan el estilo por defecto de la cuenta: no se puede
    // forzar STANDARD desde aquí si la cuenta tiene otro por defecto. Se dice claro en vez de usar otro.
    const user = await prisma.user.findUnique({ where: { id: await getCurrentUserId() }, select: { defaultPrompt: { select: { name: true } } } });
    return user?.defaultPrompt
      ? { error: `Esta cuenta tiene como estilo por defecto «${user.defaultPrompt.name}», así que no puedo usar STANDARD desde aquí. Si la persona quiere STANDARD, puedes cambiar el estilo por defecto de la cuenta con cambiar_estilo_escritura_por_defecto (pidiéndole confirmación), o elegir uno de los estilos disponibles (listar_estilos_escritura).` }
      : {};
  }
  if (match.kind === "match") return { promptId: match.style.id, label: match.style.name };
  const available = (await loadWritingStyles()).map((style) => style.name).join(" | ");
  if (match.kind === "ambiguous") return { error: `«${String(input)}» coincide con varios estilos: ${match.options.map((s) => s.name).join(" | ")}. Pregúntale a la persona cuál quiere.` };
  return { error: `No existe el estilo «${String(input)}». Los disponibles son: STANDARD | ${available}. Usa listar_estilos_escritura.` };
}

export const STYLE_PROP = {
  type: "string",
  description:
    "Opcional. Estilo de escritura de los artículos, por nombre (por ejemplo «guías», «comparativos», «estadísticos», «problema solución»). Si no se indica, se usa el estilo por defecto de la cuenta. Consulta los disponibles con listar_estilos_escritura.",
};
