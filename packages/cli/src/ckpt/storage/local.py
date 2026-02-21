"""LocalStore — SQLite CRUD for reasoning and staging records."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone

from ckpt.core.config import ensure_ckpt_dir, get_db_path
from ckpt.storage.schema import migrate


class LocalStore:
    """SQLite-backed local storage for reasoning data."""

    def __init__(self) -> None:
        ensure_ckpt_dir()
        self._db_path = get_db_path()
        self._conn: sqlite3.Connection | None = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(str(self._db_path))
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.row_factory = sqlite3.Row
            migrate(self._conn.cursor())
            self._conn.commit()
        return self._conn

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    # --- Staging ---

    def add_staging(
        self,
        files: list[str],
        reasoning: str | None = None,
        metadata: dict | None = None,
    ) -> str:
        """Create a staging record. Returns the record ID."""
        record_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            "INSERT INTO staging (id, reasoning, files, timestamp, metadata) VALUES (?, ?, ?, ?, ?)",
            (
                record_id,
                reasoning,
                json.dumps(files),
                now,
                json.dumps(metadata or {}),
            ),
        )
        self.conn.commit()
        return record_id

    def get_staging_records(self) -> list[dict]:
        """Return all staging records."""
        rows = self.conn.execute("SELECT * FROM staging ORDER BY timestamp").fetchall()
        return [dict(row) for row in rows]

    def get_staging_reasoning(self) -> str | None:
        """Aggregate reasoning from all staging records."""
        rows = self.conn.execute(
            "SELECT reasoning FROM staging WHERE reasoning IS NOT NULL ORDER BY timestamp"
        ).fetchall()
        parts = [row["reasoning"] for row in rows if row["reasoning"]]
        return "\n".join(parts) if parts else None

    def clear_staging(self) -> None:
        """Delete all staging records."""
        self.conn.execute("DELETE FROM staging")
        self.conn.commit()

    # --- Reasoning ---

    def add_reasoning(
        self,
        commit_hash: str,
        reasoning: str | None,
        author: str,
        files: list[str],
        parent_hash: str = "",
        metadata: dict | None = None,
    ) -> str:
        """Create a reasoning record. Returns the record ID."""
        record_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            """INSERT INTO reasoning
               (id, commit_hash, reasoning, author, timestamp, files, parent_hash, metadata, synced, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)""",
            (
                record_id,
                commit_hash,
                reasoning,
                author,
                now,
                json.dumps(files),
                parent_hash,
                json.dumps(metadata or {}),
                now,
                now,
            ),
        )
        self.conn.commit()
        return record_id

    def get_reasoning_by_commit(self, commit_hash: str) -> dict | None:
        """Look up reasoning for a given commit hash."""
        row = self.conn.execute(
            "SELECT * FROM reasoning WHERE commit_hash = ?", (commit_hash,)
        ).fetchone()
        return dict(row) if row else None

    def get_unsynced(self) -> list[dict]:
        """Return all reasoning records not yet synced."""
        rows = self.conn.execute(
            "SELECT * FROM reasoning WHERE synced = 0 ORDER BY timestamp"
        ).fetchall()
        return [dict(row) for row in rows]

    def mark_synced(self, record_ids: list[str]) -> None:
        """Mark records as synced."""
        if not record_ids:
            return
        now = datetime.now(timezone.utc).isoformat()
        placeholders = ",".join("?" for _ in record_ids)
        self.conn.execute(
            f"UPDATE reasoning SET synced = 1, updated_at = ? WHERE id IN ({placeholders})",
            [now, *record_ids],
        )
        self.conn.commit()

    def get_reasoning_records(self, limit: int = 50) -> list[dict]:
        """Return recent reasoning records."""
        rows = self.conn.execute(
            "SELECT * FROM reasoning ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
