import { NextRequest, NextResponse } from 'next/server';
import { protocolEventSchema } from '@ckpt/shared';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = protocolEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = parsed.data;

  if (event.type === 'reasoning') {
    const metadata = (event.metadata ?? {}) as Prisma.InputJsonValue;
    const files = event.files as Prisma.InputJsonValue;

    // commitHash is indexed but not unique, so use find-then-create/update
    const existing = await prisma.reasoning.findFirst({
      where: { commitHash: event.commitHash },
    });

    let record;
    if (existing) {
      record = await prisma.reasoning.update({
        where: { id: existing.id },
        data: {
          reasoning: event.reasoning,
          author: event.author,
          files,
          parentHash: event.parentHash,
          metadata,
          repoUrl: event.repoUrl,
        },
      });
    } else {
      record = await prisma.reasoning.create({
        data: {
          commitHash: event.commitHash,
          reasoning: event.reasoning,
          author: event.author,
          files,
          parentHash: event.parentHash,
          metadata,
          repoUrl: event.repoUrl,
          timestamp: new Date(event.timestamp),
        },
      });
    }

    return NextResponse.json({ id: record.id, type: 'reasoning' }, { status: 201 });
  }

  // type === 'checkpoint'
  const checkpoint = await prisma.checkpoint.create({
    data: {
      task: event.task,
      author: event.author,
      repoUrl: event.repoUrl,
      handoffNote: event.handoffNote ?? '',
      openItems: (event.openItems ?? []) as Prisma.InputJsonValue,
      constraints: (event.constraints ?? []) as Prisma.InputJsonValue,
      deadEnds: (event.deadEnds ?? []) as Prisma.InputJsonValue,
      steps: (event.steps ?? []) as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ id: checkpoint.id, type: 'checkpoint' }, { status: 201 });
}
