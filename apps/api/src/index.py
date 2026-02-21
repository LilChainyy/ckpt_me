from typing import List, Optional

from fastapi import FastAPI, Query
from pydantic import BaseModel

app = FastAPI(
    title="ckpt API",
    description="The reasoning layer for every code change",
    version="0.1.0",
)

# In-memory store (persistent DB is a separate task)
_reasoning_store: dict[str, dict] = {}


class ReasoningRecord(BaseModel):
    id: str
    commit_hash: Optional[str] = None
    reasoning: Optional[str] = None
    author: Optional[str] = None
    timestamp: Optional[str] = None
    files: Optional[str] = None
    parent_hash: Optional[str] = None
    metadata: Optional[str] = None
    synced: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SyncRequest(BaseModel):
    records: List[ReasoningRecord]


class SyncResponse(BaseModel):
    synced_ids: List[str]
    count: int


@app.get("/")
def root():
    return {"status": "ok", "service": "ckpt-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/v1/reasoning/sync", response_model=SyncResponse)
def sync_reasoning(body: SyncRequest):
    """Receive a batch of reasoning records from the CLI."""
    synced_ids = []
    for record in body.records:
        _reasoning_store[record.id] = record.model_dump()
        synced_ids.append(record.id)
    return SyncResponse(synced_ids=synced_ids, count=len(synced_ids))


@app.get("/api/v1/reasoning/{commit_hash}")
def get_reasoning(commit_hash: str):
    """Get reasoning for a specific commit."""
    for record in _reasoning_store.values():
        if record.get("commit_hash") == commit_hash:
            return record
    return {"error": "not found", "commit_hash": commit_hash}


@app.get("/api/v1/reasoning")
def list_reasoning(
    repo: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    since: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    """Query reasoning records with optional filters."""
    results = list(_reasoning_store.values())

    if author:
        results = [r for r in results if author in (r.get("author") or "")]
    if since:
        results = [r for r in results if (r.get("timestamp") or "") >= since]

    results = results[:limit]
    return {"records": results, "count": len(results)}
