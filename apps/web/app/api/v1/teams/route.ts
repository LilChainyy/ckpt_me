import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';

/**
 * GET /api/v1/teams
 *
 * Returns all teams the authenticated user belongs to, including member and
 * repo details. Returns 401 if the request is unauthenticated.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const teams = await prisma.team.findMany({
      where: { members: { some: { userId: session.user.id } } },
      include: { members: true, repos: true },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    logger.error('Internal server error', { route: 'GET /api/v1/teams', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/teams
 *
 * Creates a new team. The authenticated user is added as the owner.
 *
 * Request body: { name: string, slug: string }
 * Returns 201 with the created team on success.
 * Returns 400 if name or slug is missing.
 * Returns 401 if the request is unauthenticated.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { name?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  try {
    const { name, slug } = body;
    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug required' }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        name,
        slug,
        members: {
          create: { userId: session.user.id, role: 'owner' },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    logger.error('Internal server error', { route: 'POST /api/v1/teams', error: String(error) });
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}
