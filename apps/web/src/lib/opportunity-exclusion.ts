// Revisión por IA de los títulos DUDOSOS frente a los temas que la cuenta pidió no publicar (ver classifyExcludedTopics en
// opportunity-analysis.ts). Una sola llamada por tanda. Si la IA falla, lo dudoso se trata como excluido: nunca se publica algo
// que la cuenta excluyó. Compartido por el análisis del botón 2 y por el modo complementario.
export async function judgeDoubtfulExclusions(apiKey: string, topics: string[], texts: string[]): Promise<Map<string, boolean>> {
  const verdicts = new Map<string, boolean>();
  if (texts.length === 0) return verdicts;
  try {
    const prompt = `Una cuenta pidio NO publicar articulos sobre estos temas excluidos:
${JSON.stringify(topics)}

Para cada titulo numerado, di si su TEMA PRINCIPAL es uno de los temas excluidos (incluye sinonimos y formulaciones equivalentes: por ejemplo, alquilar un apartamento turistico en una zona es el mismo tema que "alquiler vacacional" en esa zona). NO es excluido un titulo que solo menciona un lugar o una palabra del tema excluido pero trata de otra cosa (por ejemplo, invertir o comprar propiedades en esa zona no es "alquiler vacacional"; reubicarse o vivir en esa zona tampoco).

TITULOS:
${JSON.stringify(texts.map((text, index) => ({ n: index, titulo: text })))}

Responde SOLO JSON: {"excluidos":[numeros de los titulos cuyo tema principal SI es excluido]}`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0, max_tokens: 800, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) throw new Error(data.error?.message ?? "OpenAI no respondio.");
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as { excluidos?: unknown };
    if (!Array.isArray(parsed.excluidos)) throw new Error("respuesta sin lista de excluidos");
    const flagged = new Set(parsed.excluidos.filter((n): n is number => typeof n === "number"));
    texts.forEach((text, index) => verdicts.set(text, flagged.has(index)));
  } catch (error) {
    console.warn("[exclusion] no se pudo revisar los temas excluidos dudosos; se tratan como excluidos:", error instanceof Error ? error.message : error);
    texts.forEach((text) => verdicts.set(text, true));
  }
  return verdicts;
}
