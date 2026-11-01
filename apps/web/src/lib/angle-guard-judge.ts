// JUEZ DE IA de la Guardia de ángulos: decide si dos títulos hacen la MISMA
// pregunta a un lector. Una sola llamada agrupada, con el mismo modelo que el
// modelo de mayor nivel (gpt-4.1): en la validación del 2026-11-01 gpt-4o-mini
// solo llegó a 70–89 %, mientras gpt-4.1 y gpt-4o sacaron 27/27 y 10/10 sin errores graves.
//
// FASE 1: no está conectado a ningún flujo de usuarios. Falla hacia lo seguro:
// cualquier problema (red, tiempo, respuesta rara) devuelve null y la guardia
// decide solo con el código. Nunca lanza.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
export const JUDGE_MODEL = "gpt-4.1";
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

// ---------------------------------------------------------------------------
// JUEZ POR LISTA: por cada título nuevo recibe una lista de títulos existentes
// (los más cercanos y los más recientes de la categoría) y dice cuáles hacen la
// MISMA pregunta, aunque no compartan palabras. Es lo que atrapa los sinónimos
// entre una tanda y la siguiente. Misma regla de falla segura: nunca lanza.
// ---------------------------------------------------------------------------

export interface ListJudgeItem {
  id: number;
  candidate: string;
  neighbors: Array<{ id: number; title: string; mayBeCategoryPage?: boolean }>;
}

export interface ListJudgeVerdict {
  sameAs: number[];
  reason: string;
}

export const LIST_JUDGE_SYSTEM_PROMPT = [
  "Eres un editor. Para cada CANDIDATO recibes una lista de títulos EXISTENTES con su número. Dime cuáles de los existentes hacen la MISMA pregunta que el candidato, aunque usen palabras distintas (sinónimos). Si ninguno, responde una lista vacía.",
  "Regla: hacen la misma pregunta si un lector con la misma necesidad quedaría satisfecho con cualquiera de los dos artículos.",
  "",
  "NO cambian la pregunta (si solo cambia esto, SÍ son la misma pregunta):",
  "- el orden de las palabras, singular y plural, y los adjetivos o palabras de relleno (best, top, esencial, rápido, mejor);",
  "- el número de una lista (5 consejos frente a 7 consejos);",
  "- los sinónimos: elegir/seleccionar, evitar/no cometer, costarte/perder dinero, seguro/plan, precio/costo, cómo/qué pasos;",
  "- el formato (pregunta o afirmación) y agregar o quitar el lugar de contexto general del sitio o un año en uno solo de los títulos.",
  "",
  "SÍ cambian la pregunta (entonces NO la marques):",
  "- la acción: comprar/vender, contratar/cancelar, alquilar/rentar, abrir/cerrar, antes/después;",
  "- el público: familias/jubilados, trabajadores independientes/pequeñas empresas, niños/adultos, principiantes/avanzados;",
  "- un lugar DISTINTO (Miami frente a Orlando), un producto o trámite concreto distinto (Medicaid frente a Marketplace, dental frente a visión);",
  "- el ángulo: costos frente a beneficios, requisitos frente a documentos, ventajas frente a desventajas, y un año distinto en ambos títulos.",
  "",
  "Ejemplos (distintos a los casos que vas a evaluar):",
  "- «Errores al elegir una mudanza» con existentes [1 «Cómo contratar una mudanza», 2 «Fallas que debes evitar al seleccionar una empresa de mudanzas»] → same_as [2].",
  "- «Best Pizza in Brickell» con existentes [1 «Top Pizza Places in Brickell for 2026», 2 «Best Pizza in Wynwood»] → same_as [1].",
  "- «Cómo abrir un café» con existentes [1 «Cómo cerrar un café», 2 «Costos de un local para café»] → same_as [].",
  "",
  "Si un existente está marcado como posible página de categoría, inclúyelo solo si claramente es un artículo sobre la misma pregunta.",
  "Ante una duda genuina entre dos preguntas distintas, NO lo marques: es preferible dejar pasar un título parecido que bloquear uno distinto.",
  'Responde ÚNICAMENTE con JSON válido, sin texto extra: {"results":[{"id":1,"same_as":[2],"reason":"frase corta en español de máximo 10 palabras"}]}. Incluye un resultado por cada candidato, con su mismo id.',
].join("\n");

