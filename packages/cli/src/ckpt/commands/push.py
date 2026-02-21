"""ckpt push — push to remote and sync reasoning to API."""

from __future__ import annotations

import subprocess
import sys

import click

from ckpt.core import git
from ckpt.storage.local import LocalStore
from ckpt.sync.client import sync_reasoning


@click.command(
    context_settings={"ignore_unknown_options": True, "allow_extra_args": True},
)
@click.argument("remote", default="origin", required=False)
@click.argument("branch", default=None, required=False)
@click.pass_context
def push(ctx: click.Context, remote: str, branch: str | None):
    """Push to remote and sync reasoning records to the API."""
    # Build git push args
    git_args = ["push", remote]
    if branch:
        git_args.append(branch)
    git_args.extend(ctx.args)

    try:
        git.run(*git_args)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)

    # Sync unsynced reasoning records
    store = LocalStore()
    unsynced = store.get_unsynced()

    if not unsynced:
        click.echo("No reasoning records to sync.")
        store.close()
        return

    click.echo(f"Syncing {len(unsynced)} reasoning record(s)...")
    synced_ids = sync_reasoning(unsynced)

    if synced_ids:
        store.mark_synced(synced_ids)
        click.echo(f"Synced {len(synced_ids)} record(s) to API.")
    else:
        click.echo("Warning: Could not sync reasoning to API. Records will sync on next push.")

    store.close()
