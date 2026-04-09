import { z } from 'zod';

// === Checkpoint schemas ===

export const constraintSchema = z.object({
  id: z.string(),
  label: z.string(),
  reason: z.string(),
});

export const deadEndAttemptSchema = z.object({
  label: z.string(),
  outcome: z.string(),
});

export const deadEndSchema = z.object({
  id: z.string(),
  title: z.string(),
  attempts: z.array(deadEndAttemptSchema),
});

export const codeFileSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export const stepSchema = z.object({
  id: z.string(),
  index: z.number(),
  type: z.enum(['action', 'constraint', 'dead-end', 'decision']),
  title: z.string(),
  reasoning: z.string(),
  files: z.array(codeFileSchema).optional(),
  changedFiles: z.array(z.string()).optional(),
  constraintIds: z.array(z.string()).optional(),
  deadEndId: z.string().optional(),
});

export const checkpointCreateSchema = z.object({
  task: z.string().min(1),
  author: z.string().min(1),
  repoUrl: z.string().optional(),
  handoffNote: z.string().optional().default(''),
  openItems: z.array(z.string()).optional().default([]),
  constraints: z.array(constraintSchema).optional().default([]),
  deadEnds: z.array(deadEndSchema).optional().default([]),
  steps: z.array(stepSchema).optional().default([]),
});

// === Reasoning schemas ===

export const reasoningRecordCreateSchema = z.object({
  id: z.string(),
  commitHash: z.string().optional(),
  reasoning: z.string().optional(),
  author: z.string().optional(),
  timestamp: z.string().optional(),
  files: z.array(z.string()).optional(),
  parentHash: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  repoUrl: z.string().optional(),
});

export const syncRequestSchema = z.object({
  records: z.array(reasoningRecordCreateSchema),
});

// === Protocol schemas (Phase 5) ===

export const reasoningEventSchema = z.object({
  type: z.literal('reasoning'),
  commitHash: z.string(),
  reasoning: z.string(),
  author: z.string(),
  files: z.array(z.string()),
  parentHash: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  repoUrl: z.string().optional(),
  timestamp: z.string(),
});

export const checkpointBundleSchema = z.object({
  type: z.literal('checkpoint'),
  task: z.string(),
  author: z.string(),
  repoUrl: z.string().optional(),
  handoffNote: z.string().optional(),
  openItems: z.array(z.string()).optional(),
  constraints: z.array(constraintSchema).optional(),
  deadEnds: z.array(deadEndSchema).optional(),
  steps: z.array(stepSchema).optional(),
  timestamp: z.string(),
});

export const protocolEventSchema = z.discriminatedUnion('type', [
  reasoningEventSchema,
  checkpointBundleSchema,
]);
