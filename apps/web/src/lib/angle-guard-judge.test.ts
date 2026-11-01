import { test } from "node:test";
import assert from "node:assert/strict";
import { HELDOUT_PAIRS, LABELED_PAIRS, LIST_CASES } from "./angle-guard-labeled-pairs";
import {
  JUDGE_SYSTEM_PROMPT,
  LIST_JUDGE_SYSTEM_PROMPT,
  buildJudgeMessages,
  buildListJudgeMessages,
  callJudge,
  callListJudge,
  parseJudgeOutput,
  parseListJudgeOutput,
  scoreJudge,
  scoreListJudge,
  type JudgeVerdict,
  type ListJudgeItem,
  type ListJudgeVerdict,
} from "./angle-guard-judge";

const pairs = [
  { id: 1, candidate: "How to Buy a Condo", existing: "How to Sell a Condo" },
  { id: 2, candidate: "5 Ways to Stage", existing: "7 Ways to Stage", existingMayBeCategoryPage: true },
];

test("el prompt del juez contiene las reglas que evitan bloquear títulos distintos", () => {
  for (const regla of ["accion_igual", "publico_igual", "lugar_igual", "producto_igual", "enfoque_igual", "comprar/vender", "número de una lista", "singular y plural", "dueño que alquila", "lugar de contexto general", "posible página de categoría", "JSON", "el programa saca la conclusión"]) {
    assert.ok(JUDGE_SYSTEM_PROMPT.toLowerCase().includes(regla.toLowerCase()), regla);
  }
  const { user } = buildJudgeMessages(pairs);
  assert.ok(user.includes("id 1") && user.includes("id 2"));
  assert.ok(user.includes("(posible página de categoría)"));
});

const row = (id: number, overrides: Record<string, unknown> = {}) => ({ id, accion_igual: true, publico_igual: true, lugar_igual: true, producto_igual: true, enfoque_igual: true, reason: "x", ...overrides });

test("interpreta las cinco respuestas: solo es «misma pregunta» si las cinco son iguales", () => {
  const ok = parseJudgeOutput(JSON.stringify({ results: [row(1, { accion_igual: false }), row(2)] }), [1, 2]);
  assert.equal(ok?.get(1)?.same, false);
  assert.equal(ok?.get(2)?.same, true);
  for (const dimension of ["accion_igual", "publico_igual", "lugar_igual", "producto_igual", "enfoque_igual"]) {
    const one = parseJudgeOutput(JSON.stringify({ results: [row(1, { [dimension]: false })] }), [1]);
    assert.equal(one?.get(1)?.same, false, dimension);
  }
});

test("rechaza las respuestas incompletas o inservibles", () => {
  assert.equal(parseJudgeOutput('texto antes ' + JSON.stringify({ results: [row(1), row(2)] }) + ' texto después', [1, 2])?.size, 2);
  assert.equal(parseJudgeOutput(JSON.stringify({ results: [row(1)] }), [1, 2]), null, "falta un par");
  assert.equal(parseJudgeOutput(JSON.stringify({ results: [row(1, { lugar_igual: "no" }), row(2)] }), [1, 2]), null, "tipo inválido");
  assert.equal(parseJudgeOutput(JSON.stringify({ results: [{ id: 1, same: true }] }), [1]), null, "formato viejo");
  assert.equal(parseJudgeOutput("no es json", [1]), null);
  assert.equal(parseJudgeOutput('{"otra":1}', [1]), null);
});

const reply = (content: string) => async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) });

test("callJudge devuelve los veredictos y envía el modelo y la temperatura correctos", async () => {
  let sent: { model?: string; temperature?: number; messages?: unknown[] } = {};
  const fetchImpl = async (_url: string, init: { body: string }) => {
    sent = JSON.parse(init.body);
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ results: [row(1, { accion_igual: false }), row(2)] }) } }] }) };
  };
  const out = await callJudge(pairs, "clave", { fetchImpl });
  assert.equal(out?.get(2)?.same, true);
  assert.equal(sent.model, "gpt-4.1");
  assert.equal(sent.temperature, 0);
  assert.equal((sent as { max_tokens?: number }).max_tokens, 200 + 80 * 2, "el margen crece con el número de pares");
  assert.equal((sent as { seed?: number }).seed, 7);
  assert.equal(sent.messages?.length, 2);
});

