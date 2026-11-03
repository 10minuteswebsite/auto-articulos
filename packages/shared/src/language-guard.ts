/**
 * Guardia de idioma de los textos generados por IA (títulos, artículos, FAQ).
 *
 * Caso real (Inés, 2026-11-03): pidió escribir en un idioma y en el Historial
 * aparecieron títulos y párrafos en español. Los prompts le pedían al modelo
 * el idioma, pero nada VERIFICABA el resultado. Este módulo detecta, sin IA y
 * sin costo, cuando un texto (o partes de él) está claramente en otro idioma,
 * para reintentar, traducir o no publicar.
 *
 * Es deliberadamente conservador: solo marca un texto cuando el idioma
 * detectado es claro y distinto del pedido. Ante la duda, no marca nada
 * (un falso positivo bloquearía un artículo bueno).
 */

export type GuardLanguage = "es" | "en" | "pt" | "fr" | "it" | "de";

const GUARD_LANGUAGES: readonly GuardLanguage[] = ["es", "en", "pt", "fr", "it", "de"];

const LANGUAGE_NAMES_EN: Record<string, string> = {
  es: "Spanish",
  en: "English",
  pt: "Portuguese",
  fr: "French",
  it: "Italian",
  de: "German",
  ro: "Romanian",
  ru: "Russian",
  zh: "Mandarin Chinese",
};

/** `en_VI` / `es-ES` / `English` → `en` / `es` (minúsculas, solo el idioma). */
export function languageBase(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase().replace(/-/g, "_").split("_")[0];
}

/** Nombre del idioma en inglés para instrucciones al modelo; devuelve el valor tal cual si no lo conoce. */
export function languageNameEn(value: string | null | undefined): string {
  const base = languageBase(value);
  return LANGUAGE_NAMES_EN[base] ?? (value ?? "").trim();
}

/** true si la guardia sabe medir este idioma (los demás no se verifican). */
export function isGuardedLanguage(value: string | null | undefined): boolean {
  return (GUARD_LANGUAGES as readonly string[]).includes(languageBase(value));
}

const STOPWORDS: Record<GuardLanguage, string> = {
  es: "el la los las un una unos unas de del al y o en con por para que se su sus es son está están como más pero sin sobre entre desde hasta cuando donde qué cómo cuál tu tus mi mis nuestro nuestra esto esta este estos estas también muy ya no si le les lo hay ser tiene tienen puede pueden cada todo todos todas otro otra antes después durante ante tras según",
  en: "the a an of and or in on at to for with by from as is are was were be been being this that these those it its your our their you we they not no can will may should would could have has had do does more most than then also into about over under between through each all any other what which who how when where why if but so such own very just only",
  pt: "o a os as um uma uns umas de do da dos das no na nos nas e ou em com por para que se seu sua seus suas é são está estão como mais mas sem sobre entre desde até quando onde qual você seu meu minha nosso isso esta este estes estas também muito já não ao aos à às tem têm pode podem cada todo todos todas outro outra antes depois durante",
  fr: "le la les un une des du de et ou en dans sur avec par pour que qui se son sa ses est sont être comme plus mais sans entre depuis jusqu quand où quel quelle vous votre vos notre nos ce cette ces aussi très déjà ne pas au aux il elle ils elles a ont peut peuvent chaque tout tous toute toutes autre avant après pendant",
  it: "il lo la i gli le un uno una di del dello della dei degli delle e o in con per che si suo sua suoi sue è sono essere come più ma senza su tra fra da fino quando dove quale tuo tua vostro nostro questo questa questi queste anche molto già non al allo alla ai agli alle ha hanno può possono ogni tutto tutti tutte altro altra prima dopo durante",
  de: "der die das den dem des ein eine einen einem einer und oder in im mit von zu für auf aus bei nach über unter zwischen durch ist sind war wird werden sein wie mehr aber ohne seit bis wenn wo welche ihr ihre euer unser dieser diese dieses auch sehr schon nicht kein keine hat haben kann können jede jeder alle anderen vor während",
};

const STOPWORD_SETS: Record<GuardLanguage, Set<string>> = Object.fromEntries(
  GUARD_LANGUAGES.map((lang) => [lang, new Set(STOPWORDS[lang].split(/\s+/).filter(Boolean))]),
) as Record<GuardLanguage, Set<string>>;

