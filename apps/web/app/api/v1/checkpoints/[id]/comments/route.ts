import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

const commentCreateSchema = z.object({
  body: z.string().min(1),
  stepId: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
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
}
