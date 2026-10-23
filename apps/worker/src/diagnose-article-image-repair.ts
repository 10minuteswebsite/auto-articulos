import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";
import { inspectArticleForImageRepair } from "./automation/10minutesWebsite";

// Diagnóstico de solo lectura de la pantalla de edición de un artículo (ver
// inspectArticleForImageRepair). Usa USER_EMAIL y ARTICLE_TITLE; vuelca a diag-out/.
async function main() {
  const email = process.env.USER_EMAIL?.trim();
  const title = process.env.ARTICLE_TITLE?.trim();
  if (!email || !title) throw new Error("Faltan USER_EMAIL y ARTICLE_TITLE.");
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, platformDomain: true } });
  if (!user) throw new Error(`No existe el usuario ${email}.`);
  const credential = await prisma.credential.findUnique({
    where: { userId_platform: { userId: user.id, platform: "10minutesWebsite" } },
  });
  if (!credential) throw new Error("El usuario no tiene credencial de la plataforma.");
  await inspectArticleForImageRepair(
    {
      username: decryptSecret(credential.encryptedUsername),
      password: decryptSecret(credential.encryptedPassword),
      platformDomain: user.platformDomain,
    },
    title,
    "diag-out",
    async (m) => console.log(m),
  );
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
