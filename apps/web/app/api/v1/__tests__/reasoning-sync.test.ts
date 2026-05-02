import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    reasoning: {
      upsert: vi.fn(),
    },
  },
}));

import { POST } from '../reasoning/sync/route';
import { prisma } from '@/lib/db';

const mockedPrisma = vi.mocked(prisma);

function makeRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost:3000/api/v1/reasoning/sync'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/reasoning/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs valid reasoning records', async () => {
    mockedPrisma.reasoning.upsert.mockResolvedValue({} as never);

    const request = makeRequest({
      records: [
        {
          id: 'r1',
          commitHash: 'abc123',
          reasoning: 'Refactored auth module',
          author: 'yiyan',
          timestamp: '2026-05-01T00:00:00Z',
          files: ['src/auth.ts'],
          repoUrl: 'https://github.com/ckptlabs/ckpt',
        },
      ],
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.syncedIds).toEqual(['r1']);
    expect(body.count).toBe(1);
    expect(mockedPrisma.reasoning.upsert).toHaveBeenCalledTimes(1);
  });

  it('syncs multiple records', async () => {
    mockedPrisma.reasoning.upsert.mockResolvedValue({} as never);

    const request = makeRequest({
      records: [
        { id: 'r1', reasoning: 'First' },
        { id: 'r2', reasoning: 'Second' },
        { id: 'r3', reasoning: 'Third' },
      ],
    });

    const response = await POST(request);
    const body = await response.json();

    expect(body.syncedIds).toEqual(['r1', 'r2', 'r3']);
    expect(body.count).toBe(3);
    expect(mockedPrisma.reasoning.upsert).toHaveBeenCalledTimes(3);
  });

  it('handles empty records array', async () => {
    const request = makeRequest({ records: [] });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.syncedIds).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('returns 400 for invalid payload (missing records)', async () => {
    const request = makeRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 for records without id', async () => {
    const request = makeRequest({
      records: [{ reasoning: 'No id here' }],
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('uses upsert to handle duplicate ids', async () => {
    mockedPrisma.reasoning.upsert.mockResolvedValue({} as never);

    const request = makeRequest({
      records: [
        {
          id: 'r1',
          commitHash: 'abc',
          reasoning: 'Updated reasoning',
          author: 'yiyan',
        },
      ],
    });

    await POST(request);

    expect(mockedPrisma.reasoning.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        create: expect.objectContaining({ id: 'r1' }),
        update: expect.objectContaining({ reasoning: 'Updated reasoning' }),
      })
    );
  });
});
