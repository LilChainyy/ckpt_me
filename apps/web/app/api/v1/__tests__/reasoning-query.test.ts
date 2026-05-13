import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    reasoning: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from '../reasoning/route';
import { prisma } from '@/lib/db';

const mockedPrisma = vi.mocked(prisma);

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/v1/reasoning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns records with default limit', async () => {
    const mockRecords = [
      { id: 'r1', commitHash: 'abc', reasoning: 'test', author: 'dev' },
    ];
    mockedPrisma.reasoning.findMany.mockResolvedValue(mockRecords as never);

    const response = await GET(makeRequest('/api/v1/reasoning'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.records).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(mockedPrisma.reasoning.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  });

  it('filters by repo query param', async () => {
    mockedPrisma.reasoning.findMany.mockResolvedValue([] as never);

    await GET(makeRequest('/api/v1/reasoning?repo=ckptlabs'));

    expect(mockedPrisma.reasoning.findMany).toHaveBeenCalledWith({
      where: { repoUrl: { contains: 'ckptlabs' } },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  });

  it('filters by author query param', async () => {
    mockedPrisma.reasoning.findMany.mockResolvedValue([] as never);

    await GET(makeRequest('/api/v1/reasoning?author=yiyan'));

    expect(mockedPrisma.reasoning.findMany).toHaveBeenCalledWith({
      where: { author: { contains: 'yiyan' } },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  });

  it('filters by since query param', async () => {
    mockedPrisma.reasoning.findMany.mockResolvedValue([] as never);

    await GET(makeRequest('/api/v1/reasoning?since=2026-01-01'));

    expect(mockedPrisma.reasoning.findMany).toHaveBeenCalledWith({
      where: { timestamp: { gte: new Date('2026-01-01') } },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  });

  it('respects limit param', async () => {
    mockedPrisma.reasoning.findMany.mockResolvedValue([] as never);

    await GET(makeRequest('/api/v1/reasoning?limit=5'));

    expect(mockedPrisma.reasoning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });

  it('clamps limit to 1-500 range', async () => {
    mockedPrisma.reasoning.findMany.mockResolvedValue([] as never);

    await GET(makeRequest('/api/v1/reasoning?limit=9999'));
    expect(mockedPrisma.reasoning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 })
    );

    vi.clearAllMocks();
    mockedPrisma.reasoning.findMany.mockResolvedValue([] as never);

    await GET(makeRequest('/api/v1/reasoning?limit=0'));
    expect(mockedPrisma.reasoning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 })
    );
  });

  it('returns empty array when no matches', async () => {
    mockedPrisma.reasoning.findMany.mockResolvedValue([] as never);

    const response = await GET(makeRequest('/api/v1/reasoning'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.records).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('returns 500 on database error', async () => {
    mockedPrisma.reasoning.findMany.mockRejectedValue(new Error('db down'));

    const response = await GET(makeRequest('/api/v1/reasoning'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('internal server error');
  });
});
