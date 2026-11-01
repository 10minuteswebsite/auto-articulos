import { decide } from "./guard-sim.mjs";
const out = [];
// cuenta nueva (sin memoria): entrega los candidatos tal cual (hasta 9), sin notas
{ const c = Array.from({ length: 12 }, (_, i) => `Unique angle number ${i} about topic ${["alpha","beta","gamma","delta"][i % 4]} for readers`); const r = decide(c, [], { judge: () => "same" }); out.push(["cuenta nueva", r.delivered.length, r.delivered.some((x) => x.nota)]); }
// limpios ordenados del más nuevo al menos nuevo
{ const mem = [{ title: "How to price your Coral Gables home", source: "publicado", ageDays: 5 }, ...Array.from({ length: 20 }, (_, i) => ({ title: `Filler ${i} about unrelated gardening topic ${i}`, source: "publicado", ageDays: 5 }))];
  const r = decide(["Understanding home inspection reports in Florida", "How to price your Coral Gables home quickly", "Hurricane insurance checklist for sellers"], mem, { judge: () => "different" });
  const sims = r.delivered.map((x) => +x.sim.toFixed(2)); out.push(["orden limpio asc", JSON.stringify(sims), sims.every((v, i) => i === 0 || v >= sims[i - 1])]); }
// modo sombra = actual (no filtra ni reordena)
{ const mem = [{ title: "How to price your Coral Gables home", source: "publicado", ageDays: 5 }]; const c = ["How to price your Coral Gables home quickly", "Selling in Miami tips"]; const r = decide(c, mem, { mode: "sombra" }); out.push(["sombra", r.delivered.map((x) => x.title).join(" | ")]); }
console.log(JSON.stringify(out));