export function buildListJudgeMessages(items: ListJudgeItem[]): { system: string; user: string } {
  const blocks = items.map(
    (item) =>
      `CANDIDATO ${item.id}: ${clip(item.candidate)}\nEXISTENTES:\n${item.neighbors
        .map((n) => `  ${n.id}. ${clip(n.title)}${n.mayBeCategoryPage ? " (posible página de categoría)" : ""}`)
        .join("\n")}`,
  );
  return { system: LIST_JUDGE_SYSTEM_PROMPT, user: `Evalúa estos candidatos:\n\n${blocks.join("\n\n")}` };
}

/** Interpreta la respuesta. Devuelve null si no es confiable (incompleta o con números que no existen). */
export function parseListJudgeOutput(raw: string, items: ListJudgeItem[]): Map<number, ListJudgeVerdict> | null {
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
  const out = new Map<number, ListJudgeVerdict>();
  for (const entry of results) {
    const row = entry as { id?: unknown; same_as?: unknown; reason?: unknown };
    const item = items.find((i) => i.id === row.id);
    if (!item || !Array.isArray(row.same_as)) continue;
    const valid = new Set(item.neighbors.map((n) => n.id));
    if (!row.same_as.every((n) => typeof n === "number" && valid.has(n))) return null; // número inventado: no se confía
    out.set(item.id, { sameAs: row.same_as as number[], reason: typeof row.reason === "string" ? row.reason.slice(0, 200) : "" });
  }
  if (!items.every((i) => out.has(i.id))) return null;
  return out;
}

export async function callListJudge(
  items: ListJudgeItem[],
  apiKey: string | undefined,
  options: { fetchImpl?: FetchLike; timeoutMs?: number; model?: string } = {},
): Promise<Map<number, ListJudgeVerdict> | null> {
  if (!apiKey || items.length === 0) return null;
  const limited = items.slice(0, JUDGE_MAX_PAIRS);
  const { system, user } = buildListJudgeMessages(limited);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? JUDGE_TIMEOUT_MS);
  try {
    const doFetch = options.fetchImpl ?? (fetch as unknown as FetchLike);
    const response = await doFetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: options.model ?? JUDGE_MODEL,
        temperature: 0,
        seed: 7,
        max_tokens: Math.min(4000, 300 + 70 * limited.length),
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
    return typeof content === "string" ? parseListJudgeOutput(content, limited) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface ListCase {
  candidate: string;
  neighbors: string[];
  /** Índice (0-based) del vecino que hace la misma pregunta, o null si ninguno. */
  expected: number | null;
  why: string;
}

export interface ListJudgeValidation {
  total: number;
  foundCorrectly: number;
  needles: number;
  /** Casos sin aguja donde el juez marcó algo (lo más grave) o donde marcó el vecino equivocado. */
  falseMatches: Array<{ candidate: string; flagged: string; reason: string }>;
  missed: Array<{ candidate: string; expected: string; reason: string }>;
  passes: boolean;
}

/** Condición: encuentra al menos 5 de 6 agujas y cero falsos marcados. */
export function scoreListJudge(cases: ListCase[], verdicts: Map<number, ListJudgeVerdict>): ListJudgeValidation {
  const falseMatches: ListJudgeValidation["falseMatches"] = [];
  const missed: ListJudgeValidation["missed"] = [];
  let found = 0;
  let needles = 0;
  cases.forEach((c, index) => {
    const v = verdicts.get(index + 1);
    if (!v) return;
    const flagged = v.sameAs.map((n) => c.neighbors[n - 1]).filter(Boolean);
    if (c.expected === null) {
      for (const f of flagged) falseMatches.push({ candidate: c.candidate, flagged: f, reason: v.reason });
      return;
    }
    needles += 1;
    const expectedTitle = c.neighbors[c.expected];
    const wrong = flagged.filter((f) => f !== expectedTitle);
    for (const f of wrong) falseMatches.push({ candidate: c.candidate, flagged: f, reason: v.reason });
    if (flagged.includes(expectedTitle)) found += 1;
    else missed.push({ candidate: c.candidate, expected: expectedTitle, reason: v.reason });
  });
  return { total: cases.length, foundCorrectly: found, needles, falseMatches, missed, passes: needles > 0 && found >= needles - 1 && falseMatches.length === 0 };
}
