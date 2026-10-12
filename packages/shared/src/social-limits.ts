/**
 * Cupo diario de PUBLICACIONES por red/formato (Administración → Difusión).
 * Regla única para la web y el worker: sin valor guardado o con un valor inválido
 * (no entero, negativo) el cupo es 1; 0 bloquea la red.
 */
export function resolveSocialDailyLimit(limitsRaw: unknown, platform: string): number {
  const limits = limitsRaw && typeof limitsRaw === "object" && !Array.isArray(limitsRaw) ? (limitsRaw as Record<string, unknown>) : {};
  const raw = limits[platform];
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 ? raw : 1;
}
