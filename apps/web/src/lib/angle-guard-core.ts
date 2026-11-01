// GUARDIA DE ÁNGULOS — lógica PURA (sin base de datos, sin red). Especificación:
// ESPECIFICACION_FINAL_GUARDIA_DE_ANGULOS.md. Principio rector: entregar
// propuestas para publicar va por encima de la estrictez; esta lógica ordena,
// prefiere lo más nuevo y anota, pero nunca deja a la persona sin títulos.
//
// FASE 1: este módulo NO está conectado a ningún flujo. No cambia el
// comportamiento de la plataforma hasta que se active (Fases 2 y 3).

export const GUARD = {
  /** Parecido a partir del cual el código lo marca «parecido» sin esperar al juez. */
  AUTO: 0.85,
  /** Por debajo de esto el título pasa limpio; de aquí a AUTO decide el juez. */
  BAND: 0.38,
  /** Sin juez disponible, parecido a partir de este valor (salvo vecino solo-del-sitio). */
  NO_JUDGE: 0.6,
  /** Peso mínimo de una palabra muy común dentro del corpus del propio sitio. */
  MIN_WORD_WEIGHT: 0.15,
  /** Parte del parecido que cuenta todas las palabras por igual (evita que una sola palabra rara decida). */
  PLAIN_BLEND: 0.3,
  MIN_OUT: 5,
  /** Módulo 2: mínimo de títulos que se conservan por grupo cuando hay de dónde rellenar sin usar casi idénticos. */
  MODULE2_MIN_PER_GROUP: 3,
  /** Títulos previos que se muestran a la IA con la guardia activa (sin ella: 60). */
  PROMPT_AVOID_ACTIVE: 100,
  MAX_OUT: 9,
  /** Con menos títulos que esto en la categoría de la cuenta, no hay casi nada que repetir: la guardia no se aplica (ahorra IA). */
  MIN_HISTORY: 20,
  /** Candidatos que se piden a la IA para 9 cupos. */
  CANDIDATES_ASKED: 14,
  OFFERED_EXPIRES_DAYS: 60,
  DISCARDED_EXPIRES_DAYS: 90,
  /** Solicitudes seguidas completadas con notas tras las que se apaga la guardia en esa cuenta. */
  BREAKER_STREAK: 2,
  BREAKER_HOURS: 24,
} as const;

export type MemorySource = "publicado" | "sitio" | "ofrecido" | "descartado";

export interface MemoryEntry {
  title: string;
  source: MemorySource;
  /** Antigüedad en días (0 = hoy). */
  ageDays: number;
  /** Categoría a la que pertenece (publicados y ofrecidos); los títulos del sitio no la tienen. */
  categoryId?: string | null;
}

export type Verdict = "limpio" | "parecido";
export type JudgeAnswer = "same" | "different";

/** Función del juez: recibe un candidato y su vecino más cercano. Puede lanzar o devolver null (= no disponible). */
export type JudgeFn = (candidate: string, neighbor: MemoryEntry) => JudgeAnswer | null;

/**
 * Juez que ve la LISTA de vecinos de cada título nuevo (los más cercanos por código y
 * los más recientes de la misma categoría) y dice si alguno hace la misma pregunta,
 * aunque no comparta palabras (sinónimos). Devuelve null si no está disponible.
 */
export type ListJudgeFn = (candidate: string) => { same: boolean; neighbor: MemoryEntry | null } | null;

export interface Delivered {
  title: string;
  verdict: Verdict;
  /** Parecido (0–1) contra el vecino más cercano de la memoria activa. */
  sim: number;
  /** Frase para la persona cuando el título se parece a algo existente. */
  note: string | null;
  neighbor: string | null;
}

export interface GuardResult {
  delivered: Delivered[];
  /** Descartados siempre: idénticos (normalizados) a algo publicado, del sitio u ofrecido. */
  hardDropped: string[];
  nClean: number;
  nSimilar: number;
  /** Cuántos entraron por completar el mínimo de 5 (llevan nota). */
  completedWithNotes: number;
}

// ---------- normalización y palabras ----------

const strip = (s: string) => s.normalize("NFD").replace(/\p{M}+/gu, "");

const STOP = new Set(
  ("your with that this from have what when where which will their they them into about more than also does need know best tips guide step steps ways how the and for are you can should could would key essential understanding practical simple common smooth successful effective " +
    "como para que con una unos unas los las del por sus tus mas muy sobre esta este esto desde entre cual cuales cuando donde hacer tener puedo debes").split(" "),
);

