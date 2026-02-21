"""Resolve .ckpt/ path, API URL, and configuration."""

from __future__ import annotations

import os
from pathlib import Path

from ckpt.core import git

DEFAULT_API_URL = "https://ckpt-api.vercel.app"


def get_ckpt_dir() -> Path:
    """Return the .ckpt/ directory path (next to .git/)."""
    repo_root = git.get_repo_root()
    return Path(repo_root) / ".ckpt"


def get_db_path() -> Path:
    """Return the path to the reasoning SQLite database."""
    return get_ckpt_dir() / "reasoning.db"


def get_api_url() -> str:
    """Return the API base URL, respecting CKPT_API_URL env var."""
    return os.environ.get("CKPT_API_URL", DEFAULT_API_URL)


def ensure_ckpt_dir() -> Path:
    """Create the .ckpt/ directory if it doesn't exist, and add to .gitignore."""
    ckpt_dir = get_ckpt_dir()
    if not ckpt_dir.exists():
        ckpt_dir.mkdir(parents=True)
        _ensure_gitignore(ckpt_dir.parent)
    return ckpt_dir


def _ensure_gitignore(repo_root: Path) -> None:
    """Append .ckpt/ to .gitignore if not already present."""
    gitignore = repo_root / ".gitignore"
    entry = ".ckpt/"

    if gitignore.exists():
        content = gitignore.read_text()
        if entry in content.splitlines():
            return
        # Append with a newline separator if file doesn't end with one
        sep = "" if content.endswith("\n") else "\n"
        gitignore.write_text(content + sep + entry + "\n")
    else:
        gitignore.write_text(entry + "\n")
