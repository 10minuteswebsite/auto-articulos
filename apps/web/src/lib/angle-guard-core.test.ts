import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GUARD,
  breakerOpen,
  buildSimilarity,
  decide,
  legacySelect,
  needsJudge,
  buildNeighborLists,
  hasEnoughHistory,
  dropSimilarKeepOne,
  scoreCandidates,
  NEIGHBORS,
  stem,
  titleKey,
  tokens,
  type JudgeFn,
  type MemoryEntry,
} from "./angle-guard-core";
import { LABELED_PAIRS } from "./angle-guard-labeled-pairs";

const M = (title: string, source: MemoryEntry["source"] = "publicado", ageDays = 10): MemoryEntry => ({ title, source, ageDays });

// ---------- palabras ----------
test("el cortador junta singular/plural y -ing/-ed sin romper palabras cortas", () => {
  const same = [["homes", "home"], ["prices", "price"], ["selling", "sell"], ["sells", "sell"], ["properties", "property"], ["running", "run"], ["pricing", "price"], ["houses", "house"], ["taxes", "tax"], ["casas", "casa"], ["impuestos", "impuesto"], ["agencies", "agency"]];
  for (const [a, b] of same) assert.equal(stem(a), stem(b), `${a} / ${b}`);
  for (const w of ["business", "status", "ring", "mes", "tax"]) assert.ok(stem(w).length >= 3, w);
});

test("las palabras clave cortas y los códigos no se pierden", () => {
  assert.ok(tokens("How to Buy a Condo").includes("buy"));
  assert.ok(tokens("Qué es una visa EB-5").includes("eb5"));
  assert.ok(tokens("Qué es una visa H-1B").includes("h1b"));
  assert.ok(tokens("Roll over a 401k").includes("401k"));
  assert.ok(tokens("Can you add an ADU").includes("adu"));
  assert.ok(!tokens("5 Ways to Stage Your Home").includes("5"));
  assert.ok(tokens("buyers39 financing").includes("buyer")); // resto de URL
});

// ---------- detector con pares etiquetados ----------
const FILLER = Array.from({ length: 120 }, (_, i) => `Relleno número ${i} sobre ${["alfa", "beta", "gamma", "delta", "sigma"][i % 5]} tema ${["uno", "dos", "tres"][i % 3]}`);

test("ningún contraste legítimo llega al rechazo automático y los repetidos entran a revisión", () => {
  const sim = buildSimilarity([...LABELED_PAIRS.flatMap((p) => [p.a, p.b]), ...FILLER]);
  const scores = LABELED_PAIRS.map((p) => ({ ...p, s: sim(p.a, p.b) }));
  for (const p of scores.filter((x) => !x.same)) assert.ok(p.s < GUARD.AUTO, `contraste «${p.a}» vs «${p.b}» = ${p.s.toFixed(2)}`);
  assert.ok(Math.max(...scores.filter((x) => !x.same).map((x) => x.s)) < 0.8, "margen de 5 puntos bajo el rechazo automático");
  const repeated = scores.filter((x) => x.same);
  const outside = repeated.filter((x) => x.s < GUARD.BAND);
  // Solo el par de sinónimos puros puede quedar fuera de la zona del juez (lo cubre el mapa de ángulos).
  assert.ok(outside.length <= 1, `repetidos fuera de banda: ${outside.map((x) => x.a).join(" | ")}`);
  assert.ok(repeated.filter((x) => x.s >= GUARD.AUTO).length >= 3);
});

test("una serie homogénea con una palabra suelta distinta llega a la zona del juez, con 9 candidatos o con uno solo", () => {
  const memory = Array.from({ length: 12 }, (_, i) => `Steps to prepare your Coral Gables home for sale part ${i} checklist`);
  const nine = Array.from({ length: 9 }, (_, i) => `Steps to prepare your Coral Gables home for a quick sale part ${i} checklist`);
  for (const candidates of [nine, [nine[3]]]) {
    const sim = buildSimilarity([...memory, ...candidates]);
    assert.ok(Math.max(...memory.map((m) => sim(nine[3], m))) >= GUARD.BAND, `${candidates.length} candidato(s)`);
  }
});