test("callJudge usa el modelo pedido solo cuando se indica (la prueba de administrador)", async () => {
  const sent: string[] = [];
  const fetchImpl = async (_u: string, init: { body: string }) => {
    sent.push(JSON.parse(init.body).model);
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ results: [row(1), row(2)] }) } }] }) };
  };
  await callJudge(pairs, "k", { fetchImpl });
  await callJudge(pairs, "k", { fetchImpl, model: "gpt-4o" });
  assert.deepEqual(sent, ["gpt-4.1", "gpt-4o"]);
});

test("callJudge nunca lanza: sin clave, con error HTTP, con red caída, con respuesta rara o con tiempo agotado devuelve null", async () => {
  assert.equal(await callJudge(pairs, undefined), null);
  assert.equal(await callJudge([], "k"), null);
  assert.equal(await callJudge(pairs, "k", { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) }), null);
  assert.equal(await callJudge(pairs, "k", { fetchImpl: async () => { throw new Error("red"); } }), null);
  assert.equal(await callJudge(pairs, "k", { fetchImpl: reply("basura") }), null);
  const slow = (_u: string, init: { signal: AbortSignal }) => new Promise<never>((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("abortado"))));
  assert.equal(await callJudge(pairs, "k", { fetchImpl: slow as never, timeoutMs: 20 }), null);
});

test("la validación exige ≥ 90 % de aciertos y cero pares distintos marcados como misma pregunta", () => {
  const perfect = new Map<number, JudgeVerdict>(LABELED_PAIRS.map((p, i) => [i + 1, { same: p.same, reason: "" }]));
  const good = scoreJudge(LABELED_PAIRS, perfect);
  assert.equal(good.accuracyPct, 100);
  assert.equal(good.passes, true);
  // Un falso «misma pregunta» (lo más grave) reprueba aunque la exactitud sea alta.
  const oneFalse = new Map(perfect);
  oneFalse.set(1, { same: true, reason: "se equivocó" });
  const bad = scoreJudge(LABELED_PAIRS, oneFalse);
  assert.equal(bad.falseSame.length, 1);
  assert.equal(bad.passes, false);
  // Dejar pasar repetidos solo baja la exactitud: 2 de 27 sigue por encima de 90 %.
  const missed = new Map(perfect);
  const firstRepeated = LABELED_PAIRS.findIndex((p) => p.same);
  missed.set(firstRepeated + 1, { same: false, reason: "" });
  missed.set(firstRepeated + 2, { same: false, reason: "" });
  const lenient = scoreJudge(LABELED_PAIRS, missed);
  assert.equal(lenient.missedSame.length, 2);
  assert.equal(lenient.passes, true);
  assert.equal(LABELED_PAIRS.length, 27);
  assert.equal(LABELED_PAIRS.filter((p) => !p.same).length, 18);
});

test("los pares independientes no aparecen en el prompt del juez (no se le enseña la prueba)", () => {
  assert.equal(HELDOUT_PAIRS.length, 10);
  for (const p of [...LABELED_PAIRS, ...HELDOUT_PAIRS]) {
    assert.ok(!JUDGE_SYSTEM_PROMPT.includes(p.a) || !JUDGE_SYSTEM_PROMPT.includes(p.b), `${p.a} / ${p.b}`);
  }
  assert.ok(LABELED_PAIRS.length + HELDOUT_PAIRS.length <= 40, "caben en una sola llamada");
});

// ---------- juez por lista ----------
const item = (id: number, candidate: string, titles: string[]): ListJudgeItem => ({ id, candidate, neighbors: titles.map((title, i) => ({ id: i + 1, title })) });
const items = [item(1, "Errores al elegir un plan", ["Cómo cancelar un plan", "Fallas que debes evitar al seleccionar un plan"]), item(2, "Cómo abrir un café", ["Cómo cerrar un café"])];

test("el prompt del juez por lista explica los sinónimos y pide ante la duda no marcar", () => {
  for (const regla of ["sinónimos", "same_as", "lista vacía", "preferible dejar pasar", "SÍ cambian la pregunta", "posible página de categoría", "JSON"]) {
    assert.ok(LIST_JUDGE_SYSTEM_PROMPT.includes(regla), regla);
  }
  const { user } = buildListJudgeMessages(items);
  assert.ok(user.includes("CANDIDATO 1") && user.includes("  2. Fallas que debes evitar"));
});

