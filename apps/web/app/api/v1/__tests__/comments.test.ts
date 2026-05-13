import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    comment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    checkpoint: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { GET, POST } from '../checkpoints/[id]/comments/route';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

const mockedPrisma = vi.mocked(prisma);
const mockedAuth = vi.mocked(auth);

function makeGetRequest() {
  return new NextRequest(
    new URL('http://localhost:3000/api/v1/checkpoints/cp-1/comments'),
  );
}

function makePostRequest(body: unknown) {
  return new NextRequest(
    new URL('http://localhost:3000/api/v1/checkpoints/cp-1/comments'),
    { method: 'POST', body: JSON.stringify(body) },
  );
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/v1/checkpoints/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns comments with user info', async () => {
    const mockComments = [
      {
        id: 'cm-1',
        checkpointId: 'cp-1',
        stepId: null,
        userId: 'u-1',
        body: 'Looks good',
        createdAt: new Date('2026-05-01T00:00:00Z'),
        user: { name: 'Dev User', image: 'https://example.com/avatar.png' },
      },
    ];
    mockedPrisma.comment.findMany.mockResolvedValue(mockComments as never);

    const response = await GET(makeGetRequest(), makeParams('cp-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.comments).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(body.comments[0].userName).toBe('Dev User');
    expect(body.comments[0].createdAt).toBe('2026-05-01T00:00:00.000Z');
  });
});

describe('POST /api/v1/checkpoints/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const response = await POST(
      makePostRequest({ body: 'A comment' }),
      makeParams('cp-1'),
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 for empty body', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'u-1' } } as never);

    const response = await POST(
      makePostRequest({ body: '' }),
      makeParams('cp-1'),
    );

    expect(response.status).toBe(400);
  });

  it('returns 404 if checkpoint does not exist', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'u-1' } } as never);
    mockedPrisma.checkpoint.findUnique.mockResolvedValue(null as never);

    const response = await POST(
      makePostRequest({ body: 'A comment' }),
      makeParams('missing'),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe('checkpoint not found');
  });

  it('creates comment and returns it with 201', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'u-1' } } as never);
    mockedPrisma.checkpoint.findUnique.mockResolvedValue({ id: 'cp-1' } as never);
    mockedPrisma.comment.create.mockResolvedValue({
      id: 'cm-new',
      checkpointId: 'cp-1',
      stepId: null,
      userId: 'u-1',
      body: 'Great work',
      createdAt: new Date('2026-05-01T12:00:00Z'),
      user: { name: 'Dev', image: null },
    } as never);

    const response = await POST(
      makePostRequest({ body: 'Great work' }),
      makeParams('cp-1'),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.id).toBe('cm-new');
    expect(json.body).toBe('Great work');
    expect(json.userName).toBe('Dev');
  });
});
