import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { syncRequestSchema } from '@ckpt/shared';
import { syncLimiter } from '@/lib/rate-limit';
import { withRateLimit } from '@/lib/with-rate-limit';

async function handlePOST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  try {
    const parsed = syncRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const syncedIds: string[] = [];

    for (const record of parsed.data.records) {
      const metadata = (record.metadata ?? {}) as any;
      const files = (record.files ?? []) as any;

      await prisma.reasoning.upsert({
        where: { id: record.id },
        create: {
          id: record.id,
          commitHash: record.commitHash ?? '',
          reasoning: record.reasoning,
          author: record.author,
          timestamp: record.timestamp ? new Date(record.timestamp) : new Date(),
          files,
          parentHash: record.parentHash,
          metadata,
          repoUrl: record.repoUrl,
        },
        update: {
          reasoning: record.reasoning,
          author: record.author,
          files,
          parentHash: record.parentHash,
          metadata,
          repoUrl: record.repoUrl,
        },
      });
      syncedIds.push(record.id);
    }

    return NextResponse.json({ syncedIds, count: syncedIds.length });
  } catch (error) {
    logger.error('Internal server error', { route: 'POST /api/v1/reasoning/sync', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

export const POST = withRateLimit(syncLimiter, handlePOST);
