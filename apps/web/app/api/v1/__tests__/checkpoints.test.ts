import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Prisma before importing the route
vi.mock('@/lib/db', () => ({
  prisma: {
    checkpoint: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from '../checkpoints/route';
import { prisma } from '@/lib/db';

const mockedPrisma = vi.mocked(prisma);

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('GET /api/v1/checkpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns checkpoints with default limit', async () => {
    const mockCheckpoints = [
      { id: '1', task: 'Setup DB', author: 'yiyan', createdAt: new Date() },
    ];
    mockedPrisma.checkpoint.findMany.mockResolvedValue(mockCheckpoints as never);

    const request = makeRequest('http://localhost:3000/api/v1/checkpoints');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checkpoints).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(mockedPrisma.checkpoint.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  });

  it('filters by repo when provided', async () => {
    mockedPrisma.checkpoint.findMany.mockResolvedValue([] as never);

    const request = makeRequest('http://localhost:3000/api/v1/checkpoints?repo=ckptlabs');
    await GET(request);

    expect(mockedPrisma.checkpoint.findMany).toHaveBeenCalledWith({
      where: { repoUrl: { contains: 'ckptlabs' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  });

  it('respects custom limit', async () => {
    mockedPrisma.checkpoint.findMany.mockResolvedValue([] as never);

    const request = makeRequest('http://localhost:3000/api/v1/checkpoints?limit=10');
    await GET(request);

    expect(mockedPrisma.checkpoint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it('clamps limit to max 500', async () => {
    mockedPrisma.checkpoint.findMany.mockResolvedValue([] as never);

    const request = makeRequest('http://localhost:3000/api/v1/checkpoints?limit=9999');
    await GET(request);

    expect(mockedPrisma.checkpoint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 })
    );
  });
});

describe('POST /api/v1/checkpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a checkpoint with valid data', async () => {
    const input = { task: 'Set up database', author: 'yiyan' };
    const created = { id: 'new-1', ...input, createdAt: new Date() };
    mockedPrisma.checkpoint.create.mockResolvedValue(created as never);

    const request = makeRequest('http://localhost:3000/api/v1/checkpoints', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe('new-1');
    expect(body.task).toBe('Set up database');
  });

  it('returns 400 for invalid data (empty task)', async () => {
    const request = makeRequest('http://localhost:3000/api/v1/checkpoints', {
      method: 'POST',
      body: JSON.stringify({ task: '', author: 'yiyan' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for missing required fields', async () => {
    const request = makeRequest('http://localhost:3000/api/v1/checkpoints', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('applies defaults for optional fields', async () => {
    const input = { task: 'Test defaults', author: 'yiyan' };
    mockedPrisma.checkpoint.create.mockResolvedValue({ id: '1', ...input } as never);

    const request = makeRequest('http://localhost:3000/api/v1/checkpoints', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    await POST(request);

    expect(mockedPrisma.checkpoint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        handoffNote: '',
        openItems: [],
        constraints: [],
        deadEnds: [],
        steps: [],
      }),
    });
  });
});
