import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { syncLimiter } from '@/lib/rate-limit';
import { withRateLimit } from '@/lib/with-rate-limit';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get('repo');
    const author = searchParams.get('author');
    const since = searchParams.get('since');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50'), 1), 500);

    const where: Record<string, unknown> = {};
    if (repo) where.repoUrl = { contains: repo };
    if (author) where.author = { contains: author };
    if (since) where.timestamp = { gte: new Date(since) };

    const records = await prisma.reasoning.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json({ records, count: records.length });
  } catch (error) {
    logger.error('Internal server error', { route: 'GET /api/v1/reasoning', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(syncLimiter, handleGET);
