// Decide si un título en "processing" está realmente muerto.
//
// Causa real probada el 16/10/2026 (cuenta de Antonio Aguirre): el shard de
// mantenimiento de OTRA ejecución del worker vio un título recién reclamado
// —en "processing", todavía sin ningún evento y con `processedAt` vacío— y
// lo dio por atascado al instante (la condición solo saltaba títulos CON
// actividad medible). Lo cerró como error, lo devolvió a Oportunidades y
// detuvo el lote, mientras el worker original seguía vivo y publicó el
// artículo 2 minutos después. La oportunidad restaurada se republicó y el
// sitio rechazó el título duplicado.
//
// Regla: sin evidencia de inactividad NO se declara muerto. La actividad es
// la señal más reciente entre el último evento, el momento en que se reclamó
// el título (`processedAt`) y la creación del lote (respaldo para filas
// antiguas sin ninguna de las dos).

export const STUCK_PROCESSING_MS = 10 * 60 * 1000; // 10 minutos

export function lastTitleActivity(
  signals: ReadonlyArray<Date | null | undefined>,
): Date | null {
  let latest: Date | null = null;
  for (const signal of signals) {
    if (signal && (!latest || signal.getTime() > latest.getTime())) latest = signal;
  }
  return latest;
}

export function isTitleStuck(
  signals: ReadonlyArray<Date | null | undefined>,
  now: number = Date.now(),
  thresholdMs: number = STUCK_PROCESSING_MS,
): boolean {
  const last = lastTitleActivity(signals);
  // Sin ninguna señal no hay base para afirmar que murió.
  if (!last) return false;
  return now - last.getTime() >= thresholdMs;
}