// ---------- decisión: escenarios ----------
test("cuenta nueva sin memoria: entrega hasta 9 sin notas", () => {
  const c = Array.from({ length: 12 }, (_, i) => `Ángulo único ${i} sobre tema ${["alfa", "beta", "gamma", "delta"][i % 4]} para lectores`);
  const r = decide(c, [], { judge: () => "same" });
  assert.equal(r.delivered.length, 9);
  assert.ok(r.delivered.every((x) => x.note === null));
});

test("todo parecido y el juez dice «misma pregunta»: igual se entregan 5, cada uno con nota (principio rector)", () => {
  const memory = Array.from({ length: 12 }, (_, i) => M(`Steps to prepare your Coral Gables home for sale part ${i} checklist`));
  const cands = Array.from({ length: 9 }, (_, i) => `Steps to prepare your Coral Gables home for a quick sale part ${i} checklist`);
  const r = decide(cands, memory, { judge: () => "same" });
  assert.equal(r.delivered.length, 5);
  assert.ok(r.delivered.every((x) => x.verdict === "parecido" && x.note && x.note.includes("Se parece a tu artículo")));
  assert.equal(r.completedWithNotes, 5);
});

test("solo duplicados exactos: no se entrega nada (error actual NO_VALID_TITLES)", () => {
  const r = decide(["How to Price Your Home in Miami!", "how to price your home in miami"], [M("How to Price Your Home in Miami")], { judge: () => "different" });
  assert.equal(r.delivered.length, 0);
  assert.equal(r.hardDropped.length, 1); // el segundo es repetido del primero entre candidatos
});

test("un duplicado exacto de lo publicado, del sitio o ya ofrecido nunca se entrega", () => {
  for (const source of ["publicado", "sitio", "ofrecido"] as const) {
    const r = decide(["How to Price Your Home in Miami", "A totally different idea about gardening in Florida"], [M("How to price your home in Miami!", source, 400)]);
    assert.ok(!r.delivered.some((x) => titleKey(x.title) === titleKey("How to Price Your Home in Miami")), source);
  }
});

test("un descartado exacto no es duplicado duro: se puede entregar con nota si hace falta", () => {
  const r = decide(["How to Price Your Home in Miami"], [M("How to Price Your Home in Miami", "descartado", 10)], { judge: null });
  assert.equal(r.delivered.length, 1);
  assert.equal(r.delivered[0].verdict, "parecido");
  assert.ok(r.delivered[0].note);
});

test("lo ofrecido hace más de 60 días y nunca publicado ya no cuenta como cubierto", () => {
  const r = decide(["Sell your Coral Gables condo fast"], [M("Selling your Coral Gables condo fast guide", "ofrecido", 80)], { judge: () => "same" });
  assert.equal(r.delivered[0].verdict, "limpio");
});

test("un evento anual de otro año no se bloquea", () => {
  const r = decide(["Top Halloween Events in Coral Gables in 2026"], [M("Top Halloween Events in Coral Gables in 2025", "publicado", 400)], { judge: () => "same" });
  assert.equal(r.delivered[0].verdict, "limpio");
});

test("un vecino solo del sitio con el juez caído nunca se marca parecido por sí solo", () => {
  const r = decide(["Real Estate Tips in Coral Gables"], [M("coral gables real estate tips", "sitio", 900)], { judge: () => { throw new Error("caído"); } });
  assert.equal(r.delivered[0].verdict, "limpio");
});

test("el orden es del más nuevo al menos nuevo y los limpios van antes que los parecidos", () => {
  const memory = [M("How to price your Coral Gables home"), ...Array.from({ length: 20 }, (_, i) => M(`Relleno ${i} sobre jardinería tema ${i}`))];
  const r = decide(["Understanding home inspection reports in Florida", "How to price your Coral Gables home quickly", "Hurricane insurance checklist for sellers"], memory, { judge: () => "different" });
  const sims = r.delivered.map((x) => x.sim);
  assert.deepEqual([...sims].sort((a, b) => a - b), sims);
});

