"""Parse reasoning from --flag or stdin."""

from __future__ import annotations

import sys

from ckpt.storage.local import LocalStore


def resolve_reasoning(
    flag_value: str | None = None,
    store: LocalStore | None = None,
) -> str | None:
    """Resolve reasoning from multiple sources in priority order.

    1. Explicit --reasoning flag value
    2. Piped stdin (if not a TTY)
    3. Aggregated from staging records
    4. None
    """
    # 1. Explicit flag
    if flag_value:
        return flag_value

    # 2. Piped stdin
    if not sys.stdin.isatty():
        stdin_text = sys.stdin.read().strip()
        if stdin_text:
            return stdin_text

    # 3. Staging records
    if store:
        staging_reasoning = store.get_staging_reasoning()
        if staging_reasoning:
            return staging_reasoning

    return None
