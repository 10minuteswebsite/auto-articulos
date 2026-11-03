import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { scoreCandidates, titleKey, type MemoryEntry } from "@/lib/angle-guard-core";
import { classifyExcludedTopics } from "@/lib/opportunity-analysis";
import { MIN_TITLES_PROMISE } from "@/lib/opportunity-red-flag";
import { SHADOW_MAX_DAYS, isShadowExpired } from "@/lib/title-guard-mode";
import { loadGuardMemory } from "@/lib/title-guard-shadow";

// MODO COMPLEMENTARIO del botón 2 (CONTENIDO GENERADO POR IA). Ver DISENO_MODO_COMPLEMENTARIO_BOTON_2.md.
// Cuando el análisis con evidencia deja menos títulos que la promesa mínima, una llamada de IA propone ideas SIN evidencia de demanda
// para completar hasta la promesa. FASE 2 = SOMBRA: calcula y registra en el panel del administrador, pero NO muestra ni guarda nada
// para el usuario. Interruptor propio, guardado en SystemSetting (sin migración). Apagado por defecto.
export const COMPLEMENT_MODE_KEY = "opportunity_complement_mode";
export type ComplementMode = "apagado" | "sombra";
export const COMPLEMENT_REPORT_NAME = "Complementario · Módulo 2";
/** Topes de gasto: una llamada (≈ 3–5 centavos) solo cuando faltan títulos. */
export const COMPLEMENT_ACCOUNT_DAILY_CAP = 2;
export const COMPLEMENT_GLOBAL_DAILY_CAP = 40;

export async function getComplementMode(): Promise<{ mode: ComplementMode; configured: ComplementMode; expiresAt: Date | null }> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: COMPLEMENT_MODE_KEY } });
    if (!row?.encryptedValue) return { mode: "apagado", configured: "apagado", expiresAt: null };
    let value = row.encryptedValue;
    try {
      value = decryptSecret(value);
    } catch {
      // el modo se guarda en claro: no es un secreto
    }
    const configured: ComplementMode = value.trim() === "sombra" ? "sombra" : "apagado";
    const expired = configured === "sombra" && isShadowExpired(row.updatedAt);
    return { mode: expired ? "apagado" : configured, configured, expiresAt: configured === "sombra" ? new Date(row.updatedAt.getTime() + SHADOW_MAX_DAYS * 86_400_000) : null };
  } catch {
    return { mode: "apagado", configured: "apagado", expiresAt: null };
  }
}

export async function setComplementMode(mode: ComplementMode): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: COMPLEMENT_MODE_KEY },
    create: { key: COMPLEMENT_MODE_KEY, encryptedValue: mode },
    update: { encryptedValue: mode },
  });
}

export interface ComplementIdea {
  categoryId: string;
  text: string;
  rationale: string;
}

/**
 * Filtra las ideas de la IA con las mismas garantías del resto del sistema y se queda con las necesarias:
 * categoría real, sin repetir entre sí, ni lo publicado/del sitio/ofrecido (duplicado exacto o parecido: 60 % publicado, 75 % sitio),
 * sin años desactualizados y sin tocar los temas excluidos (lo dudoso se descarta: aquí no hay IA que decida).
 */
export function filterComplementIdeas(
  ideas: ComplementIdea[],
  options: { validCategoryIds: Set<string>; memory: MemoryEntry[]; excludedTopics: string[]; need: number; currentYear?: number },
): { chosen: ComplementIdea[]; discarded: Record<string, number> } {
  const year = options.currentYear ?? new Date().getUTCFullYear();
  const discarded = { categoriaInvalida: 0, repetidaEntreSi: 0, repiteLoExistente: 0, anioViejo: 0, tema_excluido: 0, formato: 0 };
  const seen = new Set<string>();
  const basic: ComplementIdea[] = [];
  for (const idea of ideas) {
    const text = idea.text.trim();
    if (text.length < 15 || text.length > 160) {
      discarded.formato += 1;
      continue;
    }
    if (!options.validCategoryIds.has(idea.categoryId)) {
      discarded.categoriaInvalida += 1;
      continue;
    }
    const key = titleKey(text);
    if (!key || seen.has(key)) {
      discarded.repetidaEntreSi += 1;
      continue;
    }
    seen.add(key);
    const years = (text.match(/\b(?:19|20)\d{2}\b/g) ?? []).map(Number);
    if (years.some((y) => y < year - 1 || y > year + 1)) {
      discarded.anioViejo += 1;
      continue;
    }
    if (classifyExcludedTopics(text, options.excludedTopics).verdict !== "pass") {
      discarded.tema_excluido += 1;
      continue;
    }
    basic.push({ ...idea, text });
  }
  const { scored, hardDropped } = scoreCandidates(basic.map((i) => i.text), options.memory, { siteNoJudge: 0.75 });
  const tooSimilar = new Set([...hardDropped.map(titleKey), ...scored.filter((s) => s.verdict === "parecido").map((s) => titleKey(s.title))]);
  const clean = basic.filter((i) => !tooSimilar.has(titleKey(i.text)));
  discarded.repiteLoExistente = basic.length - clean.length;
  return { chosen: clean.slice(0, Math.max(0, options.need)), discarded };
}

