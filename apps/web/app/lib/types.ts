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
  path: string;       // e.g. "ratelimiter/types.go"
  content: string;
}

export interface Step {
  id: string;
  index: number;
  type: 'action' | 'constraint' | 'dead-end' | 'decision';
  title: string;
  reasoning: string;
  files?: CodeFile[];          // full codebase state at this step
  changedFiles?: string[];     // paths that changed vs previous step (for highlighting)
  constraintIds?: string[];
  deadEndId?: string;
}

export interface Checkpoint {
  id: string;
  task: string;
  author: string;
  handoffNote: string;
  openItems: string[];
  constraints: Constraint[];
  deadEnds: DeadEnd[];
  steps: Step[];
}
