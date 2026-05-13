import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { syncLimiter } from '@/lib/rate-limit';
import { withRateLimit } from '@/lib/with-rate-limit';

async function handleGET(
  _request: NextRequest,
  { params }: { params: Promise<{ commitHash: string }> }
) {
  try {
    const { commitHash } = await params;

    const record = await prisma.reasoning.findFirst({
      where: { commitHash },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'not found', commitHash },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    logger.error('Internal server error', { route: 'GET /api/v1/reasoning/[commitHash]', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(syncLimiter, handleGET);
