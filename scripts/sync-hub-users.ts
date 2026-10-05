import { prisma } from "../packages/db/src/index";
import { syncUserToHub } from "../apps/web/src/lib/hub-sync";

async function main() {
  const emailFilter = process.env.HUB_SYNC_EMAIL?.trim().toLowerCase();
  const users = await prisma.user.findMany({
    where: emailFilter ? { email: emailFilter } : undefined,
    select: { id: true, email: true },
  });
  let synced = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await syncUserToHub(user.id);
      synced += 1;
      console.log(`[HUB SYNC] OK ${user.email}`);
    } catch (error) {
      failed += 1;
      console.error(`[HUB SYNC] ERROR ${user.email}`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log(`[HUB SYNC] finalizado: ${synced} sincronizados, ${failed} con error.`);
  if (failed > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
