import "dotenv/config";
import { createHash } from "node:crypto";
import { prisma } from "@auto-articulos/db";
import { decryptSecret, getConnectedAccount } from "@auto-articulos/shared";

// Diagnóstico de solo lectura (2/11/2026): errores «No active connection found
// for toolkit(s) 'instagram'» y «Falta un permiso en la red» en Redes aunque
// Conexiones muestre todo conectado. Compara el estado guardado contra el estado
// real en Composio. Repositorio público: NO imprime correos ni identificadores,
// solo estados y booleanos. No escribe nada.
const HASHES = (process.env.ACCOUNT_HASHES ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
const hashEmail = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);

export async function runSocialDiagnosis() {
  if (HASHES.length === 0) throw new Error("Falta ACCOUNT_HASHES.");
  const keySetting = await prisma.systemSetting.findUnique({ where: { key: "composio_api_key" } });
  const apiKey = keySetting ? decryptSecret(keySetting.encryptedValue) : null;
  console.log("API key de Composio legible:", Boolean(apiKey));
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const h of HASHES) {
    const u = users.find((x) => hashEmail(x.email) === h);
    console.log(`\n===== Huella ${h} =====`);
    if (!u) { console.log("No existe."); continue; }
    const rows = await prisma.composioConnection.findMany({
      where: { userId: u.id, app: { in: ["facebook", "instagram", "pinterest"] } },
      orderBy: { updatedAt: "desc" },
    });
    console.log("Filas guardadas:", rows.length);
    for (const r of rows) {
      let live = "sin consulta";
      let sameUser: boolean | string = "?";
      let toolkit: string | null = "?";
      if (apiKey) {
        try {
          const info = await getConnectedAccount(apiKey, r.connectedAccountId);
          live = info.status;
          sameUser = info.userId === u.id;
          toolkit = info.toolkitSlug;
        } catch (e) {
          live = `error: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`;
        }
      }
      console.log(`- ${r.app} | guardado=${r.status} | actualizado=${r.updatedAt.toISOString()} | activado=${r.activatedAt?.toISOString() ?? "nunca"} | Composio=${live} | toolkit=${toolkit} | mismo usuario=${sameUser} | pageId=${Boolean((r as any).pageId)} | igAccountId=${Boolean((r as any).igAccountId)}`);
    }
  }
}