test("lee la respuesta por lista y no se fía de números inventados ni de respuestas incompletas", () => {
  const ok = parseListJudgeOutput(JSON.stringify({ results: [{ id: 1, same_as: [2], reason: "sinónimos" }, { id: 2, same_as: [], reason: "" }] }), items);
  assert.deepEqual(ok?.get(1)?.sameAs, [2]);
  assert.deepEqual(ok?.get(2)?.sameAs, []);
  assert.equal(parseListJudgeOutput(JSON.stringify({ results: [{ id: 1, same_as: [9] }, { id: 2, same_as: [] }] }), items), null, "número que no existe");
  assert.equal(parseListJudgeOutput(JSON.stringify({ results: [{ id: 1, same_as: [2] }] }), items), null, "falta un candidato");
  assert.equal(parseListJudgeOutput("basura", items), null);
});

test("callListJudge nunca lanza y proporciona margen de tokens según el número de candidatos", async () => {
  let sent: { max_tokens?: number; model?: string } = {};
  const fetchImpl = async (_u: string, init: { body: string }) => {
    sent = JSON.parse(init.body);
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ results: [{ id: 1, same_as: [2], reason: "x" }, { id: 2, same_as: [], reason: "" }] }) } }] }) };
  };
  const out = await callListJudge(items, "k", { fetchImpl, model: "gpt-4o" });
  assert.deepEqual(out?.get(1)?.sameAs, [2]);
  assert.equal(sent.model, "gpt-4o");
  assert.equal(sent.max_tokens, 300 + 70 * 2);
  assert.equal(await callListJudge(items, undefined), null);
  assert.equal(await callListJudge(items, "k", { fetchImpl: async () => { throw new Error("red"); } }), null);
  assert.equal(await callListJudge(items, "k", { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) }), null);
});

test("los casos de validación por lista: 12 casos de 25 existentes, 6 con aguja y 6 sin ella", () => {
  assert.equal(LIST_CASES.length, 12);
  for (const c of LIST_CASES) assert.equal(c.neighbors.length, 25, c.candidate);
  assert.equal(LIST_CASES.filter((c) => c.expected !== null).length, 6);
  for (const c of LIST_CASES.filter((c) => c.expected !== null)) assert.ok(c.neighbors[c.expected as number], c.candidate);
  for (const c of LIST_CASES) assert.equal(new Set(c.neighbors).size, 25, `sin repetidos: ${c.candidate}`);
});

test("la validación por lista exige 5 de 6 agujas y cero falsos", () => {
  const perfect = new Map<number, ListJudgeVerdict>(LIST_CASES.map((c, i) => [i + 1, { sameAs: c.expected === null ? [] : [c.expected + 1], reason: "" }] as [number, ListJudgeVerdict]));
  assert.equal(scoreListJudge(LIST_CASES, perfect).passes, true);
  const oneFalse = new Map(perfect);
  const noNeedle = LIST_CASES.findIndex((c) => c.expected === null);
  oneFalse.set(noNeedle + 1, { sameAs: [1], reason: "se equivocó" });
  const bad = scoreListJudge(LIST_CASES, oneFalse);
  assert.equal(bad.falseMatches.length, 1);
  assert.equal(bad.passes, false);
  const missedTwo = new Map(perfect);
  const needles = LIST_CASES.map((c, i) => (c.expected !== null ? i + 1 : 0)).filter(Boolean);
  missedTwo.set(needles[0], { sameAs: [], reason: "" });
  missedTwo.set(needles[1], { sameAs: [], reason: "" });
  assert.equal(scoreListJudge(LIST_CASES, missedTwo).passes, false);
  missedTwo.set(needles[1], { sameAs: [LIST_CASES[needles[1] - 1].expected! + 1], reason: "" });
  assert.equal(scoreListJudge(LIST_CASES, missedTwo).passes, true);
});

test("ningún título de relleno de la validación por lista hace la misma pregunta que un candidato sin aguja (los casos deben ser correctos)", () => {
  // Hallazgo del 2026-11-01: el relleno «Seguro para trabajadores por cuenta propia» era sinónimo exacto del candidato
  // «Seguro de salud para trabajadores independientes»; el juez tenía razón y el caso estaba mal. Se vigila que no vuelva a pasar.
  const sinAguja = LIST_CASES.filter((c) => c.expected === null);
  const independientes = sinAguja.find((c) => c.candidate.includes("trabajadores independientes"));
  assert.ok(independientes);
  assert.ok(!independientes.neighbors.some((n) => /por cuenta propia|autónomos|autonomos/i.test(n)));
});
