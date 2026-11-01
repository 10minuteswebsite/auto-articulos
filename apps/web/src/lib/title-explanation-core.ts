import { normalizeTitleKey } from "@auto-articulos/shared/src/published-title";

// Parte pura (sin base de datos) de la explicación bajo demanda, con pruebas.

function tokens(value: string): Set<string> {
  return new Set(normalizeTitleKey(value).split(" ").filter((word) => word.length > 3));
}

/** Parecido entre dos títulos (0–100): palabras significativas compartidas. */
export function similarityPct(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return Math.round((shared / (left.size + right.size - shared)) * 100);
}

/** El resumen nunca pasa de dos párrafos, aunque el modelo escriba más. */
export function limitToTwoParagraphs(text: string): string {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.slice(0, 2).join("\n\n");
}
