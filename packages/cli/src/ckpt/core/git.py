"""Git subprocess wrapper."""

from __future__ import annotations

import subprocess


def run(
    *args: str,
    capture: bool = False,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    """Run a git command.

    Args:
        args: Arguments to pass to git (e.g. "add", ".", "--all").
        capture: If True, capture stdout/stderr instead of streaming to terminal.
        check: If True, raise on non-zero exit code.

    Returns:
        CompletedProcess with returncode and optionally stdout/stderr.
    """
    cmd = ["git", *args]
    kwargs = {"text": True, "check": check}
    if capture:
        kwargs["stdout"] = subprocess.PIPE
        kwargs["stderr"] = subprocess.PIPE
    return subprocess.run(cmd, **kwargs)


def get_repo_root() -> str:
    """Return the absolute path to the repository root."""
    result = run("rev-parse", "--show-toplevel", capture=True)
    return result.stdout.strip()


def get_staged_files() -> list[str]:
    """Return list of staged file paths."""
    result = run("diff", "--cached", "--name-only", capture=True)
    return [f for f in result.stdout.strip().splitlines() if f]


def get_head_hash() -> str:
    """Return the current HEAD commit hash."""
    result = run("rev-parse", "HEAD", capture=True)
    return result.stdout.strip()


def get_parent_hash() -> str:
    """Return the parent commit hash, or empty string for initial commit."""
    try:
        result = run("rev-parse", "HEAD~1", capture=True, check=False)
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return ""


def get_author() -> str:
    """Return 'Name <email>' of the current git user."""
    name = run("config", "user.name", capture=True, check=False).stdout.strip()
    email = run("config", "user.email", capture=True, check=False).stdout.strip()
    if name and email:
        return f"{name} <{email}>"
    return name or email or "unknown"


def get_committed_files(commit_hash: str) -> list[str]:
    """Return list of files changed in a specific commit."""
    result = run("diff-tree", "--no-commit-id", "--name-only", "-r", commit_hash, capture=True)
    return [f for f in result.stdout.strip().splitlines() if f]


def passthrough(args: tuple[str, ...]) -> int:
    """Run a git command, streaming output directly to the terminal.

    Returns the exit code.
    """
    result = subprocess.run(["git", *args])
    return result.returncode
