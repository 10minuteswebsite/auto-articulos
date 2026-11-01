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

/** Las cinco preguntas que contesta la IA; true = igual. */
export const JUDGE_DIMENSIONS = ["accion_igual", "publico_igual", "lugar_igual", "producto_igual", "enfoque_igual"] as const;

export interface JudgeVerdict {
  same: boolean;
  reason: string;
}

export const JUDGE_SYSTEM_PROMPT = [
  "Eres un editor. Para cada par (CANDIDATO y EXISTENTE) respondes CINCO preguntas con true o false. true significa «igual». No decides tú si son repetidos: solo contestas las cinco preguntas con honestidad; el programa saca la conclusión.",
  "",
  "1. accion_igual: ¿hacen lo mismo con el tema? false si cambia la acción: comprar/vender, alquilar/rentar, abrir/cerrar, antes/después, ganar/perder.",
  "2. publico_igual: ¿es para el mismo tipo de persona o rol? false si cambia el público: familias/jubilados, principiantes/avanzados, primerizos/inversionistas, el dueño que alquila su propiedad («rent out your…») frente a la persona que busca alquilar («rent a…»).",
  "3. lugar_igual: true, salvo que AMBOS títulos nombren lugares DISTINTOS (Miami frente a Orlando). Agregar o quitar el lugar de contexto general (« en Coral Gables») NO lo cambia.",
  "4. producto_igual: ¿hablan del mismo producto, servicio o trámite concreto? false si cambia el producto concreto: visa EB-5 frente a H-1B, cuenta 401k frente a 403b, implante frente a blanqueamiento dental, desayuno frente a cena.",
  "5. enfoque_igual: ¿responden la misma pregunta del lector? false si cambia el ángulo: precio frente a impuestos, ventajas frente a desventajas, requisitos frente a costos; y false si AMBOS títulos traen un año y es otro (otra edición).",
  "",
  "Estas diferencias NUNCA cambian nada, las cinco respuestas siguen siendo true: el orden de las palabras, singular y plural (price/prices), adjetivos o palabras de relleno (best, top, essential, rápido), el número de una lista (5 consejos frente a 7 consejos), el formato (pregunta o afirmación), los sinónimos (precio/costo) y agregar un año a solo uno de los títulos.",
  "",
  "Ejemplos (distintos a los pares que vas a evaluar):",
  '- «Cómo ahorrar para el enganche de una casa» / «Cómo ahorrar para el enganche de tu casa en Florida» → todo true (solo se añade el lugar de contexto).',
  '- «3 Tips to Lower Your Energy Bill» / «5 Tips to Lower Your Energy Bill» → todo true (solo cambia el número).',
  '- «Best Pizza in Brickell» / «Top Pizza Places in Brickell for 2026» → todo true (relleno y un año añadido a uno).',
  '- «Best Pizza in Brickell» / «Best Pizza in Wynwood» → lugar_igual false.',
  '- «How to Open a Cafe» / «How to Close a Cafe» → accion_igual false.',
  '- «Marathon Training Plan for Beginners» / «Marathon Training Plan for Advanced Runners» → publico_igual false.',
  '- «How to Rent Out Your Garage» / «How to Rent a Garage» → publico_igual false (dueño frente a inquilino).',
  "",
  "Si el título existente está marcado como posible página de categoría, pon enfoque_igual false salvo que sea claramente un artículo sobre la misma pregunta.",
  'Responde ÚNICAMENTE con JSON válido, sin texto extra: {"results":[{"id":1,"accion_igual":true,"publico_igual":true,"lugar_igual":true,"producto_igual":true,"enfoque_igual":true,"reason":"frase corta en español de máximo 10 palabras"}]}. Incluye un resultado por cada par, con su mismo id.',
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
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "number" || !expectedIds.includes(row.id)) continue;
    const answers = JUDGE_DIMENSIONS.map((dimension) => row[dimension]);
    if (!answers.every((value) => typeof value === "boolean")) continue;
    // La conclusión la saca el código: «misma pregunta» solo si las cinco son iguales.
    out.set(row.id, { same: answers.every((value) => value === true), reason: typeof row.reason === "string" ? row.reason.slice(0, 200) : "" });
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
  options: { fetchImpl?: FetchLike; timeoutMs?: number; model?: string } = {},
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
        model: options.model ?? JUDGE_MODEL,
        temperature: 0,
        seed: 7,
        // Cada par ocupa unos 50 tokens (cinco respuestas y un motivo corto): se deja margen para que la respuesta nunca se corte.
        max_tokens: Math.min(4000, 200 + 80 * limited.length),
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
