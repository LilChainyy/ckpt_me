import type { Checkpoint } from './types';
import { prisma } from '../../lib/db';

function rowToCheckpoint(row: {
  id: string;
  task: string;
  author: string;
  handoffNote: string | null;
  openItems: unknown;
  constraints: unknown;
  deadEnds: unknown;
  steps: unknown;
  createdAt: Date;
  updatedAt: Date;
}): Checkpoint {
  return {
    id: row.id,
    task: row.task,
    author: row.author,
    handoffNote: (row.handoffNote ?? '') as string,
    openItems: row.openItems as unknown as string[],
    constraints: row.constraints as unknown as Checkpoint['constraints'],
    deadEnds: row.deadEnds as unknown as Checkpoint['deadEnds'],
    steps: row.steps as unknown as Checkpoint['steps'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Returns true when mock/demo data should be served.
 * Controlled by NEXT_PUBLIC_DEMO_MODE=true env var.
 * In production, this should never be set.
 */
function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Lazily import mock data only when demo mode is active.
 * Avoids bundling mock data into production builds when not needed.
 */
async function getMockCheckpoint(id: string): Promise<Checkpoint | null> {
  const { checkpoints: mockCheckpoints } = await import('./mock-data');
  return mockCheckpoints[id] ?? null;
}

async function getAllMockCheckpoints(): Promise<Checkpoint[]> {
  const { checkpoints: mockCheckpoints } = await import('./mock-data');
  return Object.values(mockCheckpoints);
}

export async function getCheckpoint(id: string): Promise<Checkpoint | null> {
  if (isDemoMode()) {
    return getMockCheckpoint(id);
  }

  const row = await prisma.checkpoint.findUnique({ where: { id } });
  if (!row) return null;

  return rowToCheckpoint(row);
}

export async function getCheckpoints(ids?: string[]): Promise<Checkpoint[]> {
  if (isDemoMode()) {
    const all = await getAllMockCheckpoints();
    if (ids && ids.length > 0) {
      const idSet = new Set(ids);
      return all.filter((c) => idSet.has(c.id));
    }
    return all;
  }

  const where = ids && ids.length > 0 ? { id: { in: ids } } : {};

  const rows = await prisma.checkpoint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(rowToCheckpoint);
}

