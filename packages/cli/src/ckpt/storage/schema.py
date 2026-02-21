"""SQL schema and migrations for the reasoning database."""

from __future__ import annotations

SCHEMA_VERSION = 1

MIGRATIONS: dict[int, str] = {
    1: """
    CREATE TABLE IF NOT EXISTS reasoning (
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
    );
    CREATE INDEX IF NOT EXISTS idx_reasoning_commit ON reasoning(commit_hash);
    CREATE INDEX IF NOT EXISTS idx_reasoning_synced ON reasoning(synced);

    CREATE TABLE IF NOT EXISTS staging (
        id TEXT PRIMARY KEY,
        reasoning TEXT,
        files TEXT,
        timestamp TEXT,
        metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '1');
    """,
}


def get_current_version(cursor) -> int:
    """Get the current schema version from the database."""
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='meta'"
    )
    if not cursor.fetchone():
        return 0
    cursor.execute("SELECT value FROM meta WHERE key = 'schema_version'")
    row = cursor.fetchone()
    return int(row[0]) if row else 0


def migrate(cursor) -> None:
    """Run any pending migrations."""
    current = get_current_version(cursor)
    for version in range(current + 1, SCHEMA_VERSION + 1):
        if version in MIGRATIONS:
            cursor.executescript(MIGRATIONS[version])