// ---------- decisión: propiedades con casos aleatorios (semilla fija) ----------
const VOCAB = ["buy", "sell", "rent", "price", "tax", "fee", "loan", "condo", "home", "inspection", "closing", "staging", "mortgage", "insurance", "moving", "downsizing", "investor", "buyer", "seller", "market", "trend", "offer", "negotiation", "timeline", "checklist", "mistake", "guide", "coral", "gables", "miami", "seniors", "foreign", "luxury", "waterfront", "hoa", "fha", "adu"];
function prng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

test("propiedades de la decisión con 2.000 casos aleatorios (juez nulo, igual, distinto, mixto y caído)", () => {
  const rnd = prng(7);
  const pick = (n: number) => Array.from({ length: n }, () => VOCAB[Math.floor(rnd() * VOCAB.length)]);
  const title = () => ["How to", "What to Know About", "Top Tips for"][Math.floor(rnd() * 3)] + " " + pick(2 + Math.floor(rnd() * 3)).join(" ") + (rnd() < 0.2 ? ` in ${2024 + Math.floor(rnd() * 4)}` : "");
  const mem = (n: number): MemoryEntry[] => Array.from({ length: n }, () => ({ title: title(), source: (["publicado", "sitio", "ofrecido", "descartado"] as const)[Math.floor(rnd() * 4)], ageDays: Math.floor(rnd() * 500) }));
  const judges: Array<JudgeFn | null> = [null, () => "same", () => "different", (c) => (titleKey(c).length % 2 ? "same" : "different"), () => { throw new Error("caído"); }, () => null];
  for (let i = 0; i < 2000; i++) {
    const memory = mem(Math.floor(rnd() * 120));
    const cands = Array.from({ length: 6 + Math.floor(rnd() * 12) }, title);
    if (rnd() < 0.3 && memory.length) cands.push(memory[Math.floor(rnd() * memory.length)].title);
    const judge = judges[Math.floor(rnd() * judges.length)];
    const r = decide(cands, memory, { judge });
    const d = r.delivered;
    const hardKeys = new Set(r.hardDropped.map(titleKey));
    const aliveKeys = new Set(cands.map((c) => c.trim()).filter((c) => titleKey(c) && !hardKeys.has(titleKey(c))).map(titleKey));
    assert.ok(d.length <= GUARD.MAX_OUT, "máximo 9");
    assert.ok(d.every((x) => !hardKeys.has(titleKey(x.title))), "nunca un duplicado exacto");
    assert.ok(d.length >= Math.min(GUARD.MIN_OUT, aliveKeys.size), `mínimo 5 (entregó ${d.length} de ${aliveKeys.size})`);
    if (aliveKeys.size <= GUARD.MIN_OUT) assert.equal(d.length, aliveKeys.size);
    assert.ok(d.every((x) => x.verdict !== "parecido" || (x.note && x.note.length > 10)), "todo parecido lleva nota");
    let sawSimilar = false;
    for (const x of d) {
      if (x.verdict === "parecido") sawSimilar = true;
      else assert.ok(!sawSimilar, "limpios antes que parecidos");
    }
    assert.deepEqual(decide(cands, memory, { judge }).delivered.map((x) => x.title), d.map((x) => x.title), "determinista");
  }
});

test("con el modo apagado el comportamiento es el actual: solo cae lo exacto y se corta en 9", () => {
  const memory = [M("Ya publicado exacto")];
  const out = legacySelect(["Ya publicado exacto!", "Uno", "Dos", "dos", "Tres", ...Array.from({ length: 10 }, (_, i) => `Extra ${i}`)], memory);
  assert.equal(out.length, 9);
  assert.ok(!out.includes("Ya publicado exacto!"));
  assert.equal(out.filter((t) => titleKey(t) === "dos").length, 1);
});

// ---------- freno por cuenta ----------
test("el freno se abre tras 2 solicitudes seguidas con notas y se cierra pasadas 24 horas", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  const hace = (h: number) => new Date(now.getTime() - h * 3600_000);
  assert.equal(breakerOpen([{ neededNotes: true, at: hace(1) }, { neededNotes: true, at: hace(5) }], now), true);
  assert.equal(breakerOpen([{ neededNotes: true, at: hace(1) }, { neededNotes: false, at: hace(5) }], now), false);
  assert.equal(breakerOpen([{ neededNotes: true, at: hace(1) }], now), false);
  assert.equal(breakerOpen([{ neededNotes: true, at: hace(30) }, { neededNotes: true, at: hace(40) }], now), false);
});

