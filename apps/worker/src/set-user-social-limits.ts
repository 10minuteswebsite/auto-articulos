import "dotenv/config";
import { prisma } from "@auto-articulos/db";

// Cambio TEMPORAL y reversible del cupo diario por red de UN usuario (pedido de Milton, 23/10/2026,
// para probar las publicaciones pendientes de Vicente Sánchez). Nunca toca a otros usuarios.
//   MODE=raise   → imprime el valor original y sube a 2 las redes de PLATFORMS.
//   MODE=restore → vuelve exactamente a ORIGINAL_LIMITS (el JSON que imprimió "raise").
async function main() {
  const email = process.env.USER_EMAIL?.trim();
  const mode = process.env.MODE?.trim();
  if (!email || (mode !== "raise" && mode !== "restore")) throw new Error("Faltan USER_EMAIL y MODE (raise|restore).");
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, socialDailyLimits: true } });
  if (!user) throw new Error(`No existe el usuario ${email}.`);
  console.log(`ORIGINAL_LIMITS=${JSON.stringify(user.socialDailyLimits)}`);

  let next: Record<string, number>;
  if (mode === "raise") {
    const platforms = (process.env.PLATFORMS ?? "google-business,instagram-post,threads").split(",").map((p) => p.trim()).filter(Boolean);
    const current = user.socialDailyLimits && typeof user.socialDailyLimits === "object" && !Array.isArray(user.socialDailyLimits)
      ? (user.socialDailyLimits as Record<string, number>)
      : {};
    next = { ...current };
    for (const platform of platforms) next[platform] = Math.max(2, current[platform] ?? 1);
  } else {
    const parsed = JSON.parse(process.env.ORIGINAL_LIMITS ?? "");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("ORIGINAL_LIMITS no es un objeto JSON.");
    next = parsed as Record<string, number>;
  }
  await prisma.user.update({ where: { id: user.id }, data: { socialDailyLimits: next } });
  console.log(`NUEVO_LIMITS=${JSON.stringify(next)}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