/** Cortador conservador de plurales y terminaciones (inglés y español). */
export function stem(word: string): string {
  let s = word;
  if (s.length > 4 && s.endsWith("ies")) s = s.slice(0, -3) + "y";
  else if (s.length > 4 && /(ch|sh|ss|x|z)es$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss") && !s.endsWith("us") && !s.endsWith("is")) s = s.slice(0, -1);
  if (s.length > 5 && s.endsWith("ing")) {
    s = s.slice(0, -3);
    if (/([^aeioulszf])\1$/.test(s)) s = s.slice(0, -1);
  } else if (s.length > 4 && s.endsWith("ed")) {
    s = s.slice(0, -2);
    if (/([^aeioulszf])\1$/.test(s)) s = s.slice(0, -1);
  }
  if (s.length > 3 && s.endsWith("e")) s = s.slice(0, -1);
  return s.length >= 3 ? s : word;
}

/** Forma comparable exacta de un título (igual criterio que `normalizeTitleKey`). */
export function titleKey(title: string): string {
  return strip(title).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Palabras significativas de un título. */
export function tokens(title: string): string[] {
  const out = new Set<string>();
  for (const rawWithPunctuation of strip(title).split(/\s+/)) {
    const raw = rawWithPunctuation.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
    if (!raw) continue;
    const low = raw.toLowerCase();
    const hasLetters = /[a-z]/i.test(raw);
    const hasDigits = /\d/.test(raw);
    if (hasLetters && hasDigits) {
      // Código real (EB-5, H-1B, 401k, FHA203k) o resto de URL («buyers39»).
      const isCode = /-/.test(raw) || /[A-Z]/.test(raw) || /^\d/.test(raw);
      if (isCode) {
        out.add(low.replace(/[^a-z0-9]/g, ""));
        continue;
      }
      const base = low.replace(/\d+$/, "");
      if (base.length >= 3 && !STOP.has(base)) out.add(stem(base));
      continue;
    }
    for (const part of low.split(/[^a-z0-9]+/)) {
      if (!part || /^\d+$/.test(part)) continue;
      if (/^[A-Z]{2,5}$/.test(raw) && part.length >= 2) {
        out.add(part);
        continue;
      }
      if (part.length >= 3 && !STOP.has(part)) out.add(stem(part));
    }
  }
  return [...out];
}

/**
 * Función de parecido (0–1) entre dos títulos. El peso de cada palabra es su
 * rareza dentro de `corpus` (los títulos del propio sitio): las palabras que
 * están en casi todos (p. ej. «coral», «gables») pesan poco, así que decide lo
 * que de verdad distingue a un título de otro. Se mezcla un 30 % de parecido
 * simple para que una sola palabra rara («quick») no decida por sí sola. Se
 * pre-tokeniza una sola vez.
 */
export function buildSimilarity(corpus: string[]): (a: string, b: string) => number {
  const df = new Map<string, number>();
  const cache = new Map<string, string[]>();
  const tokensOf = (t: string) => {
    let k = cache.get(t);
    if (!k) {
      k = tokens(t);
      cache.set(t, k);
    }
    return k;
  };
  for (const t of corpus) for (const w of tokensOf(t)) df.set(w, (df.get(w) ?? 0) + 1);
  const n = corpus.length;
  const weight = (w: string) => Math.max(Math.log((n + 1) / ((df.get(w) ?? 0) + 1)), GUARD.MIN_WORD_WEIGHT);
  return (a, b) => {
    const A = new Set(tokensOf(a));
    const B = new Set(tokensOf(b));
    let shared = 0;
    let total = 0;
    let plainShared = 0;
    let plainTotal = 0;
    for (const w of new Set([...A, ...B])) {
      const x = weight(w);
      total += x;
      plainTotal += 1;
      if (A.has(w) && B.has(w)) {
        shared += x;
        plainShared += 1;
      }
    }
    const weighted = total ? shared / total : 0;
    const plain = plainTotal ? plainShared / plainTotal : 0;
    return (1 - GUARD.PLAIN_BLEND) * weighted + GUARD.PLAIN_BLEND * plain;
  };
}

const yearsOf = (title: string) => (title.match(/\b20\d{2}\b/g) ?? []).map(Number);

export const similarNote = (neighborTitle: string) =>
  `Se parece a tu artículo “${neighborTitle}”; úsalo si quieres cubrirlo con otro enfoque.`;

// ---------- decisión ----------

export interface DecideOptions {
  judge?: JudgeFn | null;
  /** Si se da, decide por la lista de vecinos (aunque el código no vea parecido); si falla para un título, se usa el camino por pares. */
  listJudge?: ListJudgeFn | null;
  /** Sin juez, parecido mínimo para marcar un título que solo se parece a un título del SITIO (por defecto nunca). Módulo 2 usa 0,75. */
  siteNoJudge?: number;
}

/** Resultado de comparar un título nuevo con la memoria. */
export type ScoredCandidate = { title: string; sim: number; near: MemoryEntry | null; verdict: Verdict };

/**
 * Compara CADA candidato con la memoria y dice si es «limpio» o «parecido». Sin límite de 9 ni mínimo de 5: sirve para
 * quien necesita el veredicto de todos los títulos (por ejemplo, el módulo 2). `decide` se apoya en esta función.
 */
export function scoreCandidates(candidates: string[], memory: MemoryEntry[], options: DecideOptions = {}): { scored: ScoredCandidate[]; hardDropped: string[] } {
  // 1. Limpiar vacíos y repetidos entre los propios candidatos.
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const candidate of candidates) {
    const title = candidate.trim();
    const key = titleKey(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(title);
  }

  // 2. Duplicado exacto de algo publicado, del sitio u ofrecido: nunca se entrega.
  const hardKeys = new Set(memory.filter((m) => m.source !== "descartado").map((m) => titleKey(m.title)));
  const hardDropped = cleaned.filter((c) => hardKeys.has(titleKey(c)));
  const alive = cleaned.filter((c) => !hardKeys.has(titleKey(c)));

  // 3. Memoria activa (con caducidad) y parecido.
  const active = memory.filter(
    (m) =>
      !(m.source === "ofrecido" && m.ageDays > GUARD.OFFERED_EXPIRES_DAYS) &&
      !(m.source === "descartado" && m.ageDays > GUARD.DISCARDED_EXPIRES_DAYS),
  );
  const similarity = buildSimilarity([...active.map((m) => m.title), ...alive]);

  const scored: ScoredCandidate[] = alive.map((title) => {
    const years = yearsOf(title);
    let best = 0;
    let near: MemoryEntry | null = null as MemoryEntry | null;
    for (const m of active) {
      // Un evento anual puede repetirse al año siguiente.
      if (years.length && m.ageDays > 365 && !yearsOf(m.title).some((y) => years.includes(y))) continue;
      const s = similarity(title, m.title);
      if (s > best) {
        best = s;
        near = m;
      }
    }
    let verdict: Verdict = "limpio";
    const siteOnly = near?.source === "sitio";
    let listDecided = false;
    if (options.listJudge && !(near && best >= GUARD.AUTO && !siteOnly)) {
      // El juez por lista decide aunque el código no vea parecido: así se atrapan los sinónimos.
      let answer: ReturnType<ListJudgeFn> = null;
      try {
        answer = options.listJudge(title);
      } catch {
        answer = null;
      }
      if (answer) {
        listDecided = true;
        if (answer.same) {
          verdict = "parecido";
          if (answer.neighbor) near = answer.neighbor;
        }
      }
    }
    if (!listDecided && near && best >= GUARD.BAND) {
      let same: boolean | null = null;
      if (best >= GUARD.AUTO && !siteOnly) {
        same = true;
      } else if (options.judge) {
        try {
          const answer = options.judge(title, near);
          same = answer === null ? null : answer === "same";
        } catch {
          same = null;
        }
      }
      // Juez no disponible: decide el código; un vecino solo-del-sitio nunca se marca solo.
      if (same === null) same = siteOnly ? best >= (options.siteNoJudge ?? Infinity) : best >= GUARD.NO_JUDGE;
      if (same) verdict = "parecido";
    }
    return { title, sim: best, near, verdict };
  });
  return { scored, hardDropped };
}

/**
 * Decide qué candidatos de la IA se entregan y en qué orden. Sin efectos secundarios.
 * El orden y las reglas son los de la especificación, apartado 4.
 */
export function decide(candidates: string[], memory: MemoryEntry[], options: DecideOptions = {}): GuardResult {
  const { scored, hardDropped } = scoreCandidates(candidates, memory, options);
  const alive = scored;
  const toDelivered = (x: ScoredCandidate): Delivered => ({
    title: x.title,
    verdict: x.verdict,
    sim: x.sim,
    note: x.verdict === "parecido" && x.near ? similarNote(x.near.title) : null,
    neighbor: x.near ? x.near.title : null,
  });

  // 6. Entrega: limpios del más nuevo al menos nuevo; si faltan para el mínimo, los parecidos menos parecidos con nota.
  const clean = scored.filter((x) => x.verdict === "limpio").sort((a, b) => a.sim - b.sim);
  const similar = scored.filter((x) => x.verdict === "parecido").sort((a, b) => a.sim - b.sim);
  let chosen = clean.slice(0, GUARD.MAX_OUT);
  const wanted = Math.min(GUARD.MIN_OUT, alive.length);
  let completed = 0;
  if (chosen.length < wanted) {
    const fill = similar.slice(0, wanted - chosen.length);
    completed = fill.length;
    chosen = [...chosen, ...fill];
  }
  return {
    delivered: chosen.map(toDelivered),
    hardDropped,
    nClean: clean.length,
    nSimilar: similar.length,
    completedWithNotes: completed,
  };
}

/**
 * Pares (candidato, vecino más cercano) que el código no puede decidir solo y
 * hay que mandar al juez: parecido en la zona del juez, o muy alto pero con un
 * vecino que solo es un título del sitio. Se calcula igual que en `decide`, de
 * modo que el juez se consulta una sola vez, en lote, antes de decidir.
 */
export function needsJudge(candidates: string[], memory: MemoryEntry[]): Array<{ candidate: string; neighbor: MemoryEntry }> {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const candidate of candidates) {
    const title = candidate.trim();
    const key = titleKey(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(title);
  }
  const hardKeys = new Set(memory.filter((m) => m.source !== "descartado").map((m) => titleKey(m.title)));
  const alive = cleaned.filter((c) => !hardKeys.has(titleKey(c)));
  const active = memory.filter(
    (m) =>
      !(m.source === "ofrecido" && m.ageDays > GUARD.OFFERED_EXPIRES_DAYS) &&
      !(m.source === "descartado" && m.ageDays > GUARD.DISCARDED_EXPIRES_DAYS),
  );
  const similarity = buildSimilarity([...active.map((m) => m.title), ...alive]);
  const out: Array<{ candidate: string; neighbor: MemoryEntry }> = [];
  for (const title of alive) {
    const years = yearsOf(title);
    let best = 0;
    let near: MemoryEntry | null = null;
    for (const m of active) {
      if (years.length && m.ageDays > 365 && !yearsOf(m.title).some((y) => years.includes(y))) continue;
      const s = similarity(title, m.title);
      if (s > best) {
        best = s;
        near = m;
      }
    }
    if (!near || best < GUARD.BAND) continue;
    if (best >= GUARD.AUTO && near.source !== "sitio") continue; // el código ya lo marca solo
    out.push({ candidate: title, neighbor: near });
  }
  return out;
}

/** ¿La cuenta tiene historial suficiente en esta categoría para que valga la pena revisar repetidos? Pura. */
export function hasEnoughHistory(publishedCount: number, offeredCounts: number[], min: number = GUARD.MIN_HISTORY): boolean {
  return publishedCount + offeredCounts.reduce((n, c) => n + c, 0) >= min;
}

/** Cuántos vecinos recibe el juez por título nuevo: los más cercanos por código y los más recientes de la categoría. */
export const NEIGHBORS = { NEAREST: 5, RECENT: 20, MAX: 25 } as const;

/**
 * Para cada título nuevo que el código NO decide solo, la lista de vecinos que verá el
 * juez: los 5 más cercanos por código (tengan o no palabras en común) y los 20 más
 * recientes publicados u ofrecidos de la MISMA categoría. Sin repetidos y como máximo 25.
 * Es lo que permite detectar el mismo ángulo dicho con sinónimos entre una tanda y la siguiente.
 */
export function buildNeighborLists(
  candidates: string[],
  memory: MemoryEntry[],
  categoryId: string | null,
): Array<{ candidate: string; neighbors: MemoryEntry[] }> {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const candidate of candidates) {
    const title = candidate.trim();
    const key = titleKey(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(title);
  }
  const hardKeys = new Set(memory.filter((m) => m.source !== "descartado").map((m) => titleKey(m.title)));
  const alive = cleaned.filter((c) => !hardKeys.has(titleKey(c)));
  const active = memory.filter(
    (m) =>
      !(m.source === "ofrecido" && m.ageDays > GUARD.OFFERED_EXPIRES_DAYS) &&
      !(m.source === "descartado" && m.ageDays > GUARD.DISCARDED_EXPIRES_DAYS),
  );
  const similarity = buildSimilarity([...active.map((m) => m.title), ...alive]);
  const recent = categoryId
    ? active
        .filter((m) => (m.source === "publicado" || m.source === "ofrecido") && m.categoryId === categoryId)
        .sort((a, b) => a.ageDays - b.ageDays)
        .slice(0, NEIGHBORS.RECENT)
    : [];
  const out: Array<{ candidate: string; neighbors: MemoryEntry[] }> = [];
  for (const title of alive) {
    const years = yearsOf(title);
    const scored: Array<{ m: MemoryEntry; s: number }> = [];
    for (const m of active) {
      if (years.length && m.ageDays > 365 && !yearsOf(m.title).some((y) => years.includes(y))) continue;
      scored.push({ m, s: similarity(title, m.title) });
    }
    scored.sort((a, b) => b.s - a.s);
    const top = scored[0];
    if (top && top.s >= GUARD.AUTO && top.m.source !== "sitio") continue; // el código ya lo marca solo
    const picked = new Map<string, MemoryEntry>();
    for (const x of scored.slice(0, NEIGHBORS.NEAREST)) picked.set(titleKey(x.m.title), x.m);
    for (const m of recent) {
      if (picked.size >= NEIGHBORS.MAX) break;
      if (titleKey(m.title) !== titleKey(title)) picked.set(titleKey(m.title), m);
    }
    out.push({ candidate: title, neighbors: [...picked.values()].slice(0, NEIGHBORS.MAX) });
  }
  return out;
}

/**
 * Comportamiento ACTUAL (modos apagado y sombra): solo se descartan repetidos
 * exactos y se corta en 9, en el orden en que llegan. Sirve para comprobar que
 * la guardia, apagada, no cambia nada.
 */
export function legacySelect(candidates: string[], memory: MemoryEntry[]): string[] {
  const hardKeys = new Set(memory.filter((m) => m.source !== "descartado").map((m) => titleKey(m.title)));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of candidates) {
    const title = candidate.trim();
    const key = titleKey(title);
    if (!key || seen.has(key) || hardKeys.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out.slice(0, GUARD.MAX_OUT);
}

// ---------- freno por cuenta ----------

/**
 * ¿Hay que saltarse la guardia en esta cuenta? `recent` son las últimas
 * solicitudes (la más reciente primero) con si necesitaron completarse con
 * notas, y cuándo ocurrieron. Si las últimas BREAKER_STREAK lo necesitaron y
 * la última fue hace menos de BREAKER_HOURS, la guardia se salta.
 */
export function breakerOpen(recent: Array<{ neededNotes: boolean; at: Date }>, now: Date = new Date()): boolean {
  const last = recent.slice(0, GUARD.BREAKER_STREAK);
  if (last.length < GUARD.BREAKER_STREAK) return false;
  if (!last.every((r) => r.neededNotes)) return false;
  return now.getTime() - last[0].at.getTime() < GUARD.BREAKER_HOURS * 3600_000;
}

/**
 * Módulo 2 (CONTENIDO GENERADO POR IA): quita de un grupo los títulos que repiten algo ya cubierto, sin tocar nada más del
 * grupo (justificación, impresiones, clics, señales). Conserva el orden y NUNCA deja un grupo vacío: si todo se parece,
 * se conserva el menos parecido, porque el grupo nació de una señal real de Search Console o Bing.
 */
export function dropSimilarKeepOne<T extends { text: string }>(items: T[], scored: ScoredCandidate[], hardDropped: string[], minKeep: number = GUARD.MODULE2_MIN_PER_GROUP): T[] {
  const bySim = new Map(scored.map((s) => [titleKey(s.title), s] as const));
  const similar = new Set(scored.filter((s) => s.verdict === "parecido").map((s) => titleKey(s.title)));
  const hard = new Set(hardDropped.map(titleKey));
  const kept = items.filter((i) => !similar.has(titleKey(i.text)) && !hard.has(titleKey(i.text)));
  if (items.length === 0) return kept;
  if (kept.length === 0) {
    const best = [...items].filter((i) => !hard.has(titleKey(i.text))).sort((a, b) => (bySim.get(titleKey(a.text))?.sim ?? 1) - (bySim.get(titleKey(b.text))?.sim ?? 1))[0];
    return best ? [best] : [items[0]];
  }
  // Mejor de dos mundos: si quedan muy pocos, se devuelven los «parecidos» menos parecidos (nunca los casi idénticos ni los duplicados exactos).
  const target = Math.min(minKeep, items.length);
  if (kept.length >= target) return kept;
  const refill = items
    .filter((i) => similar.has(titleKey(i.text)) && !hard.has(titleKey(i.text)) && (bySim.get(titleKey(i.text))?.sim ?? 1) < GUARD.AUTO)
    .sort((a, b) => (bySim.get(titleKey(a.text))?.sim ?? 1) - (bySim.get(titleKey(b.text))?.sim ?? 1))
    .slice(0, target - kept.length);
  const back = new Set(refill);
  return items.filter((i) => kept.includes(i) || back.has(i));
}
