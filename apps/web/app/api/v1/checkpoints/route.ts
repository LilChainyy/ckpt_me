import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkpointCreateSchema } from '@ckpt/shared';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get('repo');
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50'), 1), 500);

  const where: Record<string, unknown> = {};
  if (repo) where.repoUrl = { contains: repo };

  const checkpoints = await prisma.checkpoint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ checkpoints, count: checkpoints.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = checkpointCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const checkpoint = await prisma.checkpoint.create({
    data: {
      task: parsed.data.task,
      author: parsed.data.author,
      repoUrl: parsed.data.repoUrl,
      handoffNote: parsed.data.handoffNote ?? '',
      openItems: parsed.data.openItems ?? [],
      constraints: parsed.data.constraints ?? [],
      deadEnds: parsed.data.deadEnds ?? [],
      steps: parsed.data.steps ?? [],
    },
  });

  return NextResponse.json(checkpoint, { status: 201 });
}
