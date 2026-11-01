import { test } from "node:test";
import assert from "node:assert/strict";
import { LABELED_PAIRS } from "./angle-guard-labeled-pairs";
import { JUDGE_SYSTEM_PROMPT, buildJudgeMessages, callJudge, parseJudgeOutput, scoreJudge, type JudgeVerdict } from "./angle-guard-judge";

const pairs = [
  { id: 1, candidate: "How to Buy a Condo", existing: "How to Sell a Condo" },
  { id: 2, candidate: "5 Ways to Stage", existing: "7 Ways to Stage", existingMayBeCategoryPage: true },
];

test("el prompt del juez contiene las reglas que evitan bloquear títulos distintos", () => {
  for (const regla of ["misma pregunta", "comprar/vender", "número de una lista", "otro año", "posible página de categoría", "same=false", "JSON"]) {
    assert.ok(JUDGE_SYSTEM_PROMPT.toLowerCase().includes(regla.toLowerCase()), regla);
  }
  const { user } = buildJudgeMessages(pairs);
  assert.ok(user.includes("id 1") && user.includes("id 2"));
  assert.ok(user.includes("(posible página de categoría)"));
});

test("interpreta una respuesta correcta y rechaza las incompletas o inservibles", () => {
  const ok = parseJudgeOutput('{"results":[{"id":1,"same":false,"reason":"comprar vs vender"},{"id":2,"same":true,"reason":"solo cambia el número"}]}', [1, 2]);
  assert.equal(ok?.get(1)?.same, false);
  assert.equal(ok?.get(2)?.same, true);
  assert.equal(parseJudgeOutput('texto antes {"results":[{"id":1,"same":false,"reason":"x"},{"id":2,"same":true,"reason":"y"}]} texto después', [1, 2])?.size, 2);
  assert.equal(parseJudgeOutput('{"results":[{"id":1,"same":false,"reason":"x"}]}', [1, 2]), null, "falta un par");
  assert.equal(parseJudgeOutput('{"results":[{"id":1,"same":"no"},{"id":2,"same":true}]}', [1, 2]), null, "tipo inválido");
  assert.equal(parseJudgeOutput("no es json", [1]), null);
  assert.equal(parseJudgeOutput('{"otra":1}', [1]), null);
});

const reply = (content: string) => async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) });

test("callJudge devuelve los veredictos y envía el modelo y la temperatura correctos", async () => {
  let sent: { model?: string; temperature?: number; messages?: unknown[] } = {};
  const fetchImpl = async (_url: string, init: { body: string }) => {
    sent = JSON.parse(init.body);
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"results":[{"id":1,"same":false,"reason":"a"},{"id":2,"same":true,"reason":"b"}]}' } }] }) };
  };
  const out = await callJudge(pairs, "clave", { fetchImpl });
  assert.equal(out?.get(2)?.same, true);
  assert.equal(sent.model, "gpt-4o-mini");
  assert.equal(sent.temperature, 0);
  assert.equal(sent.messages?.length, 2);
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
