import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const versions = await prisma.checkpointVersion.findMany({
    where: { checkpointId: id },
    orderBy: { version: 'desc' },
  });

  return NextResponse.json({ versions, count: versions.length });
}
