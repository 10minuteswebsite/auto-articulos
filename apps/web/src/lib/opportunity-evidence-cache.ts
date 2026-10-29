import { prisma, type Prisma } from "@auto-articulos/db";

export type OpportunityEvidenceSource = "gsc" | "ga4" | "bing";

type CacheScope = {
  userId: string;
  siteDomain?: string | null;
  panel?: string | null;
  source: OpportunityEvidenceSource;
};

// Pedido de Milton, 29/10/2026: 7 días era poco; las tres fuentes se renuevan
// cada 20 días. Además la última copia buena se conserva sin vencimiento duro
// (ver readLastGoodOpportunityEvidenceCache) para no dejar al usuario sin
// análisis cuando la consulta de hoy falla o sale vacía.
const TTL_MS: Record<OpportunityEvidenceSource, number> = {
  gsc: 20 * 24 * 60 * 60 * 1000,
  ga4: 20 * 24 * 60 * 60 * 1000,
  bing: 20 * 24 * 60 * 60 * 1000,
};

function normalizedScope(scope: CacheScope) {
  return {
    userId: scope.userId,
    siteDomain: scope.siteDomain ?? "",
    panel: scope.panel ?? "",
    source: scope.source,
  };
}

export async function readFreshOpportunityEvidenceCache<T>(scope: CacheScope): Promise<T | null> {
  const row = await prisma.opportunityEvidenceCache.findUnique({
    where: { userId_siteDomain_panel_source: normalizedScope(scope) },
  });
  if (!row || row.status !== "ok" || row.expiresAt <= new Date()) return null;
  return row.payload as T;
}

/** Última copia buena guardada, esté vencida o no. Solo para el camino de fallo. */
export async function readLastGoodOpportunityEvidenceCache<T>(
  scope: CacheScope,
): Promise<{ payload: T; fetchedAt: Date } | null> {
  const row = await prisma.opportunityEvidenceCache.findUnique({
    where: { userId_siteDomain_panel_source: normalizedScope(scope) },
  });
  if (!row || row.status !== "ok") return null;
  return { payload: row.payload as T, fetchedAt: row.fetchedAt };
}

export async function writeOpportunityEvidenceCache(
  scope: CacheScope,
  payload: Prisma.InputJsonValue,
  periodStart?: Date,
  periodEnd?: Date,
) {
  const now = new Date();
  const key = normalizedScope(scope);
  return prisma.opportunityEvidenceCache.upsert({
    where: { userId_siteDomain_panel_source: key },
    create: {
      ...key,
      payload,
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + TTL_MS[scope.source]),
      periodStart,
      periodEnd,
      status: "ok",
      errorMessage: null,
    },
    update: {
      payload,
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + TTL_MS[scope.source]),
      periodStart,
      periodEnd,
      status: "ok",
      errorMessage: null,
    },
  });
}
