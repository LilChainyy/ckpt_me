import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { apiLimiter } from '@/lib/rate-limit';
import { withRateLimit } from '@/lib/with-rate-limit';

const commentCreateSchema = z.object({
  body: z.string().min(1),
  stepId: z.string().optional(),
});

async function handleGET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const comments = await prisma.comment.findMany({
      where: { checkpointId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { name: true, image: true },
        },
      },
    });

    const result = comments.map((comment: any) => ({
      id: comment.id,
      checkpointId: comment.checkpointId,
      stepId: comment.stepId,
      userId: comment.userId,
      userName: comment.user.name,
      userImage: comment.user.image,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    }));

    return NextResponse.json({ comments: result, count: result.length });
  } catch (error) {
    logger.error('Internal server error', { route: 'GET /api/v1/checkpoints/[id]/comments', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const parsed = commentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const checkpoint = await prisma.checkpoint.findUnique({ where: { id } });
    if (!checkpoint) {
      return NextResponse.json({ error: 'checkpoint not found' }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        checkpointId: id,
        userId: session.user.id,
        body: parsed.data.body,
        stepId: parsed.data.stepId,
      },
      include: {
        user: {
          select: { name: true, image: true },
        },
      },
    });

    return NextResponse.json(
      {
        id: comment.id,
        checkpointId: comment.checkpointId,
        stepId: comment.stepId,
        userId: comment.userId,
        userName: comment.user.name,
        userImage: comment.user.image,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Internal server error', { route: 'POST /api/v1/checkpoints/[id]/comments', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(apiLimiter, handleGET);
export const POST = withRateLimit(apiLimiter, handlePOST);
