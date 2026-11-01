import { prisma } from "@auto-articulos/db";

// Guarda, al convertir una oportunidad en publicación, el razonamiento con el
// que se propuso cada título (tabla TitleOrigin). Las oportunidades se borran
// al ejecutarse; sin esto, meses después nadie sabría por qué se escribió un
// artículo. Igual que el registro de descartes: NUNCA puede romper ni frenar la
// publicación. Si la tabla falta o algo falla, se registra una advertencia y
// todo sigue como antes. Se llama DESPUÉS de crear el Run.

export type OriginBatch = {
  runId: string;
  group: { rationale: string | null; impressions: number; clicks: number; categoryId?: string };
  titles: Array<{ text: string; rationale: string | null }>;
};

const BUDGET_MS = 4000;

export async function recordTitleOrigins(userId: string, batches: OriginBatch[]): Promise<void> {
  try {
    await Promise.race([
      (async () => {
        const data: Array<{
          userId: string; titleId: string; groupRationale: string | null; titleRationale: string | null; impressions: number; clicks: number;
        }> = [];
        for (const batch of batches) {
          const created = await prisma.title.findMany({ where: { runId: batch.runId }, select: { id: true, text: true } });
          const pool = [...created];
          for (const source of batch.titles) {
            const index = pool.findIndex((t) => t.text === source.text);
            if (index < 0) continue;
            const [match] = pool.splice(index, 1);
            data.push({
              userId,
              titleId: match.id,
              groupRationale: batch.group.rationale,
              titleRationale: source.rationale,
              impressions: batch.group.impressions,
              clicks: batch.group.clicks,
            });
          }
        }
        if (data.length > 0) await prisma.titleOrigin.createMany({ data, skipDuplicates: true });
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, BUDGET_MS)),
    ]);
  } catch (error) {
    console.warn("[historial-forense] no se pudo guardar el origen de los títulos (la publicación sigue igual):", error instanceof Error ? error.message : error);
  }
}
