import { decide, key, breaker } from "./guard-sim.mjs";
import assert from "node:assert/strict";

const V = ["buy","sell","rent","price","tax","fee","loan","condo","home","inspection","closing","staging","mortgage","insurance","moving","downsizing","investor","buyer","seller","market","trend","offer","negotiation","timeline","checklist","mistake","guide","coral","gables","miami","seniors","first-time","foreign","luxury","waterfront","hoa","fha","va","adu"];
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (n) => Array.from({ length: n }, () => V[Math.floor(rnd() * V.length)]);
const title = () => ["How to","What to Know About","Top Tips for"][Math.floor(rnd()*3)] + " " + pick(2 + Math.floor(rnd() * 3)).join(" ") + (rnd() < 0.2 ? " in " + (2024 + Math.floor(rnd()*4)) : "");
const mem = (n) => Array.from({ length: n }, () => ({ title: title(), source: ["publicado","sitio","ofrecido","descartado"][Math.floor(rnd()*4)], ageDays: Math.floor(rnd() * 500) }));
const judges = [null, () => "same", () => "different", (c) => (key(c).length % 2 ? "same" : "different"), () => { throw new Error("juez caído"); }];

let fails = []; let stats = { casos: 0, conNotas: 0, menosDeNueve: 0, vacios: 0 };
for (let i = 0; i < 4000; i++) {
  const memory = mem(Math.floor(rnd() * 120));
  const cands = Array.from({ length: 6 + Math.floor(rnd() * 12) }, title);
  if (rnd() < 0.3 && memory.length) cands.push(memory[Math.floor(rnd() * memory.length)].title); // duplicado exacto a propósito
  const judge = judges[Math.floor(rnd() * judges.length)];
  const r = decide(cands, memory, { judge, mode: "activo" });
  const legacy = decide(cands, memory, { judge, mode: "apagado" });
  const alive = [...new Set(cands.map((c) => c.trim()))].filter((c) => key(c) && !r.hardDropped.map((h) => h).includes(c));
  const aliveKeys = new Set(cands.filter((c) => !r.hardDropped.includes(c)).map(key));
  stats.casos++;
  const d = r.delivered;
  try {
    assert.ok(d.length <= 9, "I1: máximo 9");
    for (const x of d) { assert.ok(!r.hardDropped.map(key).includes(key(x.title)), "I2: nunca entrega un duplicado exacto de lo publicado/sitio/ofrecido"); }
    const nAlive = aliveKeys.size;
    assert.ok(d.length >= Math.min(5, nAlive), `I3: mínimo min(5, vivos) -> entregó ${d.length} de ${nAlive}`);
    if (nAlive <= 5) assert.equal(d.length, nAlive, "I4: con ≤5 vivos entrega todos");
    for (const x of d) if (x.verdict === "parecido") assert.ok(x.nota && x.nota.length > 10, "I5: todo parecido lleva nota");
    let sawSimilar = false; for (const x of d) { if (x.verdict === "parecido") sawSimilar = true; else assert.ok(!sawSimilar, "I6: limpios antes que parecidos"); }
    assert.deepEqual(legacy.delivered.map((x) => x.title), cands.map((c) => c.trim()).filter((c, i2, arr) => arr.findIndex((z) => key(z) === key(c)) === i2).filter((c) => !r.hardDropped.map(key).includes(key(c))).slice(0, 9), "I7: apagado/sombra = comportamiento actual");
    const r2 = decide(cands, memory, { judge, mode: "activo" });
    assert.deepEqual(r2.delivered.map((x) => x.title), d.map((x) => x.title), "I8: determinista");
    if (d.some((x) => x.verdict === "parecido")) stats.conNotas++;
    if (d.length < 9) stats.menosDeNueve++;
    if (d.length === 0) stats.vacios++;
  } catch (e) { fails.push(e.message); if (fails.length < 6) console.log("FALLA", e.message); }
}
console.log(JSON.stringify({ stats, fallas: fails.length, tiposDeFalla: [...new Set(fails.map((f) => f.split(":")[0]))] }));

// escenarios deterministas
const M = (title, source = "publicado", ageDays = 10) => ({ title, source, ageDays });
const esc = [];
// E1: todos los candidatos parecidos -> igual se entregan 5 con nota
{ const memory = Array.from({ length: 12 }, (_, i) => M(`Steps to prepare your Coral Gables home for sale part ${i} checklist`));
  const cands = Array.from({ length: 9 }, (_, i) => `Steps to prepare your Coral Gables home for a quick sale part ${i} checklist`);
  const r = decide(cands, memory, { judge: () => "same" }); esc.push(["E1 todo parecido y juez dice 'misma pregunta'", r.delivered.length, r.delivered.every((x) => x.nota)]); }
// E2: exactos duplicados de publicado -> nunca se entregan; si IA solo devuelve duplicados exactos -> 0 (error legado NO_VALID_TITLES)
{ const memory = [M("How to Price Your Home in Miami")]; const r = decide(["How to Price Your Home in Miami!", "how to price your home in miami"], memory, { judge: () => "different" }); esc.push(["E2 solo duplicados exactos", r.delivered.length, "esperado 0 = error legado"]); }
// E3: descartado exacto (hace 10 días) NO es duplicado duro: se puede entregar si hace falta, con prioridad baja
{ const memory = [M("How to Price Your Home in Miami", "descartado", 10)]; const r = decide(["How to Price Your Home in Miami"], memory, { judge: null }); esc.push(["E3 descartado exacto", r.delivered.length, r.delivered[0]?.verdict]); }
// E4: ofrecido de hace 80 días ya no cuenta como parecido
{ const memory = [M("Selling your Coral Gables condo fast guide", "ofrecido", 80)]; const r = decide(["Sell your Coral Gables condo fast"], memory, { judge: () => "same" }); esc.push(["E4 ofrecido caducado", r.delivered[0]?.verdict, r.nClean]); }
// E5: evento anual
{ const memory = [M("Top Halloween Events in Coral Gables in 2025", "publicado", 400)]; const r = decide(["Top Halloween Events in Coral Gables in 2026"], memory, { judge: () => "same" }); esc.push(["E5 evento anual", r.delivered[0]?.verdict]); }
// E6: juez caído y títulos del sitio (no rechazan solos)
{ const memory = [M("coral gables real estate tips", "sitio", 900)]; const r = decide(["Real Estate Tips in Coral Gables"], memory, { judge: () => { throw new Error("x"); } }); esc.push(["E6 sitio + juez caído", r.delivered[0]?.verdict]); }
// E7: freno
esc.push(["E7 freno (2 seguidas con notas)", breaker([true, true, true, false, true]).join(" | ")]);
console.log(JSON.stringify(esc, null, 0));
