import {hubBackendFetch} from "../apps/web/src/lib/hub-credential-transport";
import { prisma } from "../packages/db/src/index";
import { syncUserToHub } from "../apps/web/src/lib/hub-sync";

async function main() {
  if(process.env.HUB_SYNC_VERIFY_ONLY==='true'){
    const r=await hubBackendFetch('/api/integrations/auto-articulos/user-sync',{local_user_id:'auth-verification-only',email:'invalid'});
    const d=await r.json();if(r.status!==400||d.error!=='local_user_id and a valid email are required')throw Error('Hub authentication verification failed');
    console.log('[HUB SYNC] authenticated; invalid payload rejected before data writes');return;
  }
  const emailFilter = process.env.HUB_SYNC_EMAIL?.trim().toLowerCase();
  const users = await prisma.user.findMany({
    where: emailFilter ? { email: emailFilter } : undefined,
    select: { id: true, email: true },
  });
  let synced = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const result=await syncUserToHub(user.id);
      if(!result)throw Error("Hub transport not configured");
      synced += 1;
      console.log(`[HUB SYNC] OK ${user.id}`);
    } catch (error) {
      failed += 1;
      console.error(`[HUB SYNC] ERROR ${user.id}`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log(`[HUB SYNC] finalizado: ${synced} sincronizados, ${failed} con error.`);
  if (failed > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
