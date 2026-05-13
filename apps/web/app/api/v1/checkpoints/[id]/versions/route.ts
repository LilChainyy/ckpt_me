import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { apiLimiter } from '@/lib/rate-limit';
import { withRateLimit } from '@/lib/with-rate-limit';

async function handleGET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const versions = await prisma.checkpointVersion.findMany({
      where: { checkpointId: id },
      orderBy: { version: 'desc' },
    });

    return NextResponse.json({ versions, count: versions.length });
  } catch (error) {
    logger.error('Internal server error', { route: 'GET /api/v1/checkpoints/[id]/versions', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(apiLimiter, handleGET);
