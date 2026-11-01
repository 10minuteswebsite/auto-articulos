import { prisma, type Prisma } from "@auto-articulos/db";
import { normalizeTitleKey } from "@auto-articulos/shared/src/published-title";

// Registro forense de títulos descartados o borrados (tabla ArticleTitleDiscard).
//
// REGLA CRÍTICA: esto NUNCA puede romper ni frenar el flujo que lo llama. Si la
// tabla todavía no existe (migración sin aplicar) o cualquier consulta falla,
// se traga el error y el descarte/borrado sigue exactamente como antes. Por eso
// todo va dentro de try/catch y con un tope de tiempo.

export type DiscardSource =
  | "opportunity_title"
  | "opportunity_group"
  | "opportunity_all"
  | "opportunity_replaced"
  | "run_deleted";

const LOG_BUDGET_MS = 4000;

function withBudget<T>(work: Promise<T>): Promise<T | undefined> {
  return Promise.race([work, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), LOG_BUDGET_MS))]);
}

/** Guarda, ANTES de borrar, los títulos de las oportunidades que cumplan `where`. */
export async function logDiscardedOpportunities(input: {
  userId: string;
  where: Prisma.OpportunityTitleWhereInput;
  source: DiscardSource;
  actor?: string;
}): Promise<void> {
  try {
    await withBudget(
      (async () => {
        const titles = await prisma.opportunityTitle.findMany({
          where: input.where,
          select: {
            text: true,
            rationale: true,
            createdAt: true,
            group: {
              select: {
                rationale: true,
                impressions: true,
                clicks: true,
                createdAt: true,
                categoryId: true,
                category: { select: { name: true, siteDomain: true } },
              },
            },
          },
          take: 2000,
        });
        if (titles.length === 0) return;
        await prisma.articleTitleDiscard.createMany({
          data: titles.map((t) => ({
            userId: input.userId,
            siteDomain: t.group.category.siteDomain ?? "",
            categoryId: t.group.categoryId,
            categoryName: t.group.category.name,
            titleText: t.text,
            titleKey: normalizeTitleKey(t.text),
            source: input.source,
            titleRationale: t.rationale,
            groupRationale: t.group.rationale,
            impressions: t.group.impressions,
            clicks: t.group.clicks,
            originCreatedAt: t.createdAt,
            actor: input.actor ?? "user",
          })),
        });
      })(),
    );
  } catch (error) {
    console.warn("[historial-forense] no se pudo registrar el descarte (el flujo sigue igual):", error instanceof Error ? error.message : error);
  }
}

/** Guarda, ANTES de «Borrar historial», los títulos fallidos o cancelados. */
export async function logDeletedRunTitles(input: { userId: string; actor?: string }): Promise<void> {
  try {
    await withBudget(
      (async () => {
        const titles = await prisma.title.findMany({
          where: {
            status: { in: ["error", "cancelled"] },
            run: { userId: input.userId, status: { notIn: ["pending", "running"] } },
          },
          select: {
            text: true,
            status: true,
            errorMessage: true,
            opportunityCreatedAt: true,
            run: { select: { categoryId: true, category: { select: { name: true, siteDomain: true } } } },
          },
          take: 2000,
        });
        if (titles.length === 0) return;
        await prisma.articleTitleDiscard.createMany({
          data: titles.map((t) => ({
            userId: input.userId,
            siteDomain: t.run.category.siteDomain ?? "",
            categoryId: t.run.categoryId,
            categoryName: t.run.category.name,
            titleText: t.text,
            titleKey: normalizeTitleKey(t.text),
            source: "run_deleted",
            titleRationale: `${t.status === "error" ? "Error" : "Cancelado"}${t.errorMessage ? `: ${t.errorMessage.slice(0, 500)}` : ""}`,
            originCreatedAt: t.opportunityCreatedAt,
            actor: input.actor ?? "user",
          })),
        });
      })(),
    );
  } catch (error) {
    console.warn("[historial-forense] no se pudo archivar el historial borrado (el borrado sigue igual):", error instanceof Error ? error.message : error);
  }
}
