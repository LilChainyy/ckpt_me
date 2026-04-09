import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
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
}
