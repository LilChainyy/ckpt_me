// === Checkpoint types (from web) ===

export interface Constraint {
  id: string;
  label: string;
  reason: string;
}

export interface DeadEnd {
  id: string;
  title: string;
  attempts: { label: string; outcome: string }[];
}

export interface CodeFile {
  path: string;
  content: string;
}

export type StepType = 'action' | 'constraint' | 'dead-end' | 'decision';

export interface Step {
  id: string;
  index: number;
  type: StepType;
  title: string;
  reasoning: string;
  files?: CodeFile[];
  changedFiles?: string[];
  constraintIds?: string[];
  deadEndId?: string;
}

export interface Checkpoint {
  id: string;
  task: string;
  author: string;
  repoUrl?: string;
  handoffNote: string;
  openItems: string[];
  constraints: Constraint[];
  deadEnds: DeadEnd[];
  steps: Step[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckpointCreate {
  task: string;
  author: string;
  repoUrl?: string;
  handoffNote?: string;
  openItems?: string[];
  constraints?: Constraint[];
  deadEnds?: DeadEnd[];
  steps?: Step[];
}

// === Reasoning types (from API) ===

export interface ReasoningRecord {
  id: string;
  commitHash?: string;
  reasoning?: string;
  author?: string;
  timestamp?: string;
  files?: string[];
  parentHash?: string;
  metadata?: Record<string, unknown>;
  repoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReasoningRecordCreate {
  id: string;
  commitHash?: string;
  reasoning?: string;
  author?: string;
  timestamp?: string;
  files?: string[];
  parentHash?: string;
  metadata?: Record<string, unknown>;
  repoUrl?: string;
}

export interface SyncRequest {
  records: ReasoningRecordCreate[];
}

export interface SyncResponse {
  syncedIds: string[];
  count: number;
}

// === Comment types ===

export interface Comment {
  id: string;
  checkpointId: string;
  stepId?: string;
  userId: string;
  userName?: string;
  userImage?: string;
  body: string;
  createdAt: string;
}

// === Agent types (for Phase 3, define early) ===

export type AgentTool = 'claude-code' | 'cursor' | 'copilot' | 'manual' | 'unknown';

export interface AgentInfo {
  tool: AgentTool;
  model?: string;
  sessionId?: string;
}

// === Protocol types (Phase 5) ===

export interface ReasoningEvent {
  type: 'reasoning';
  commitHash: string;
  reasoning: string;
  author: string;
  files: string[];
  parentHash?: string;
  metadata?: Record<string, unknown>;
  repoUrl?: string;
  timestamp: string;
}

export interface CheckpointBundle {
  type: 'checkpoint';
  task: string;
  author: string;
  repoUrl?: string;
  handoffNote?: string;
  openItems?: string[];
  constraints?: Constraint[];
  deadEnds?: DeadEnd[];
  steps?: Step[];
  timestamp: string;
}

export type ProtocolEvent = ReasoningEvent | CheckpointBundle;
