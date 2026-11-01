import { test } from "node:test";
import assert from "node:assert/strict";
import { HELDOUT_PAIRS, LABELED_PAIRS } from "./angle-guard-labeled-pairs";
import { JUDGE_SYSTEM_PROMPT, buildJudgeMessages, callJudge, parseJudgeOutput, scoreJudge, type JudgeVerdict } from "./angle-guard-judge";

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
