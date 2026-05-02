import { describe, it, expect } from 'vitest';
import { GET } from '../health/route';

describe('GET /api/v1/health', () => {
  it('returns healthy status', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'healthy', service: 'ckpt' });
  });
});
