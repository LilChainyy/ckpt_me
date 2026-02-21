"""HTTP client for syncing reasoning records to the API."""

from __future__ import annotations

import click
import httpx

from ckpt.core.config import get_api_url


def sync_reasoning(records: list[dict]) -> list[str]:
    """POST a batch of reasoning records to the API.

    Returns list of record IDs that were successfully synced.
    """
    url = f"{get_api_url()}/api/v1/reasoning/sync"
    payload = {"records": records}

    try:
        response = httpx.post(url, json=payload, timeout=30.0)
        response.raise_for_status()
        data = response.json()
        return data.get("synced_ids", [])
    except httpx.HTTPError as e:
        click.echo(f"Warning: API sync failed: {e}", err=True)
        return []
    except Exception as e:
        click.echo(f"Warning: API sync failed: {e}", err=True)
        return []
