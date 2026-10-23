import "dotenv/config";
import { prisma } from "@auto-articulos/db";
import sharp from "sharp";

// Diagnóstico de solo lectura de las publicaciones de Google Business de un usuario: texto enviado,
// imagen (con tamaño real) y respuesta completa de PostPeer. Variable: USER_EMAIL.
async function main() {
  const email = process.env.USER_EMAIL?.trim();
  if (!email) throw new Error("Falta USER_EMAIL.");
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error(`No existe el usuario ${email}.`);
  const posts = await prisma.businessProfilePost.findMany({
    where: { title: { run: { userId: user.id } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  for (const post of posts) {
    console.log("\n=== BusinessProfilePost", post.id, "status:", post.status, "creado:", post.createdAt.toISOString());
    console.log("summary (", post.summary?.length ?? 0, "caracteres):", JSON.stringify(post.summary));
    console.log("imageUrl:", post.imageUrl);
    console.log("googleResponse:", (post.googleResponse ?? "").slice(0, 1500));
    if (post.imageUrl) {
      try {
        const res = await fetch(post.imageUrl);
        const buf = Buffer.from(await res.arrayBuffer());
        const meta = await sharp(buf).metadata();
        console.log(`imagen: HTTP ${res.status} ${res.headers.get("content-type")} ${buf.length} bytes ${meta.width}x${meta.height} formato=${meta.format}`);
      } catch (e) {
        console.log("imagen: no se pudo leer —", e instanceof Error ? e.message : e);
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
