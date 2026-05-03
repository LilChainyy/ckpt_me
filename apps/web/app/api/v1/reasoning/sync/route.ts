import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncRequestSchema } from '@ckpt/shared';

export async function POST(request: NextRequest) {
  const body = await request.json();
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
}
