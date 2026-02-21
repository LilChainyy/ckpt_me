"""Click group, git passthrough, and main entry point."""

from __future__ import annotations

import sys

import click

from ckpt.commands.add import add
from ckpt.commands.commit import commit
from ckpt.commands.diff import diff
from ckpt.commands.log import log
from ckpt.commands.push import push
from ckpt.commands.status import status
from ckpt.core.git import passthrough


class CkptGroup(click.Group):
    """Custom Click group that forwards unrecognized commands to git."""

    def resolve_command(self, ctx: click.Context, args: list[str]):
        try:
            return super().resolve_command(ctx, args)
        except click.UsageError:
            # Unknown command — pass through to git
            return "git-passthrough", args

    def get_command(self, ctx: click.Context, cmd_name: str):
        cmd = super().get_command(ctx, cmd_name)
        if cmd is not None:
            return cmd
        # Return a dynamic command that forwards to git
        return _make_git_passthrough(cmd_name)


def _make_git_passthrough(cmd_name: str) -> click.Command:
    """Create a Click command that passes through to git."""

    @click.command(
        name="git-passthrough",
        context_settings={"ignore_unknown_options": True, "allow_extra_args": True},
    )
    @click.pass_context
    def git_passthrough(ctx: click.Context):
        args = [cmd_name, *ctx.args]
        code = passthrough(tuple(args))
        sys.exit(code)

    return git_passthrough


@click.group(cls=CkptGroup)
@click.version_option(package_name="ckpt")
def cli():
    """ckpt — the reasoning layer for every code change."""


cli.add_command(add)
cli.add_command(commit)
cli.add_command(push)
cli.add_command(diff)
cli.add_command(log)
cli.add_command(status)


def main():
    cli()
