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

export const MAX_EXPLANATIONS_PER_DAY = 1;
export const EXPLANATION_WINDOW_MS = 24 * 3600_000;

/**
 * Cuándo podrá pedir otra explicación quien ya agotó su cupo (null si todavía
 * tiene). `requestedAt` son las solicitudes exitosas dentro de la ventana.
 */
export function nextExplanationAt(requestedAt: Date[], max: number, now: Date = new Date()): Date | null {
  const recent = requestedAt
    .filter((d) => now.getTime() - d.getTime() < EXPLANATION_WINDOW_MS)
    .sort((a, b) => a.getTime() - b.getTime());
  if (recent.length < max) return null;
  return new Date(recent[recent.length - max].getTime() + EXPLANATION_WINDOW_MS);
}

/** El resumen nunca pasa de tres párrafos (razón, cuidado con repetidos y tranquilidad), aunque el modelo escriba más. */
export function limitToThreeParagraphs(text: string): string {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.slice(0, 3).join("\n\n");
}

const ETIQUETAS_PEDIDO: Array<[string, string]> = [
  ["tema", "Tema que pediste"],
  ["clienteTipo", "A quién le escribes"],
  ["deseoCliente", "Lo que busca tu cliente"],
  ["ubicacionNegocio", "Dónde está tu negocio"],
  ["ubicacionClientes", "Dónde están tus clientes"],
];

/**
 * Convierte lo que la persona escribió en el formulario de Publicar (un objeto
 * técnico) en líneas legibles con etiqueta en español. Nunca devuelve JSON ni
 * claves del sistema; lo que no se reconoce se ignora.
 */
export function humanizeRequestInputs(inputs: unknown, maxChars = 220): Array<{ etiqueta: string; texto: string }> {
  if (!inputs || typeof inputs !== "object") return [];
  const record = inputs as Record<string, unknown>;
  const lines: Array<{ etiqueta: string; texto: string }> = [];
  for (const [key, etiqueta] of ETIQUETAS_PEDIDO) {
    const value = record[key];
    if (typeof value !== "string" || !value.trim()) continue;
    const clean = value.trim().replace(/\s+/g, " ");
    lines.push({ etiqueta, texto: clean.length > maxChars ? `${clean.slice(0, maxChars).trimEnd()}…` : clean });
  }
  return lines;
}
