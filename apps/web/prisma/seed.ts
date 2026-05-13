import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
    console.error(
      'Seed aborted: DATABASE_URL does not point to localhost. ' +
      'Set DATABASE_URL to a local database before seeding.'
    );
    process.exit(1);
  }

  console.log('Seeding local database...');

  const reasoning = await prisma.reasoning.upsert({
    where: { id: 'seed-reasoning-001' },
    update: {},
    create: {
      id: 'seed-reasoning-001',
      commitHash: 'abc1234def5678900000000000000000feedface',
      reasoning:
        'Refactored the sync endpoint to batch upserts instead of sequential writes. ' +
        'This avoids N+1 round-trips to the database on large payloads.',
      author: 'seed-dev',
      timestamp: new Date('2025-01-15T10:30:00Z'),
      files: JSON.parse('["apps/web/app/api/v1/reasoning/sync/route.ts"]'),
      metadata: JSON.parse('{"source":"seed","agent":{"tool":"manual"}}'),
      repoUrl: 'https://github.com/example/ckpt',
    },
  });
  console.log(`  Reasoning: ${reasoning.id}`);

  const checkpoint = await prisma.checkpoint.upsert({
    where: { id: 'seed-checkpoint-001' },
    update: {},
    create: {
      id: 'seed-checkpoint-001',
      task: 'Implement reasoning sync endpoint',
      author: 'seed-dev',
      repoUrl: 'https://github.com/example/ckpt',
      handoffNote:
        'Sync endpoint is working end-to-end. Next step is adding rate limiting.',
      constraints: JSON.parse(
        '[{"label":"No breaking API changes","reason":"MCP clients already depend on the current request shape"}]'
      ),
      deadEnds: JSON.parse(
        '[{"title":"Bulk INSERT with ON CONFLICT","attempt":"Tried raw SQL bulk insert","outcome":"Prisma does not support RETURNING with raw executeMany, fell back to individual upserts"}]'
      ),
      openItems: JSON.parse('[]'),
      steps: JSON.parse('[]'),
    },
  });
  console.log(`  Checkpoint: ${checkpoint.id}`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
