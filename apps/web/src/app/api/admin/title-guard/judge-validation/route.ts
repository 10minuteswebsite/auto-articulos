import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { LABELED_PAIRS } from "@/lib/angle-guard-labeled-pairs";
import { callJudge, scoreJudge } from "@/lib/angle-guard-judge";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// FASE 1 de la Guardia de ángulos — SOLO administrador y sin efectos: corre el
// juez de IA sobre los 27 pares etiquetados (18 distintos y 9 repetidos) y dice
// si cumple la condición de la especificación (≥ 90 % de aciertos y ningún par
// distinto marcado como «misma pregunta»). No escribe nada en la base de datos
// y no toca ningún flujo de usuarios. Una sola llamada corta a la IA.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const pairs = LABELED_PAIRS.map((p, index) => ({ id: index + 1, candidate: p.a, existing: p.b }));
  const verdicts = await callJudge(pairs, process.env.OPENAI_API_KEY);
  if (!verdicts) {
    return NextResponse.json(
      { ok: false, mensaje: "El juez no respondió de forma confiable (sin clave de IA, tiempo agotado o respuesta incompleta). No se validó nada." },
      { status: 502 },
    );
  }
  const result = scoreJudge(LABELED_PAIRS, verdicts);
  return NextResponse.json({
    ok: true,
    cumple: result.passes,
    resumen: `${result.correct} de ${result.total} aciertos (${result.accuracyPct} %). Falsos «misma pregunta»: ${result.falseSame.length}. Repetidos no detectados: ${result.missedSame.length}.`,
    condicion: "Cumple si hay al menos 90 % de aciertos y cero pares distintos marcados como «misma pregunta».",
    ...result,
  });
}
