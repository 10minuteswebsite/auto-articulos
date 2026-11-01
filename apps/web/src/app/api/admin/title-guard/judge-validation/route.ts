import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { HELDOUT_PAIRS, LABELED_PAIRS } from "@/lib/angle-guard-labeled-pairs";
import { JUDGE_MODEL, callJudge, scoreJudge } from "@/lib/angle-guard-judge";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// FASE 1 de la Guardia de ángulos — SOLO administrador y sin efectos: corre el
// juez de IA sobre los 27 pares etiquetados (18 distintos y 9 repetidos) y dice
// si cumple la condición de la especificación (≥ 90 % de aciertos y ningún par
// distinto marcado como «misma pregunta»). No escribe nada en la base de datos
// y no toca ningún flujo de usuarios. Una sola llamada corta a la IA.
// Modelos que se pueden PROBAR aquí. El del juez en producción es JUDGE_MODEL (gpt-4.1).
const TESTABLE_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  // Una sola llamada con los 27 pares de la condición (ids 1–27) y los 10 independientes (ids 28–37).
  const all = [...LABELED_PAIRS, ...HELDOUT_PAIRS];
  const pairs = all.map((p, index) => ({ id: index + 1, candidate: p.a, existing: p.b }));
  // 37 pares tardan más que los ~14 de un uso normal: aquí se concede más tiempo (la ruta admite 30 s).
  const requested = request.nextUrl.searchParams.get("modelo");
  const model = requested && TESTABLE_MODELS.includes(requested) ? requested : undefined;
  const verdicts = await callJudge(pairs, process.env.OPENAI_API_KEY, { timeoutMs: 25_000, model });
  if (!verdicts) {
    // Se responde 200 con ok:false a propósito: Cloudflare tapa los 5xx con su propia página y no se vería el motivo.
    return NextResponse.json({ ok: false, mensaje: "El juez no respondió de forma confiable (sin clave de IA, tiempo agotado o respuesta incompleta). No se validó nada." });
  }
  const result = scoreJudge(LABELED_PAIRS, verdicts);
  const independent = scoreJudge(
    HELDOUT_PAIRS,
    new Map(HELDOUT_PAIRS.map((_, i) => [i + 1, verdicts.get(LABELED_PAIRS.length + i + 1)!] as const)),
  );
  return NextResponse.json({
    ok: true,
    modelo: model ?? `${JUDGE_MODEL} (el del juez)`,
    cumple: result.passes,
    resumen: `${result.correct} de ${result.total} aciertos (${result.accuracyPct} %). Falsos «misma pregunta»: ${result.falseSame.length}. Repetidos no detectados: ${result.missedSame.length}.`,
    condicion: "Cumple si hay al menos 90 % de aciertos y cero pares distintos marcados como «misma pregunta».",
    ...result,
    independientes: {
      explicacion: "10 pares que no aparecen en el prompt del juez: miden si generaliza. No son parte de la condición, pero no debe haber falsos «misma pregunta».",
      resumen: `${independent.correct} de ${independent.total} aciertos. Falsos «misma pregunta»: ${independent.falseSame.length}.`,
      ...independent,
    },
  });
}
