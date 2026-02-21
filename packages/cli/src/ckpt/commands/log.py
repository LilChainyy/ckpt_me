"""ckpt log — git log with optional reasoning enrichment."""

from __future__ import annotations

import subprocess
import sys

import click

from ckpt.core import git
from ckpt.storage.local import LocalStore


@click.command(
    context_settings={"ignore_unknown_options": True, "allow_extra_args": True},
)
@click.option("--reasoning", "show_reasoning", is_flag=True, help="Show reasoning for each commit.")
@click.option("-n", "count", type=int, default=None, help="Number of commits to show.")
@click.pass_context
def log(ctx: click.Context, show_reasoning: bool, count: int | None):
    """Show commit log, optionally with reasoning."""
    if not show_reasoning:
        # Simple passthrough
        git_args = ["log"]
        if count is not None:
            git_args.extend(["-n", str(count)])
        git_args.extend(ctx.args)
        code = git.passthrough(tuple(git_args))
        sys.exit(code)

    # Enriched mode: get log as structured data, then append reasoning
    git_args = ["log", "--format=%H|%s"]
    if count is not None:
        git_args.extend(["-n", str(count)])
    git_args.extend(ctx.args)

    try:
        result = git.run(*git_args, capture=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)

    store = LocalStore()

    for line in result.stdout.strip().splitlines():
        if not line:
            continue
        parts = line.split("|", 1)
        commit_hash = parts[0]
        subject = parts[1] if len(parts) > 1 else ""

        click.echo(f"\ncommit {commit_hash}")
        click.echo(f"    {subject}")

        record = store.get_reasoning_by_commit(commit_hash)
        if record and record.get("reasoning"):
            click.echo(f"    reasoning: {record['reasoning']}")

    store.close()