async function askForIdeas(
  apiKey: string,
  input: { categories: Array<{ id: string; name: string; publishedExamples?: string[] }>; clientLocations: string[]; businessLocations: string[]; excludedTopics: string[]; existingTitles: string[]; want: number },
): Promise<ComplementIdea[]> {
  const prompt = `Eres estratega SEO. Esta cuenta ya cubrio casi todos los temas con demanda registrada. Propone ${input.want} ideas NUEVAS de articulos long tail para su blog, repartidas entre las categorias permitidas, que NO repitan ninguna de las ya existentes ni toquen los temas excluidos.

REGLAS: cada idea va en un categoryId real de la lista; no inventes cifras ni datos; si incluyes un ano, solo el actual o el siguiente; usa un angulo distinto a los titulos existentes (otra necesidad real del cliente, no una reformulacion); puedes usar las ubicaciones declaradas si aportan.

CATEGORIAS PERMITIDAS (con ejemplos ya publicados):
${JSON.stringify(input.categories)}

UBICACIONES DE CLIENTES: ${JSON.stringify(input.clientLocations)}
UBICACIONES DEL NEGOCIO: ${JSON.stringify(input.businessLocations)}
TEMAS EXCLUIDOS (no publicar): ${JSON.stringify(input.excludedTopics)}

TITULOS YA EXISTENTES (no repetir):
${JSON.stringify(input.existingTitles.slice(0, 300))}

Responde SOLO JSON: {"ideas":[{"categoryId":"id","text":"titulo","rationale":"por que es una necesidad real del cliente, en una frase"}]}`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 2500, response_format: { type: "json_object" } }),
    signal: AbortSignal.timeout(40_000),
  });
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? "OpenAI no respondio.");
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as { ideas?: unknown };
  if (!Array.isArray(parsed.ideas)) return [];
  return parsed.ideas.flatMap((raw) => {
    const r = raw as { categoryId?: unknown; text?: unknown; rationale?: unknown };
    return typeof r.categoryId === "string" && typeof r.text === "string" ? [{ categoryId: r.categoryId, text: r.text, rationale: typeof r.rationale === "string" ? r.rationale : "" }] : [];
  });
}

/**
 * FASE 2 (sombra): si faltan títulos para la promesa, calcula qué ideas complementarias se habrían ofrecido y lo registra para el
 * administrador. No cambia nada de lo que ve el usuario. Nunca lanza.
 */
export async function runComplementShadow(params: {
  userId: string;
  siteDomain: string;
  delivered: number;
  categories: Array<{ id: string; name: string; publishedExamples?: string[] }>;
  clientLocations: string[];
  businessLocations: string[];
  excludedTopics: string[];
  existingTitles: string[];
}): Promise<void> {
  try {
    const need = MIN_TITLES_PROMISE - params.delivered;
    if (need <= 0 || params.categories.length === 0) return;
    const { mode } = await getComplementMode();
    if (mode !== "sombra") return;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return;
    const since = new Date(Date.now() - 24 * 3600_000);
    const [accountToday, globalToday] = await Promise.all([
      prisma.titleGuardReport.count({ where: { userId: params.userId, categoryName: COMPLEMENT_REPORT_NAME, createdAt: { gte: since } } }),
      prisma.titleGuardReport.count({ where: { categoryName: COMPLEMENT_REPORT_NAME, createdAt: { gte: since } } }),
    ]);
    if (accountToday >= COMPLEMENT_ACCOUNT_DAILY_CAP || globalToday >= COMPLEMENT_GLOBAL_DAILY_CAP) return;

    const started = Date.now();
    const memory = await loadGuardMemory(params.userId, params.siteDomain, "", undefined, true);
    const ideas = await askForIdeas(apiKey, { categories: params.categories, clientLocations: params.clientLocations, businessLocations: params.businessLocations, excludedTopics: params.excludedTopics, existingTitles: params.existingTitles, want: Math.max(need * 3, 6) });
    const { chosen, discarded } = filterComplementIdeas(ideas, { validCategoryIds: new Set(params.categories.map((c) => c.id)), memory, excludedTopics: params.excludedTopics, need });
    await prisma.titleGuardReport.create({
      data: {
        userId: params.userId,
        requestId: null,
        categoryId: null,
        categoryName: COMPLEMENT_REPORT_NAME,
        siteDomain: params.siteDomain,
        mode: "sombra",
        candidates: ideas.length,
        legacyTitles: [],
        deliveredTitles: chosen.map((c) => c.text),
        nClean: chosen.length,
        judgeMs: Date.now() - started,
        details: JSON.parse(JSON.stringify({ modulo: 2, complementario: true, entregadosPorElAnalisis: params.delivered, necesarias: need, propuestas: ideas.slice(0, 20), elegidas: chosen, descartadas: discarded })),
      },
    });
  } catch (error) {
    console.warn("[complementario] la sombra falló (no afecta al usuario):", error instanceof Error ? error.message : error);
  }
}
