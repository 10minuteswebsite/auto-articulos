import { prisma } from "@auto-articulos/db";

/**
 * Registro manual de los cambios de MCP (asistentes de IA) del 29-30/9/2026.
 * El generador automático (`scripts/generate-product-update.ts`, corre por
 * git hook) necesita OPENAI_API_KEY y DATABASE_URL reales en el entorno
 * donde se ejecuta el commit; estos cambios se hicieron en worktrees
 * aislados sin esas credenciales a propósito (protocolo de seguridad), así
 * que quedaron sin registrar automáticamente. Mismo patrón manual que
 * `add-product-update-20260922-interface.ts`: idempotente, se puede correr
 * de nuevo sin duplicar.
 *
 * Correr con las credenciales reales de producción:
 *   npx tsx scripts/add-product-update-20260930-mcp.ts
 */
const updates = [
  {
    id: "update-20260929-mcp-asistentes-ia",
    date: "2026-09-29",
    title: "Conecta cualquier asistente de IA a tu cuenta",
    category: "nuevas-herramientas",
    summary:
      "Nueva sección Configuración → Asistentes IA: genera un token personal para conectar Claude, ChatGPT, Meta MUSE o cualquier otro asistente directamente a tu cuenta de SEO Total. El asistente puede consultar tus oportunidades, tu estado de publicaciones, tu configuración y tus límites, y publicar artículos por ti — siempre mostrándote antes qué va a hacer y pidiéndote confirmación explícita antes de publicar algo real.",
    example:
      "Entra a Configuración → Asistentes IA, pulsa Generar token, copia el prompt que aparece y pégalo como instrucciones de tu asistente. Luego pídele, por ejemplo, 'muéstrame mis oportunidades pendientes'.",
    modulePath: "/dashboard/configuracion/mcp",
  },
  {
    id: "update-20260930-mcp-titulos-ia-y-enlace",
    date: "2026-09-30",
    title: "El asistente de IA ya puede crear títulos y darte el enlace publicado",
    category: "nuevas-herramientas",
    summary:
      "El asistente conectado por MCP ahora puede usar 'Crear con la IA del sistema' (las mismas preguntas guiadas de Publicar: cliente tipo, tema, qué busca el cliente) para proponer hasta 9 títulos nuevos, y al consultar el estado de tus publicaciones te devuelve el enlace real de cada artículo que ya quedó publicado.",
    example:
      "Pídele a tu asistente 'créame títulos sobre seguros de auto para familias jóvenes' y después 'dame el enlace del último artículo que publicaste'.",
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