function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase()
    .replace(/[0-9_]+/g, " ")
    .split(/[^\p{L}']+/u)
    .filter(Boolean);
}

export interface LanguageDetection {
  language: GuardLanguage;
  /** 0–1: qué tan por delante quedó del segundo idioma. */
  margin: number;
  hits: number;
}

/**
 * Detecta el idioma de un texto plano por palabras funcionales. Devuelve null
 * si no hay evidencia suficiente (texto corto, nombres propios, mezcla pareja).
 */
export function detectLanguage(text: string): LanguageDetection | null {
  const tokens = tokenize(text);
  if (tokens.length < 4) return null;

  const scores = GUARD_LANGUAGES.map((language) => {
    let hits = 0;
    for (const token of tokens) if (STOPWORD_SETS[language].has(token)) hits++;
    // Señales que solo existen en un idioma.
    if (language === "es" && /[¿¡ñ]/.test(text)) hits += 2;
    if (language === "pt" && /[ãõç]/.test(text)) hits += 1;
    if (language === "de" && /[ßäöü]/.test(text)) hits += 1;
    return { language, hits };
  }).sort((a, b) => b.hits - a.hits);

  const [best, second] = scores;
  if (best.hits < 2) return null;
  // Palabras ambiguas ("a", "de", "no") se reparten entre idiomas hermanos: se exige ventaja clara.
  if (best.hits < second.hits * 1.5 + 0.5) return null;
  return { language: best.language, margin: (best.hits - second.hits) / best.hits, hits: best.hits };
}

/**
 * true solo si el texto está CLARAMENTE en otro idioma que el pedido.
 * Idiomas que la guardia no mide (rumano, chino…) nunca se marcan.
 */
export function isWrongLanguage(text: string, targetLanguage: string | null | undefined): boolean {
  const target = languageBase(targetLanguage);
  if (!isGuardedLanguage(target)) return false;
  const detected = detectLanguage(text);
  return detected !== null && detected.language !== target;
}

// Encabezados y etiquetas típicas que se filtran desde prompts en español (una palabra no se puede detectar por estadística).
const SPANISH_LEAK_LABELS =
  /^(fuentes?|fuentes consultadas|preguntas frecuentes|conclusi[oó]n|conclusiones|introducci[oó]n|resumen|contacta ahora|llama ahora|ll[aá]manos|cont[aá]ctanos|ver m[aá]s|leer m[aá]s|sobre el autor|sobre m[ií]|descargo de responsabilidad|aviso legal|pasos|consejos|ventajas|beneficios|requisitos|recomendaciones|ejemplo)\s*:?$/i;

export interface LanguageProblem {
  where: "title" | "summary" | "body";
  sample: string;
}

function htmlBlocks(html: string): { text: string; heading: boolean }[] {
  const clean = html.replace(/<script[\s\S]*?<\/script\s*>/gi, " ").replace(/<style[\s\S]*?<\/style\s*>/gi, " ");
  const blocks: { text: string; heading: boolean }[] = [];
  for (const m of clean.matchAll(/<(h[1-6]|p|li|blockquote|figcaption|td|th|dt|dd)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)) {
    const text = m[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) blocks.push({ text, heading: /^h[1-6]$/i.test(m[1]) });
  }
  if (!blocks.length) {
    const text = clean.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ text, heading: false });
  }
  return blocks;
}

/**
 * Revisa título, resumen y cuerpo (HTML) contra el idioma pedido. Devuelve la
 * lista de problemas (vacía = correcto). Revisa el cuerpo completo Y bloque por
 * bloque, para atrapar "frases o palabras en otro idioma" dentro de un artículo
 * que en general sí está bien escrito.
 */
export function findLanguageProblems(
  parts: { title?: string | null; summary?: string | null; html?: string | null },
  targetLanguage: string | null | undefined,
): LanguageProblem[] {
  const target = languageBase(targetLanguage);
  if (!isGuardedLanguage(target)) return [];
  const problems: LanguageProblem[] = [];

  if (parts.title && isWrongLanguage(parts.title, target)) {
    problems.push({ where: "title", sample: parts.title.slice(0, 120) });
  }
  if (parts.summary && isWrongLanguage(parts.summary, target)) {
    problems.push({ where: "summary", sample: parts.summary.slice(0, 120) });
  }

  if (parts.html) {
    const blocks = htmlBlocks(parts.html);
    const whole = blocks.map((b) => b.text).join(" ");
    if (isWrongLanguage(whole, target)) {
      problems.push({ where: "body", sample: whole.slice(0, 120) });
    } else {
      for (const block of blocks) {
        const words = block.text.split(/\s+/).length;
        // Etiquetas sueltas heredadas de un prompt en español ("Fuentes", "Conclusión").
        if (target !== "es" && block.heading && SPANISH_LEAK_LABELS.test(block.text)) {
          if (problems.length < 5) problems.push({ where: "body", sample: block.text.slice(0, 120) });
          continue;
        }
        if (words >= 7 && isWrongLanguage(block.text, target)) {
          if (problems.length < 5) problems.push({ where: "body", sample: block.text.slice(0, 120) });
        }
      }
    }
  }
  return problems;
}
