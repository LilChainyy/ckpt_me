import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    checkpoint: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    checkpointVersion: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, PUT } from '../checkpoints/[id]/route';
import { prisma } from '@/lib/db';

const mockedPrisma = vi.mocked(prisma);

function makeGetRequest() {
  return new NextRequest(new URL('http://localhost:3000/api/v1/checkpoints/cp-1'));
}

function makePutRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost:3000/api/v1/checkpoints/cp-1'), {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const mockCheckpoint = {
  id: 'cp-1',
  task: 'Setup DB',
  author: 'yiyan',
  repoUrl: 'https://github.com/example/repo',
  handoffNote: 'All good',
  openItems: [],
  constraints: [],
  deadEnds: [],
  steps: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GET /api/v1/checkpoints/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for non-existent id', async () => {
    mockedPrisma.checkpoint.findUnique.mockResolvedValue(null as never);

    const response = await GET(makeGetRequest(), makeParams('missing-id'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('not found');
  });

  it('returns checkpoint data for valid id', async () => {
    mockedPrisma.checkpoint.findUnique.mockResolvedValue(mockCheckpoint as never);

    const response = await GET(makeGetRequest(), makeParams('cp-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe('cp-1');
    expect(body.task).toBe('Setup DB');
  });
});

describe('PUT /api/v1/checkpoints/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid input', async () => {
    // task must be a non-empty string if provided
    const response = await PUT(makePutRequest({ task: '' }), makeParams('cp-1'));

    expect(response.status).toBe(400);
  });

  it('returns 404 for non-existent id', async () => {
    mockedPrisma.checkpoint.findUnique.mockResolvedValue(null as never);

    const response = await PUT(
      makePutRequest({ task: 'Updated' }),
      makeParams('missing-id'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('not found');
  });

  it('creates a version snapshot before updating', async () => {
    mockedPrisma.checkpoint.findUnique.mockResolvedValue(mockCheckpoint as never);
    mockedPrisma.checkpointVersion.count.mockResolvedValue(2 as never);
    mockedPrisma.checkpointVersion.create.mockResolvedValue({} as never);
    mockedPrisma.checkpoint.update.mockResolvedValue({
      ...mockCheckpoint,
      task: 'Updated',
    } as never);

    await PUT(makePutRequest({ task: 'Updated' }), makeParams('cp-1'));

    expect(mockedPrisma.checkpointVersion.create).toHaveBeenCalledWith({
      data: {
        checkpointId: 'cp-1',
        version: 3,
        snapshot: {
          task: mockCheckpoint.task,
          author: mockCheckpoint.author,
          repoUrl: mockCheckpoint.repoUrl,
          handoffNote: mockCheckpoint.handoffNote,
          openItems: mockCheckpoint.openItems,
          constraints: mockCheckpoint.constraints,
          deadEnds: mockCheckpoint.deadEnds,
          steps: mockCheckpoint.steps,
        },
      },
    });
  });

  it('returns updated checkpoint', async () => {
    const updated = { ...mockCheckpoint, task: 'Updated task' };
    mockedPrisma.checkpoint.findUnique.mockResolvedValue(mockCheckpoint as never);
    mockedPrisma.checkpointVersion.count.mockResolvedValue(0 as never);
    mockedPrisma.checkpointVersion.create.mockResolvedValue({} as never);
    mockedPrisma.checkpoint.update.mockResolvedValue(updated as never);

    const response = await PUT(
      makePutRequest({ task: 'Updated task' }),
      makeParams('cp-1'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.task).toBe('Updated task');
  });
});
