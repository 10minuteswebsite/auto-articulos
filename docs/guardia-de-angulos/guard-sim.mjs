// Simulador de la lógica de decisión FINAL de la Guardia de ángulos (auditoría, no es código del producto).
const strip = (s) => s.normalize("NFD").replace(/\p{M}+/gu, "");
const STOP = new Set("your with that this from have what when where which will their they them into about more than also does need know best tips guide step steps ways how the and for are you can should could would key essential understanding practical simple common smooth successful effective como para que con una unos unas los las del por sus tus mas muy sobre esta este esto desde entre cual cuales cuando donde hacer tener puedo debes".split(" "));
function stem(w) {
  let s = w;
  if (s.length > 4 && s.endsWith("ies")) s = s.slice(0, -3) + "y";
  else if (s.length > 4 && /(ch|sh|ss|x|z)es$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss") && !s.endsWith("us") && !s.endsWith("is")) s = s.slice(0, -1);
  if (s.length > 5 && s.endsWith("ing")) { s = s.slice(0, -3); if (/([^aeioulszf])\1$/.test(s)) s = s.slice(0, -1); }
  else if (s.length > 4 && s.endsWith("ed")) { s = s.slice(0, -2); if (/([^aeioulszf])\1$/.test(s)) s = s.slice(0, -1); }
  if (s.length > 3 && s.endsWith("e")) s = s.slice(0, -1);
  return s.length >= 3 ? s : w;
}
export const key = (s) => strip(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function tokens(s) {
  const out = new Set();
  for (const raw0 of strip(s).split(/\s+/)) {
    const raw = raw0.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
    if (!raw) continue;
    const low = raw.toLowerCase();
    const hasL = /[a-z]/i.test(raw), hasD = /\d/.test(raw);
    if (hasL && hasD) {
      const code = /-/.test(raw) || /[A-Z]/.test(raw) || /^\d/.test(raw);
      if (code) { out.add(low.replace(/[^a-z0-9]/g, "")); continue; }
      const t = low.replace(/\d+$/, "");
      if (t.length >= 3 && !STOP.has(t)) out.add(stem(t));
      continue;
    }
    for (const part of low.split(/[^a-z0-9]+/)) {
      if (!part || /^\d+$/.test(part)) continue;
      if (/^[A-Z]{2,5}$/.test(raw) && part.length >= 2) { out.add(part); continue; }
      if (part.length >= 3 && !STOP.has(part)) out.add(stem(part));
    }
  }
  return [...out];
}
function buildSim(corpus) {
  const df = new Map(), T = new Map();
  for (const t of corpus) { const k = tokens(t); T.set(t, k); for (const w of k) df.set(w, (df.get(w) || 0) + 1); }
  const N = corpus.length;
  const idf = (w) => Math.max(Math.log((N + 1) / ((df.get(w) || 0) + 1)), 0.15);
  return (a, b) => {
    const A = new Set(T.get(a) || tokens(a)), B = new Set(T.get(b) || tokens(b));
    let sh = 0, tot = 0;
    for (const w of new Set([...A, ...B])) { const x = idf(w); tot += x; if (A.has(w) && B.has(w)) sh += x; }
    return tot ? sh / tot : 0;
  };
}
const AUTO = 0.85, BAND = 0.38, NOJUDGE_REJECT = 0.6, MIN_OUT = 5, MAX_OUT = 9;
const yearsOf = (s) => (s.match(/\b20\d{2}\b/g) || []).map(Number);

// memory: [{title, source:'publicado'|'sitio'|'ofrecido'|'descartado', ageDays}]
// judge: null | (candidate, neighbors[]) => 'same' | 'different' | throws
export function decide(candidates, memory, { judge = null, mode = "activo" } = {}) {
  const seen = new Set(); const cleaned = [];
  for (const c of candidates) { const t = c.trim(); const k = key(t); if (!k || seen.has(k)) continue; seen.add(k); cleaned.push(t); }
  const hardKeys = new Set(memory.filter((m) => m.source !== "descartado").map((m) => key(m.title)));
  const hardDropped = cleaned.filter((c) => hardKeys.has(key(c)));
  const alive = cleaned.filter((c) => !hardKeys.has(key(c)));
  if (mode !== "activo") return { delivered: alive.slice(0, MAX_OUT).map((t) => ({ title: t })), hardDropped, mode };
  const active = memory.filter((m) => !(m.source === "ofrecido" && m.ageDays > 60) && !(m.source === "descartado" && m.ageDays > 90));
  const sim = buildSim([...active.map((m) => m.title), ...alive]);
  const scored = alive.map((c) => {
    const yrs = yearsOf(c);
    let best = 0, bm = null;
    for (const m of active) {
      if (yrs.length && m.ageDays > 365 && !yearsOf(m.title).some((y) => yrs.includes(y))) continue; // regla de año
      const s = sim(c, m.title);
      if (s > best) { best = s; bm = m; }
    }
    return { title: c, sim: best, near: bm };
  });
  const out = scored.map((x) => {
    let verdict = "limpio", nota = null;
    if (x.sim >= BAND) {
      const siteOnly = x.near && x.near.source === "sitio";
      let same = null;
      if (judge) { try { same = judge(x.title, [x.near]) === "same"; } catch { same = null; } }
      if (same === null) { // juez no disponible: solo el código
        same = !siteOnly && x.sim >= NOJUDGE_REJECT;
      }
      if (same) { verdict = "parecido"; nota = `Se parece a tu artículo “${x.near.title}”`; }
    }
    return { ...x, verdict, nota };
  });
  const clean = out.filter((x) => x.verdict === "limpio").sort((a, b) => a.sim - b.sim);
  const similar = out.filter((x) => x.verdict === "parecido").sort((a, b) => a.sim - b.sim);
  let delivered = clean.slice(0, MAX_OUT);
  if (delivered.length < Math.min(MIN_OUT, alive.length)) delivered = [...delivered, ...similar.slice(0, Math.min(MIN_OUT, alive.length) - delivered.length)];
  return { delivered, hardDropped, mode, nClean: clean.length, nSimilar: similar.length };
}

// freno por cuenta: 2 solicitudes seguidas completadas con notas => la siguiente se entrega sin guardia (24 h)
export function breaker(history) { let r = 0, bypass = 0; const log = [];
  for (const needed of history) { if (bypass > 0) { bypass--; log.push("sin-guardia"); r = 0; continue; }
    if (needed) { r++; log.push("guardia:notas#" + r); if (r >= 2) { bypass = 1; } } else { r = 0; log.push("guardia:ok"); } }
  return log; }
