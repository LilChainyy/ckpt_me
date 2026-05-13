import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

import { GET } from '../health/route';

describe('GET /api/v1/health', () => {
  it('returns ok when database is reachable', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('version');
  });

  it('returns 503 when database is unreachable', async () => {
    const { prisma } = await import('@/lib/db');
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('connection refused'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.database).toBe('unreachable');
  });
});
