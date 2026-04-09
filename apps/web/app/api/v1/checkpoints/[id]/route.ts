import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkpointCreateSchema } from '@ckpt/shared';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id },
  });

  if (!checkpoint) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(checkpoint);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = checkpointCreateSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const current = await prisma.checkpoint.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Snapshot the current state before updating
  const versionCount = await prisma.checkpointVersion.count({
    where: { checkpointId: id },
  });

  await prisma.checkpointVersion.create({
    data: {
      checkpointId: id,
      version: versionCount + 1,
      snapshot: {
        task: current.task,
        author: current.author,
        repoUrl: current.repoUrl,
        handoffNote: current.handoffNote,
        openItems: current.openItems,
        constraints: current.constraints,
        deadEnds: current.deadEnds,
        steps: current.steps,
      },
    },
  });

  const checkpoint = await prisma.checkpoint.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(checkpoint);
}
