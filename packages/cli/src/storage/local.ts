import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { getCkptDir, getDbPath } from '../core/config.js';
import { migrate } from './schema.js';

export class LocalStore {
  private db: Database.Database;

  constructor() {
    const dir = getCkptDir();
    if (!existsSync(dir)) {
      console.error('Not a ckpt directory. Run `ckpt init` first.');
      process.exit(1);
    }
    this.db = new Database(getDbPath());
    this.db.pragma('journal_mode = WAL');
    migrate(this.db);
  }

  close(): void {
    this.db.close();
  }

  // --- Staging ---

  addStaging(files: string[], reasoning?: string, metadata?: Record<string, unknown>): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare('INSERT INTO staging (id, reasoning, files, timestamp, metadata) VALUES (?, ?, ?, ?, ?)')
      .run(id, reasoning ?? null, JSON.stringify(files), now, JSON.stringify(metadata ?? {}));
    return id;
  }

  getStagingRecords(): Record<string, unknown>[] {
    return this.db
      .prepare('SELECT * FROM staging ORDER BY timestamp')
      .all() as Record<string, unknown>[];
  }

  getStagingReasoning(): string | undefined {
    const rows = this.db
      .prepare('SELECT reasoning FROM staging WHERE reasoning IS NOT NULL ORDER BY timestamp')
      .all() as { reasoning: string }[];
    const parts = rows.map((r) => r.reasoning).filter(Boolean);
    return parts.length > 0 ? parts.join('\n') : undefined;
  }

  clearStaging(): void {
    this.db.prepare('DELETE FROM staging').run();
  }

  // --- Reasoning ---

  addReasoning(
    commitHash: string,
    reasoning: string | undefined,
    author: string,
    files: string[],
    parentHash: string = '',
    metadata?: Record<string, unknown>,
    repoUrl?: string
  ): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO reasoning
         (id, commit_hash, reasoning, author, timestamp, files, parent_hash, metadata, synced, repo_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
      )
      .run(
        id,
        commitHash,
        reasoning ?? null,
        author,
        now,
        JSON.stringify(files),
        parentHash,
        JSON.stringify(metadata ?? {}),
        repoUrl ?? null,
        now,
        now
      );
    return id;
  }

  getReasoningByCommit(commitHash: string): Record<string, unknown> | undefined {
    return this.db
      .prepare('SELECT * FROM reasoning WHERE commit_hash = ?')
      .get(commitHash) as Record<string, unknown> | undefined;
  }

  getUnsynced(): Record<string, unknown>[] {
    return this.db
      .prepare('SELECT * FROM reasoning WHERE synced = 0 ORDER BY timestamp')
      .all() as Record<string, unknown>[];
  }

  markSynced(recordIds: string[]): void {
    if (recordIds.length === 0) return;
    const now = new Date().toISOString();
    const placeholders = recordIds.map(() => '?').join(',');
    this.db
      .prepare(`UPDATE reasoning SET synced = 1, updated_at = ? WHERE id IN (${placeholders})`)
      .run(now, ...recordIds);
  }

  getReasoningRecords(limit: number = 50): Record<string, unknown>[] {
    return this.db
      .prepare('SELECT * FROM reasoning ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as Record<string, unknown>[];
  }
}
