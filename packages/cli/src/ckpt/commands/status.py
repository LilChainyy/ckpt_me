"""ckpt status — git status with staging reasoning info."""

from __future__ import annotations

import json
import subprocess
import sys

import click

from ckpt.core import git
from ckpt.storage.local import LocalStore


@click.command(
    context_settings={"ignore_unknown_options": True, "allow_extra_args": True},
)
@click.pass_context
def status(ctx: click.Context):
    """Show working tree status with pending reasoning."""
    git_args = ["status", *ctx.args]
    try:
        git.run(*git_args)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)

    # Show pending staging records with reasoning
    try:
        store = LocalStore()
        records = store.get_staging_records()
        store.close()
    except Exception:
        # Storage not initialized yet — that's fine
        return

    if records:
        click.echo("\n--- ckpt staging ---")
        for r in records:
            files = json.loads(r["files"]) if isinstance(r["files"], str) else r["files"]
            reasoning = r.get("reasoning") or "(no reasoning)"
            click.echo(f"  {reasoning}")
            for f in files:
                click.echo(f"    {f}")
