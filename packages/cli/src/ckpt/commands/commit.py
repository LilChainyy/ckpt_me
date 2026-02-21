"""ckpt commit — commit with reasoning capture."""

from __future__ import annotations

import subprocess
import sys

import click

from ckpt.core import git
from ckpt.core.reasoning import resolve_reasoning
from ckpt.storage.local import LocalStore


@click.command(
    context_settings={"ignore_unknown_options": True, "allow_extra_args": True},
)
@click.option("-m", "--message", default=None, help="Commit message.")
@click.option("--reasoning", default=None, help="Why this change was made.")
@click.pass_context
def commit(ctx: click.Context, message: str | None, reasoning: str | None):
    """Commit staged changes and record reasoning."""
    store = LocalStore()

    # Resolve reasoning from flag → stdin → staging
    final_reasoning = resolve_reasoning(flag_value=reasoning, store=store)

    # Build git commit args
    git_args = ["commit"]
    if message:
        git_args.extend(["-m", message])
    # Forward any extra args (e.g. --amend, --no-edit, etc.)
    git_args.extend(ctx.args)

    try:
        git.run(*git_args)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)

    # Capture commit info
    commit_hash = git.get_head_hash()
    parent_hash = git.get_parent_hash()
    author = git.get_author()
    files = git.get_committed_files(commit_hash)

    # Save reasoning record
    store.add_reasoning(
        commit_hash=commit_hash,
        reasoning=final_reasoning,
        author=author,
        files=files,
        parent_hash=parent_hash,
    )
    store.clear_staging()
    store.close()

    if final_reasoning:
        click.echo(f"Reasoning recorded for {commit_hash[:8]}: {final_reasoning}")
    else:
        click.echo(f"Commit {commit_hash[:8]} recorded (no reasoning provided)")