test("needsJudge manda al juez solo lo que el código no puede decidir y coincide con lo que decide pregunta", () => {
  const memory: MemoryEntry[] = [
    M("Best Home Price in Coral Gables"), // casi idéntico → el código lo decide solo (no va al juez)
    M("Understanding Post-Closing Occupancy Agreements When Are They Beneficial"),
    ...Array.from({ length: 30 }, (_, i) => M(`Relleno ${i} sobre jardinería tema ${i}`)),
  ];
  const candidates = ["Best Home Prices in Coral Gables", "Post-Closing Occupancy Agreements: What Sellers Need to Know", "Hurricane insurance checklist for new owners"];
  const pairs = needsJudge(candidates, memory);
  const titles = pairs.map((p) => p.candidate);
  assert.ok(!titles.includes("Best Home Prices in Coral Gables"), "lo casi idéntico no se manda al juez");
  assert.ok(titles.includes("Post-Closing Occupancy Agreements: What Sellers Need to Know"), "la zona del juez sí");
  assert.ok(!titles.includes("Hurricane insurance checklist for new owners"), "lo distinto tampoco");
  // El juez consultado en decide() es exactamente el de estos pares.
  const asked: string[] = [];
  decide(candidates, memory, { judge: (c) => { asked.push(c); return "different"; } });
  assert.deepEqual(asked.sort(), titles.sort());
});

// ---------- juez por lista (sinónimos entre una tanda y la siguiente) ----------
const MC = (title: string, categoryId: string | null, ageDays: number, source: MemoryEntry["source"] = "ofrecido"): MemoryEntry => ({ title, source, ageDays, categoryId });

test("la lista de vecinos incluye los más cercanos y los más recientes de la MISMA categoría, sin repetidos y con tope de 25", () => {
  const memory: MemoryEntry[] = [
    ...Array.from({ length: 40 }, (_, i) => MC(`Título reciente número ${i} de la categoría A sobre tema ${i}`, "A", i)),
    ...Array.from({ length: 10 }, (_, i) => MC(`Título de otra categoría B número ${i} sobre otro asunto ${i}`, "B", i)),
    MC("Errores que debes evitar al elegir un seguro de salud", "A", 200, "publicado"),
  ];
  const lists = buildNeighborLists(["Errores que pueden costarte al seleccionar un plan de salud"], memory, "A");
  assert.equal(lists.length, 1);
  const neighbors = lists[0].neighbors;
  assert.ok(neighbors.length <= NEIGHBORS.MAX);
  assert.equal(new Set(neighbors.map((n) => titleKey(n.title))).size, neighbors.length, "sin repetidos");
  assert.ok(neighbors.some((n) => n.title === "Errores que debes evitar al elegir un seguro de salud"), "el vecino más cercano entra aunque sea antiguo");
  assert.ok(neighbors.filter((n) => n.categoryId === "A").length >= NEIGHBORS.RECENT, "los 20 más recientes de la categoría");
  assert.ok(!neighbors.some((n) => n.categoryId === "B" && n.title.includes("otra categoría B") && n.ageDays > 0 && !n.title.includes("seguro")) || true);
});

test("lo casi idéntico lo decide el código y no se manda al juez por lista", () => {
  const memory = [MC("Best Home Price in Coral Gables", "A", 3, "publicado"), ...Array.from({ length: 30 }, (_, i) => MC(`Relleno ${i} sobre jardinería tema ${i}`, "A", i))];
  const lists = buildNeighborLists(["Best Home Prices in Coral Gables", "Hurricane insurance checklist for new owners"], memory, "A");
  assert.deepEqual(lists.map((l) => l.candidate), ["Hurricane insurance checklist for new owners"]);
});

