import type Database from 'better-sqlite3';

const SCHEMA_VERSION = 2;

const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS reasoning (
      id TEXT PRIMARY KEY,
      commit_hash TEXT,
      reasoning TEXT,
      author TEXT,
      timestamp TEXT,
      files TEXT,
      parent_hash TEXT,
      metadata TEXT,
      synced INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reasoning_commit ON reasoning(commit_hash)`,
    `CREATE INDEX IF NOT EXISTS idx_reasoning_synced ON reasoning(synced)`,
    `CREATE TABLE IF NOT EXISTS staging (
      id TEXT PRIMARY KEY,
      reasoning TEXT,
      files TEXT,
      timestamp TEXT,
      metadata TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )`,
  ],
  2: [
    `ALTER TABLE reasoning ADD COLUMN repo_url TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_reasoning_repo ON reasoning(repo_url)`,
  ],
};

export function migrate(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);

  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    const stmts = MIGRATIONS[v];
    if (!stmts) continue;
    for (const sql of stmts) {
      db.exec(sql);
    }
  }

  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
    'schema_version',
    String(SCHEMA_VERSION)
  );
}

function getCurrentVersion(db: Database.Database): number {
  try {
    const row = db
      .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
      .get() as { value: string } | undefined;
    return row ? parseInt(row.value, 10) : 0;
  } catch {
    // meta table doesn't exist yet
    return 0;
  }
}
