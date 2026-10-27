import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import {
  composioListSearchConsoleSites,
  composioQuerySearchAnalytics,
  decryptSecret,
} from "@auto-articulos/shared";

// Diagnóstico de solo lectura (27/10/2026): usuarios que ven "No hay evidencia
// disponible en GSC, Google Analytics o Bing Webmaster Tools." en Oportunidades,
// y todos van por Composio. Repite la ventana de fechas de
// apps/web/src/app/api/opportunities/route.ts y mide qué devuelve cada vista.
//
// El repositorio es público y los registros de Actions también: este script NO
// imprime correos, apellidos, dominios ni URLs. Solo números, booleanos y el
// nombre de pila. No escribe nada en la base de datos.
const NUMBERS = (process.env.ACCOUNT_NUMBERS ?? "")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((n) => Number.isInteger(n) && n > 0);

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function rootOf(value: string) {
  return value
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function kindOf(siteUrl: string) {
  if (siteUrl.startsWith("sc-domain:")) return "sc-domain";
  if (siteUrl.startsWith("https://www.")) return "https-www";
  if (siteUrl.startsWith("https://")) return "https";
  if (siteUrl.startsWith("http://")) return "http";
  return "otro";
}

function safeError(err: unknown, hide: string[]) {
  let msg = err instanceof Error ? err.message : String(err);
  for (const h of hide.filter(Boolean)) msg = msg.split(h).join("<sitio>");
  return msg.slice(0, 160);
}

async function main() {
  if (NUMBERS.length === 0) throw new Error("Falta ACCOUNT_NUMBERS (ej. 102,529).");

  // Misma regla que /api/admin/users: numeroCuenta = puesto por antigüedad.
  const all = await prisma.user.findMany({
    select: { id: true, firstName: true, name: true, selectedSiteDomain: true, selectedSitePanel: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Usuarios totales: ${all.length}`);

  const keySetting = await prisma.systemSetting.findUnique({ where: { key: "composio_api_key" } });
  let apiKey: string | null = null;
  try {
    apiKey = keySetting ? decryptSecret(keySetting.encryptedValue) : null;
  } catch {
    apiKey = null;
  }
  console.log("API key de Composio legible:", Boolean(apiKey));

  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const currentStart = new Date(end);
  currentStart.setUTCDate(currentStart.getUTCDate() - 44);
  const previousEnd = new Date(currentStart);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - 44);
  console.log(`Ventana actual: ${isoDate(currentStart)} a ${isoDate(end)} | previa: ${isoDate(previousStart)} a ${isoDate(previousEnd)}`);

  for (const n of NUMBERS) {
    const u = all[n - 1];
    console.log(`\n===== Cuenta #${n} =====`);
    if (!u) {
      console.log("No existe esa posición.");
      continue;
    }
    const first = (u.firstName || u.name || "").split(/\s+/)[0] ?? "";
    console.log("Nombre de pila:", first);
    const domain = u.selectedSiteDomain ?? "";
    console.log("Sitio seleccionado:", Boolean(domain), "| panel:", u.selectedSitePanel ? "sí" : "(vacío)");

    const [own, ga4, bing, conns, cache] = await Promise.all([
      prisma.searchIntegration.findFirst({ where: { userId: u.id, provider: "google", ...(domain ? { siteDomain: domain } : {}) }, select: { id: true } }),
      prisma.searchIntegration.findFirst({ where: { userId: u.id, provider: "google-analytics", ...(domain ? { siteDomain: domain } : {}) }, select: { siteUrl: true } }),
      prisma.searchIntegration.findFirst({ where: { userId: u.id, provider: "bing", ...(domain ? { siteDomain: domain } : {}) }, select: { siteUrl: true } }),
      prisma.composioConnection.findMany({
        where: { userId: u.id, app: "google_search_console" },
        orderBy: { updatedAt: "desc" },
        select: { status: true, connectedAccountId: true, siteDomain: true, siteUrl: true, updatedAt: true },
      }),
      prisma.opportunityEvidenceCache.findMany({
        where: { userId: u.id },
        select: { source: true, status: true, expiresAt: true, fetchedAt: true, payload: true },
      }),
    ]);
    console.log("Conexión propia de GSC:", Boolean(own));
    console.log("GA4 propio:", Boolean(ga4?.siteUrl), "| Bing propio:", Boolean(bing?.siteUrl));
    console.log(`Conexiones Composio de GSC (todas): ${conns.length}`);
    conns.forEach((c, i) =>
      console.log(`  #${i + 1} estado=${c.status} siteUrl=${c.siteUrl ? kindOf(c.siteUrl) : "VACÍO"} coincideConSitioSeleccionado=${c.siteDomain === domain} actualizada=${isoDate(c.updatedAt)}`),
    );
    for (const c of cache) {
      const p = c.payload as { currentRows?: unknown[]; previousRows?: unknown[]; rows?: unknown[] } | null;
      console.log(`Caché ${c.source}: estado=${c.status} vencida=${c.expiresAt <= new Date()} obtenida=${isoDate(c.fetchedAt)} filasActuales=${p?.currentRows?.length ?? p?.rows?.length ?? 0} filasPrevias=${p?.previousRows?.length ?? 0}`);
    }
    if (cache.length === 0) console.log("Caché: ninguna (nunca hubo una consulta buena guardada)");

    const conn = conns.find((c) => c.siteDomain === domain && c.status === "ACTIVE") ?? conns.find((c) => c.status === "ACTIVE");
    if (!apiKey || !conn?.siteUrl) {
      console.log("No se puede consultar: falta API key o conexión Composio activa con sitio.");
      continue;
    }
    const account = { apiKey, userId: u.id, connectedAccountId: conn.connectedAccountId };
    const hide = [conn.siteUrl, rootOf(conn.siteUrl), domain];

    // 1) ¿La propiedad elegida está en la lista de la cuenta conectada?
    let sites: Array<{ siteUrl: string; permissionLevel: string }> = [];
    try {
      sites = await composioListSearchConsoleSites(account);
      const chosen = sites.find((s) => s.siteUrl === conn.siteUrl);
      console.log(`Propiedades visibles en la cuenta: ${sites.length} | la elegida está en la lista: ${Boolean(chosen)} | permiso: ${chosen?.permissionLevel ?? "n/a"}`);
      const same = sites.filter((s) => rootOf(s.siteUrl) === rootOf(conn.siteUrl!));
      console.log(`Propiedades del mismo dominio: ${same.length} -> tipos: ${same.map((s) => kindOf(s.siteUrl)).join(", ") || "ninguna"}`);
    } catch (err) {
      console.log("Listar propiedades FALLÓ:", safeError(err, hide));
    }

    // 2) Filas por vista (misma ventana que la ruta), propiedad elegida.
    const probe = async (label: string, site: string, start: Date, finish: Date, dims?: string[]) => {
      try {
        const rows = await composioQuerySearchAnalytics(account, site, isoDate(start), isoDate(finish), dims);
        const impressions = rows.reduce((t, r) => t + (r.impressions ?? 0), 0);
        console.log(`  ${label}: filas=${rows.length} impresiones=${impressions}`);
        return rows.length;
      } catch (err) {
        console.log(`  ${label}: ERROR ${safeError(err, hide)}`);
        return -1;
      }
    };
    console.log("Propiedad ELEGIDA, ventana actual:");
    await probe("consulta+página (lo que usa la ruta hoy)", conn.siteUrl, currentStart, end);
    await probe("página", conn.siteUrl, currentStart, end, ["page"]);
    await probe("consulta", conn.siteUrl, currentStart, end, ["query"]);
    await probe("dispositivo", conn.siteUrl, currentStart, end, ["device"]);
    await probe("apariencia", conn.siteUrl, currentStart, end, ["searchAppearance"]);
    await probe("país", conn.siteUrl, currentStart, end, ["country"]);
    console.log("Propiedad ELEGIDA, ventana previa:");
    await probe("consulta+página", conn.siteUrl, previousStart, previousEnd);
    await probe("página", conn.siteUrl, previousStart, previousEnd, ["page"]);

    // 3) Otras propiedades del mismo dominio: ¿ahí sí están los datos?
    const others = sites.filter((s) => s.siteUrl !== conn.siteUrl && rootOf(s.siteUrl) === rootOf(conn.siteUrl!)).slice(0, 4);
    for (const s of others) {
      console.log(`Otra propiedad del mismo dominio (${kindOf(s.siteUrl)}, ${s.permissionLevel}), ventana actual:`);
      await probe("página", s.siteUrl, currentStart, end, ["page"]);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
