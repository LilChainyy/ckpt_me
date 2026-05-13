import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkpointCreateSchema } from '@ckpt/shared';
import { apiLimiter } from '@/lib/rate-limit';
import { withRateLimit } from '@/lib/with-rate-limit';

async function handleGET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id },
    });

    if (!checkpoint) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json(checkpoint);
  } catch (error) {
    logger.error('Internal server error', { route: 'GET /api/v1/checkpoints/[id]', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  try {
    const { id } = await params;
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
  } catch (error) {
    logger.error('Internal server error', { route: 'PUT /api/v1/checkpoints/[id]', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(apiLimiter, handleGET);
export const PUT = withRateLimit(apiLimiter, handlePUT);
