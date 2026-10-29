import { prisma } from "@auto-articulos/db";
import { buildConnectionState, methodFor, resolveConnection } from "@auto-articulos/shared";

// Censo de solo lectura (29/10/2026) para el caso "No hay evidencia disponible"
// en Oportunidades: cuenta cuántos usuarios tienen conexión propia de Search
// Console, conexión de Composio, ambas o ninguna, y qué fuente elige HOY el
// resolvedor (misma lógica que apps/web/src/lib/composio-search-console-consumer.ts).
// El repositorio es público: solo se imprimen conteos y números de cuenta
// (posición por antigüedad, igual que Administración). Nada de correos,
// nombres ni dominios. No escribe en la base de datos.
export async function runCensus() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, disabledModules: true, selectedSiteDomain: true },
    orderBy: { createdAt: "asc" },
  });
  const [owns, composios] = await Promise.all([
    prisma.searchIntegration.findMany({
      where: { provider: "google" },
      select: { userId: true, siteDomain: true, siteUrl: true, lastAccessError: true },
    }),
    prisma.composioConnection.findMany({
      where: { app: "google_search_console" },
      orderBy: { updatedAt: "desc" },
      select: { userId: true, status: true, connectedAccountId: true, siteDomain: true, siteUrl: true },
    }),
  ]);

  const tally = {
    total: users.length,
    ownOnly: 0,
    composioOnly: 0,
    both: 0,
    none: 0,
    bothWithOwnError: 0,
    composioUsable: 0,
    sourceNONE: 0,
    sourceOWN: 0,
    sourceCOMPOSIO: 0,
  };
  const noEvidenceNow: number[] = [];
  const bothNow: number[] = [];

  users.forEach((u, i) => {
    const domain = u.selectedSiteDomain ?? "";
    const own = owns.find((o) => o.userId === u.id && (!domain || o.siteDomain === domain));
    const comp = composios.find((c) => c.userId === u.id && (!domain || c.siteDomain === domain || c.siteDomain === ""));
    const compUsable = Boolean(comp && comp.status === "ACTIVE" && comp.siteUrl);
    if (compUsable) tally.composioUsable += 1;
    if (own && comp) tally.both += 1;
    else if (own) tally.ownOnly += 1;
    else if (comp) tally.composioOnly += 1;
    else tally.none += 1;
    if (own && comp && own.lastAccessError) tally.bothWithOwnError += 1;

    let moduleEnabled = u.role === "admin";
    if (!moduleEnabled) {
      try { moduleEnabled = JSON.parse(u.disabledModules ?? "{}")?.["conexion-composio"] === "enabled"; } catch { moduleEnabled = false; }
    }
    const state = buildConnectionState({ own: own ? { id: "x" } : null, composio: comp ?? null });
    const method = methodFor({ app: "google_search_console", userId: u.id, userEmail: u.email, moduleEnabled, routeIsComposio: false });
    const source = resolveConnection({ method, hasOwn: state.hasOwn, composio: state.composio }).source;
    if (source === "NONE") tally.sourceNONE += 1;
    if (source === "OWN") tally.sourceOWN += 1;
    if (source === "COMPOSIO") tally.sourceCOMPOSIO += 1;
    // Quienes hoy verían «No hay evidencia» aunque tienen Composio utilizable.
    if (source === "NONE" && compUsable) noEvidenceNow.push(i + 1);
    // Quienes tienen las dos y hoy gana la propia.
    if (own && compUsable && source === "OWN") bothNow.push(i + 1);
  });

  console.log(JSON.stringify(tally, null, 2));
  console.log("Cuentas (números de Administración) con Composio utilizable pero fuente=NONE:", noEvidenceNow.join(", ") || "ninguna");
  console.log("Cuentas con propia + Composio utilizable donde gana la propia:", bothNow.join(", ") || "ninguna");
  await prisma.$disconnect();
}
