import { prisma } from "@auto-articulos/db";

/**
 * Registro manual del lote "asistente proactivo" del MCP (30/9/2026), mismo
 * patrón sin IA que `add-product-update-20260930-mcp.ts` — se corre con
 * `scripts/run-product-update-script.yml` (workflow_dispatch), que ya tiene
 * las credenciales reales de producción como secreto de GitHub Actions.
 */
const updates = [
  {
    id: "update-20260930-mcp-asistente-proactivo",
    date: "2026-09-30",
    title: "El asistente de IA ahora guía con menú numerado, como el panel web",
    category: "arreglos",
    summary:
      "Al conectarse por primera vez, el asistente de IA ya no espera una pregunta abierta: saluda y ofrece el mismo menú numerado del Inicio (Contenido propio / Contenido generado por IA / Redes y blogs). Si no sabe cómo guiarte, ahora puede leer el manual real de la plataforma para no inventar respuestas. También se corrigió un error real: en cuentas con varias secciones (paneles), generar oportunidades por IA podía fallar diciendo 'sincroniza tus categorías' aunque ya estuvieran sincronizadas.",
    example:
      "Conecta tu asistente desde Configuración → Asistentes IA y pídele, por ejemplo, 'quiero publicar contenido' — te va a ofrecer las opciones numeradas en vez de preguntarte qué quieres hacer.",
    modulePath: "/dashboard/configuracion/mcp",
  },
] as const;

async function main() {
  for (const update of updates) {
    await prisma.productUpdate.upsert({
      where: { id: update.id },
      update: {
        date: new Date(update.date + "T00:00:00.000Z"),
        title: update.title,
        category: update.category,
        summary: update.summary,
        example: update.example,
        modulePath: update.modulePath,
      },
      create: {
        id: update.id,
        date: new Date(update.date + "T00:00:00.000Z"),
        title: update.title,
        category: update.category,
        summary: update.summary,
        example: update.example,
        modulePath: update.modulePath,
      },
    });
  }
  console.log("ProductUpdate: " + updates.length + " entradas sincronizadas.");
}

main().finally(() => prisma.$disconnect());
