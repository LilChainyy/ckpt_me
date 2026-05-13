import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  let dbOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (error) {
    logger.error('Health check: database ping failed', { error: String(error) });
  }

  const status = dbOk ? 'ok' : 'degraded';
  const code = dbOk ? 200 : 503;

  return NextResponse.json(
    { status, timestamp, version: '0.1.0', uptime, database: dbOk ? 'connected' : 'unreachable' },
    { status: code },
  );
}
