import { prisma } from "@auto-articulos/db";

/** Promesa mínima del botón 2 (CONTENIDO GENERADO POR IA): al menos estos títulos por análisis. Más es un extra. */
export const MIN_TITLES_PROMISE = 3;

type Diagnostico = Record<string, unknown> | undefined;
const num = (diag: Diagnostico, key: string) => (typeof diag?.[key] === "number" ? (diag[key] as number) : 0);

/**
 * Texto en español claro de por qué un análisis dejó menos de la promesa. `admin` lleva los números para el administrador; `usuario`
 * es el aviso sencillo para la persona (sin códigos ni nombres técnicos).
 */
export function buildRedFlag(total: number, diag: Diagnostico): { admin: string; usuario: string } {
  const propuestas = num(diag, "modelProposedTitles");
  const repetidos = num(diag, "rejectedDuplicateOfExisting") + num(diag, "rejectedDuplicateOfThisRun");
  const excluidos = num(diag, "rejectedExcludedTopic");
  const sinCita = num(diag, "rejectedNoQuotedEvidence");
  const sinUbicacion = num(diag, "rejectedGeoComboNotUsed");
  const sinCategoria = num(diag, "rejectedCategoryMismatch");
  const colision = num(diag, "rejectedCollision") + num(diag, "rejectedCollisionByReasoning");
  const admin =
    `Quedaron ${total} de ${MIN_TITLES_PROMISE} títulos prometidos. De ${propuestas} propuestas de la IA: ${repetidos} repetían lo ya publicado, ` +
    `${excluidos} chocaban con los temas excluidos de la cuenta, ${sinCita} no citaban su consulta, ${sinUbicacion} no usaban las ubicaciones declaradas, ` +
    `${colision} chocaban con otra propuesta y ${sinCategoria} no tenían categoría real. Filas de evidencia leídas: ${num(diag, "filasDeEvidencia")}.`;
  const quedaron = total === 0 ? "Hoy no encontramos ideas nuevas." : total === 1 ? "Hoy encontramos 1 idea nueva." : `Hoy encontramos ${total} ideas nuevas.`;
  const causa = excluidos > repetidos
    ? "Muchas ideas posibles coinciden con los temas que pediste no publicar. Puedes revisar tus temas excluidos."
    : "Tu sitio ya cubre casi todos los temas que la gente busca. Puedes ampliar los temas de tu negocio o volver a analizar cuando haya datos nuevos.";
  return { admin, usuario: `${quedaron} ${causa}` };
}

/** Bandera roja: queda en los reportes de la guardia (panel del administrador). Nunca bloquea ni falla el análisis. */
export async function recordRedFlag(userId: string, siteDomain: string, total: number, diag: Diagnostico): Promise<{ usuario: string }> {
  const flag = buildRedFlag(total, diag);
  await prisma.titleGuardReport
    .create({
      data: {
        userId,
        requestId: null,
        categoryId: null,
        categoryName: "Bandera roja · Módulo 2",
        siteDomain,
        mode: "bandera",
        candidates: num(diag, "modelProposedTitles"),
        legacyTitles: [],
        deliveredTitles: [],
        details: { modulo: 2, banderaRoja: true, titulosEntregados: total, promesa: MIN_TITLES_PROMISE, motivo: flag.admin, contadores: diag ? JSON.parse(JSON.stringify(diag)) : null },
      },
    })
    .catch((error) => console.warn("[bandera-roja] no se pudo registrar:", error instanceof Error ? error.message : error));
  return { usuario: flag.usuario };
}
