import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ commitHash: string }> }
) {
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
}
