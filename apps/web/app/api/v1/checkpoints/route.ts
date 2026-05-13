import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkpointCreateSchema } from '@ckpt/shared';
import { apiLimiter } from '@/lib/rate-limit';
import { withRateLimit } from '@/lib/with-rate-limit';

async function handleGET(request: NextRequest) {
  try {
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
  } catch (error) {
    logger.error('Internal server error', { route: 'GET /api/v1/checkpoints', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  try {
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
  } catch (error) {
    logger.error('Internal server error', { route: 'POST /api/v1/checkpoints', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(apiLimiter, handleGET);
export const POST = withRateLimit(apiLimiter, handlePOST);
