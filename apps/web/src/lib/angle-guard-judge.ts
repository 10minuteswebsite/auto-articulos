// JUEZ DE IA de la Guardia de ángulos: decide si dos títulos hacen la MISMA
// pregunta a un lector. Una sola llamada agrupada, con el mismo modelo que el
// resto del sistema (gpt-4o-mini; no se cambia sin aprobación de Milton).
//
// FASE 1: no está conectado a ningún flujo de usuarios. Falla hacia lo seguro:
// cualquier problema (red, tiempo, respuesta rara) devuelve null y la guardia
// decide solo con el código. Nunca lanza.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
export const JUDGE_MODEL = "gpt-4o-mini";
export const JUDGE_TIMEOUT_MS = 10_000;
export const JUDGE_MAX_PAIRS = 40;

export interface JudgePair {
  id: number;
  candidate: string;
  existing: string;
  /** El título existente se dedujo de una URL del sitio y podría ser una página de categoría. */
  existingMayBeCategoryPage?: boolean;
}

export interface JudgeVerdict {
  same: boolean;
  reason: string;
}

export const JUDGE_SYSTEM_PROMPT = [
  "Eres un editor que decide si dos títulos de artículos hacen la MISMA pregunta a un lector.",
  "Regla: son «misma pregunta» (same=true) si un lector con la misma necesidad quedaría satisfecho con cualquiera de los dos artículos.",
  "",
  "NO cambian la pregunta (si solo cambia esto, responde same=true):",
  "- el orden de las palabras, el singular y el plural (price/prices), y los adjetivos o palabras de relleno (best, top, essential, rápido, mejor);",
  "- el número de una lista: 5 consejos y 7 consejos es la MISMA pregunta (el número de una lista nunca cambia la pregunta);",
  "- agregar o quitar un sufijo con el lugar o el negocio de contexto general («… en Coral Gables» frente a la versión sin ciudad) cuando el resto del título es igual;",
  "- agregar un año a uno de los títulos cuando el otro no trae año;",
  "- el formato (pregunta o afirmación) y los sinónimos (precio/costo).",
  "",
  "SÍ cambian la pregunta (responde same=false):",
  "- la acción: comprar/vender, alquilar/rentar, abrir/cerrar, antes/después;",
  "- el público: familias/jubilados, principiantes/avanzados, primerizos/inversionistas;",
  "- un lugar DISTINTO (Miami frente a Orlando);",
  "- el producto o servicio concreto (visa EB-5 frente a H-1B), la comparación (ventajas/desventajas) o la pregunta que se responde;",
  "- el año cuando AMBOS títulos traen un año y es otro (evento de 2025 frente a 2026 = otra edición).",
  "",
  "Ejemplos (distintos a los que te voy a pedir):",
  "- «Cómo ahorrar para el enganche de una casa» / «Cómo ahorrar para el enganche de tu casa en Florida» → same=true (solo se añade el lugar de contexto).",
  "- «3 Tips to Lower Your Energy Bill» / «5 Tips to Lower Your Energy Bill» → same=true (solo cambia el número de la lista).",
  "- «Best Pizza in Brickell» / «Top Pizza Places in Brickell for 2026» → same=true (relleno y un año añadido).",
  "- «Best Pizza in Brickell» / «Best Pizza in Wynwood» → same=false (otro lugar).",
  "- «How to Open a Cafe» / «How to Close a Cafe» → same=false (otra acción).",
  "- «Marathon Training Plan for Beginners» / «Marathon Training Plan for Advanced Runners» → same=false (otro público).",
  "",
  "Si el título existente está marcado como posible página de categoría, di same=true SOLO si es claramente un artículo sobre la misma pregunta.",
  "Ante una duda genuina entre dos preguntas distintas, responde same=false: es preferible dejar pasar un título parecido que bloquear uno distinto.",
  'Responde ÚNICAMENTE con JSON válido, sin texto extra: {"results":[{"id":1,"same":false,"reason":"frase corta en español"}]}. Incluye un resultado por cada par, con su mismo id.',
].join("\n");

export function buildJudgeMessages(pairs: JudgePair[]): { system: string; user: string } {
  const lines = pairs.slice(0, JUDGE_MAX_PAIRS).map(
    (p) =>
      `id ${p.id}\nCANDIDATO: ${clip(p.candidate)}\nEXISTENTE: ${clip(p.existing)}${p.existingMayBeCategoryPage ? "\n(posible página de categoría)" : ""}`,
  );
  return { system: JUDGE_SYSTEM_PROMPT, user: `Evalúa estos pares:\n\n${lines.join("\n\n")}` };
}

const clip = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 240);

/** Interpreta la respuesta del modelo. Devuelve null si no se puede confiar en ella. */
export function parseJudgeOutput(raw: string, expectedIds: number[]): Map<number, JudgeVerdict> | null {
  let parsed: unknown;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const results = (parsed as { results?: unknown })?.results;
  if (!Array.isArray(results)) return null;
  const out = new Map<number, JudgeVerdict>();
  for (const item of results) {
    const row = item as { id?: unknown; same?: unknown; reason?: unknown };
    if (typeof row.id !== "number" || typeof row.same !== "boolean") continue;
    if (!expectedIds.includes(row.id)) continue;
    out.set(row.id, { same: row.same, reason: typeof row.reason === "string" ? row.reason.slice(0, 200) : "" });
  }
  // Una respuesta que no cubre TODOS los pares no es confiable.
  if (!expectedIds.every((id) => out.has(id))) return null;
  return out;
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Llama al juez. Devuelve null ante cualquier problema (nunca lanza). */
export async function callJudge(
  pairs: JudgePair[],
  apiKey: string | undefined,
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<Map<number, JudgeVerdict> | null> {
  if (!apiKey || pairs.length === 0) return null;
  const limited = pairs.slice(0, JUDGE_MAX_PAIRS);
  const { system, user } = buildJudgeMessages(limited);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? JUDGE_TIMEOUT_MS);
  try {
    const doFetch = (options.fetchImpl ?? (fetch as unknown as FetchLike));
    const response = await doFetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        temperature: 0,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? parseJudgeOutput(content, limited.map((p) => p.id)) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface JudgeValidation {
  total: number;
  correct: number;
  accuracyPct: number;
  /** Pares distintos que el juez marcó como «misma pregunta» (lo más grave: bloquearía un título legítimo). */
  falseSame: Array<{ a: string; b: string; reason: string }>;
  /** Repetidos que el juez dejó pasar. */
  missedSame: Array<{ a: string; b: string; reason: string }>;
  /** Cumple la condición de la especificación: ≥ 90 % de aciertos y cero falsos «misma pregunta». */
  passes: boolean;
}

export function scoreJudge(
  pairs: Array<{ a: string; b: string; same: boolean }>,
  verdicts: Map<number, JudgeVerdict>,
): JudgeValidation {
  let correct = 0;
  const falseSame: JudgeValidation["falseSame"] = [];
  const missedSame: JudgeValidation["missedSame"] = [];
  pairs.forEach((p, index) => {
    const v = verdicts.get(index + 1);
    if (!v) return;
    if (v.same === p.same) correct += 1;
    else if (v.same) falseSame.push({ a: p.a, b: p.b, reason: v.reason });
    else missedSame.push({ a: p.a, b: p.b, reason: v.reason });
  });
  const accuracyPct = pairs.length ? Math.round((100 * correct) / pairs.length) : 0;
  return { total: pairs.length, correct, accuracyPct, falseSame, missedSame, passes: accuracyPct >= 90 && falseSame.length === 0 };
}
