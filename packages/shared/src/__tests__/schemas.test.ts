import { describe, it, expect } from 'vitest';
import {
  constraintSchema,
  deadEndSchema,
  stepSchema,
  checkpointCreateSchema,
  reasoningRecordCreateSchema,
  syncRequestSchema,
  reasoningEventSchema,
  checkpointBundleSchema,
  protocolEventSchema,
} from '../schemas';

// ─── Constraint Schema ───

describe('constraintSchema', () => {
  it('accepts a valid constraint', () => {
    const result = constraintSchema.safeParse({
      id: 'c1',
      label: 'No ORM',
      reason: 'Team prefers raw SQL',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const result = constraintSchema.safeParse({ id: 'c1' });
    expect(result.success).toBe(false);
  });

  it('rejects non-string values', () => {
    const result = constraintSchema.safeParse({
      id: 123,
      label: 'test',
      reason: 'test',
    });
    expect(result.success).toBe(false);
  });
});

// ─── DeadEnd Schema ───

describe('deadEndSchema', () => {
  it('accepts a valid dead end with attempts', () => {
    const result = deadEndSchema.safeParse({
      id: 'de1',
      title: 'Tried Redis caching',
      attempts: [
        { label: 'Attempt 1', outcome: 'Too complex for MVP' },
        { label: 'Attempt 2', outcome: 'Memory issues' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty attempts array', () => {
    const result = deadEndSchema.safeParse({
      id: 'de1',
      title: 'Tried Redis',
      attempts: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid attempt shape', () => {
    const result = deadEndSchema.safeParse({
      id: 'de1',
      title: 'Tried Redis',
      attempts: [{ wrong: 'field' }],
    });
    expect(result.success).toBe(false);
  });
});

// ─── Step Schema ───

describe('stepSchema', () => {
  it('accepts a valid action step', () => {
    const result = stepSchema.safeParse({
      id: 's1',
      index: 0,
      type: 'action',
      title: 'Set up Prisma',
      reasoning: 'Need an ORM for type-safe queries',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid step types', () => {
    const types = ['action', 'constraint', 'dead-end', 'decision'] as const;
    for (const type of types) {
      const result = stepSchema.safeParse({
        id: `s-${type}`,
        index: 0,
        type,
        title: `${type} step`,
        reasoning: 'Some reasoning',
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid step type', () => {
    const result = stepSchema.safeParse({
      id: 's1',
      index: 0,
      type: 'invalid-type',
      title: 'Bad step',
      reasoning: 'Nope',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional files and changedFiles', () => {
    const result = stepSchema.safeParse({
      id: 's1',
      index: 1,
      type: 'action',
      title: 'Add route',
      reasoning: 'Need API endpoint',
      files: [{ path: 'src/api.ts', content: 'export {}' }],
      changedFiles: ['src/api.ts'],
      constraintIds: ['c1'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.files).toHaveLength(1);
      expect(result.data.changedFiles).toEqual(['src/api.ts']);
    }
  });
});

// ─── Checkpoint Create Schema ───

describe('checkpointCreateSchema', () => {
  it('accepts minimal valid checkpoint', () => {
    const result = checkpointCreateSchema.safeParse({
      task: 'Set up database',
      author: 'yiyan',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Defaults should be applied
      expect(result.data.handoffNote).toBe('');
      expect(result.data.openItems).toEqual([]);
      expect(result.data.constraints).toEqual([]);
      expect(result.data.deadEnds).toEqual([]);
      expect(result.data.steps).toEqual([]);
    }
  });

  it('accepts full checkpoint with all fields', () => {
    const result = checkpointCreateSchema.safeParse({
      task: 'Implement auth',
      author: 'yiyan',
      repoUrl: 'https://github.com/ckptlabs/ckpt',
      handoffNote: 'OAuth flow is working, needs CSRF protection',
      openItems: ['Add CSRF tokens', 'Rate limit login attempts'],
      constraints: [{ id: 'c1', label: 'GitHub OAuth only', reason: 'Simplicity' }],
      deadEnds: [
        {
          id: 'de1',
          title: 'Magic links',
          attempts: [{ label: 'Tried Resend', outcome: 'Too slow for dev flow' }],
        },
      ],
      steps: [
        {
          id: 's1',
          index: 0,
          type: 'decision',
          title: 'Chose GitHub OAuth',
          reasoning: 'Users already have GitHub accounts',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty task', () => {
    const result = checkpointCreateSchema.safeParse({
      task: '',
      author: 'yiyan',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty author', () => {
    const result = checkpointCreateSchema.safeParse({
      task: 'Something',
      author: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = checkpointCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── Reasoning Record Create Schema ───

describe('reasoningRecordCreateSchema', () => {
  it('accepts minimal reasoning record', () => {
    const result = reasoningRecordCreateSchema.safeParse({
      id: 'r1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full reasoning record', () => {
    const result = reasoningRecordCreateSchema.safeParse({
      id: 'r1',
      commitHash: 'abc123',
      reasoning: 'Refactored to reduce coupling',
      author: 'yiyan',
      timestamp: '2026-05-01T00:00:00Z',
      files: ['src/api.ts', 'src/db.ts'],
      parentHash: 'def456',
      metadata: { tool: 'claude-code', model: 'claude-opus-4' },
      repoUrl: 'https://github.com/ckptlabs/ckpt',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = reasoningRecordCreateSchema.safeParse({
      reasoning: 'No id provided',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Sync Request Schema ───

describe('syncRequestSchema', () => {
  it('accepts valid sync request with multiple records', () => {
    const result = syncRequestSchema.safeParse({
      records: [
        { id: 'r1', commitHash: 'abc', reasoning: 'First change' },
        { id: 'r2', commitHash: 'def', reasoning: 'Second change' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.records).toHaveLength(2);
    }
  });

  it('accepts empty records array', () => {
    const result = syncRequestSchema.safeParse({ records: [] });
    expect(result.success).toBe(true);
  });

  it('rejects missing records field', () => {
    const result = syncRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── Protocol Schemas (Phase 5) ───

describe('protocolEventSchema', () => {
  it('accepts a reasoning event', () => {
    const result = protocolEventSchema.safeParse({
      type: 'reasoning',
      commitHash: 'abc123',
      reasoning: 'Moved to server components',
      author: 'yiyan',
      files: ['app/page.tsx'],
      timestamp: '2026-05-01T12:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a checkpoint bundle event', () => {
    const result = protocolEventSchema.safeParse({
      type: 'checkpoint',
      task: 'Auth implementation',
      author: 'yiyan',
      timestamp: '2026-05-01T12:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown event type', () => {
    const result = protocolEventSchema.safeParse({
      type: 'unknown',
      data: 'something',
    });
    expect(result.success).toBe(false);
  });

  it('rejects reasoning event missing required fields', () => {
    const result = reasoningEventSchema.safeParse({
      type: 'reasoning',
      commitHash: 'abc',
      // missing reasoning, author, files, timestamp
    });
    expect(result.success).toBe(false);
  });
});
