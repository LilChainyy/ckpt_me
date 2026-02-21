"""ckpt diff — passthrough to git diff."""

from __future__ import annotations

import sys

import click

from ckpt.core.git import passthrough


@click.command(
    context_settings={"ignore_unknown_options": True, "allow_extra_args": True},
)
@click.argument("files", nargs=-1, type=click.UNPROCESSED)
@click.pass_context
def diff(ctx: click.Context, files: tuple[str, ...]):
    """Show changes (passthrough to git diff)."""
    args = ["diff", *files, *ctx.args]
    code = passthrough(tuple(args))
    sys.exit(code)
