"""ckpt add — stage files and optionally attach reasoning."""

from __future__ import annotations

import click

from ckpt.core import git
from ckpt.storage.local import LocalStore


@click.command()
@click.argument("files", nargs=-1)
@click.option("-A", "--all", "add_all", is_flag=True, help="Stage all changes.")
@click.option("--reasoning", default=None, help="Why this change was made.")
def add(files: tuple[str, ...], add_all: bool, reasoning: str | None):
    """Stage files and optionally record reasoning."""
    # Build git add args
    git_args = ["add"]
    if add_all:
        git_args.append("--all")
    git_args.extend(files)

    if not add_all and not files:
        click.echo("Nothing specified, nothing added.")
        click.echo("Maybe you wanted to say 'ckpt add .'?")
        raise SystemExit(1)

    git.run(*git_args)

    staged = git.get_staged_files()
    if not staged:
        click.echo("No changes staged.")
        return

    click.echo(f"Staged {len(staged)} file(s)")

    if reasoning:
        store = LocalStore()
        store.add_staging(files=staged, reasoning=reasoning)
        store.close()
        click.echo(f"Reasoning saved: {reasoning}")
