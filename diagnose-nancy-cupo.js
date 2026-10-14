#!/usr/bin/env node
// Solo lectura. Uso: DATABASE_URL=... node diagnose-nancy-cupo.js
const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { OR: [{ name: { contains: 'Nancy', mode: 'insensitive' } }, { firstName: { contains: 'Nancy', mode: 'insensitive' } }] },
      select: { id: true, email: true, name: true, lastName: true, dailyArticleLimit: true, monthlyArticleLimit: true, maxTitlesPerBatch: true, platformDomain: true },
    });
    const nancy = users.filter(u => /cruz/i.test(`${u.name} ${u.lastName}`));
    console.log('Coincidencias:', JSON.stringify(nancy.length ? nancy : users, null, 2));
    const now = new Date();
    const utc0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    console.log('Ahora UTC:', now.toISOString(), '| medianoche UTC:', utc0.toISOString());
    for (const u of (nancy.length ? nancy : users)) {
      const titles = await prisma.title.findMany({
        where: { run: { userId: u.id }, status: 'success', processedAt: { gte: new Date(now.getTime() - 3 * 864e5) } },
        select: { processedAt: true, run: { select: { id: true } } },
        orderBy: { processedAt: 'desc' },
      });
      console.log(`\n${u.email}: success últimos 3 días = ${titles.length}`);
      titles.forEach(t => console.log(' ', t.processedAt.toISOString(), 'run', t.run.id, t.processedAt >= utc0 ? '<- cuenta como HOY (UTC)' : ''));
    }
  } finally { await prisma.$disconnect(); }
})();