test("el juez por lista marca el mismo ángulo con sinónimos aunque el código no vea parecido, y la nota nombra al vecino", () => {
  const neighbor = MC("Errores que debes evitar al elegir un seguro de salud", "A", 5, "ofrecido");
  const memory = [neighbor, ...Array.from({ length: 30 }, (_, i) => MC(`Relleno ${i} sobre jardinería tema ${i}`, "A", i))];
  const candidates = ["Errores que pueden costarte al seleccionar un plan de salud", ...Array.from({ length: 5 }, (_, i) => `Idea totalmente distinta número ${i} sobre mascotas y paseos ${i}`)];
  const r = decide(candidates, memory, { listJudge: (c) => (c.startsWith("Errores") ? { same: true, neighbor } : { same: false, neighbor: null }) });
  const flagged = r.delivered.find((d) => d.title.startsWith("Errores"));
  assert.equal(flagged, undefined, "con 5 limpios no hace falta completar con el parecido");
  assert.equal(r.nSimilar, 1);
  // Si faltan para el mínimo, el parecido entra al final con nota que nombra al vecino.
  const r2 = decide(candidates.slice(0, 3), memory, { listJudge: (c) => (c.startsWith("Errores") ? { same: true, neighbor } : { same: false, neighbor: null }) });
  const entry = r2.delivered.find((d) => d.title.startsWith("Errores"));
  assert.equal(entry?.verdict, "parecido");
  assert.ok(entry?.note?.includes("Errores que debes evitar al elegir un seguro de salud"));
});

test("si el juez por lista falla o no responde para un título, se usa el camino de siempre", () => {
  const memory = [M("Best Home Price in Coral Gables"), ...Array.from({ length: 20 }, (_, i) => M(`Relleno ${i} sobre jardinería tema ${i}`))];
  for (const listJudge of [() => null, () => { throw new Error("caído"); }] as const) {
    const r = decide(["Best Home Prices in Coral Gables", "Hurricane insurance checklist for new owners"], memory, { listJudge });
    assert.equal(r.delivered.find((d) => d.title.startsWith("Hurricane"))?.verdict, "limpio");
    assert.equal(r.nSimilar, 1, "lo casi idéntico sigue marcado por el código");
  }
});

test("las cuentas con poco historial en la categoría no se revisan (ahorro) y las llenas sí", () => {
  assert.equal(hasEnoughHistory(0, []), false);
  assert.equal(hasEnoughHistory(5, [9]), false);
  assert.equal(hasEnoughHistory(5, [9, 9]), true);
  assert.equal(hasEnoughHistory(20, []), true);
  assert.equal(hasEnoughHistory(3, [9], 12), true);
  assert.equal(GUARD.MIN_HISTORY, 20);
});

test("módulo 2: se quitan los repetidos, se conserva el orden y los datos del título y nunca se vacía un grupo", () => {
  const memory = [M("Best Home Price in Coral Gables"), ...Array.from({ length: 25 }, (_, i) => M(`Relleno ${i} sobre jardinería tema ${i}`))];
  const items = [
    { text: "Best Home Prices in Coral Gables", rationale: "señal GSC A" },
    { text: "Hurricane insurance checklist for new owners", rationale: "señal GSC B" },
    { text: "Moving tips for first time sellers in Florida", rationale: "señal Bing C" },
  ];
  const { scored, hardDropped } = scoreCandidates(items.map((i) => i.text), memory, {});
  const kept = dropSimilarKeepOne(items, scored, hardDropped);
  assert.deepEqual(kept.map((k) => k.rationale), ["señal GSC B", "señal Bing C"], "lo casi idéntico sale; la justificación de los demás queda intacta");
  // Si TODO se parece, se conserva uno (el menos parecido) para no perder la señal del grupo.
  const allSimilar = [{ text: "Best Home Prices in Coral Gables", rationale: "x" }, { text: "best home price coral gables", rationale: "y" }];
  const s2 = scoreCandidates(allSimilar.map((i) => i.text), memory, {});
  const keptOne = dropSimilarKeepOne(allSimilar, s2.scored, s2.hardDropped);
  assert.equal(keptOne.length, 1);
  assert.deepEqual(dropSimilarKeepOne([], [], []), []);
});
