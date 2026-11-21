"""Trusted, offline-only tenant/repository task namespace and SQLite binding.

This is a persistence identity, NOT authentication or provider authorization.
Task JSON never supplies tenant/repository. No network or LangGraph dependency.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import re
import sqlite3

SCHEMA = "CAPITAL_AI_OFFLINE_TASK_SCOPE@1"
TASK_KEYS = frozenset(("schema", "task_id", "domain", "query"))
TASK_SCHEMA = "CAPITAL_AI_OFFLINE_RESEARCH@1"


def _digest(data: dict) -> str:
    payload = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


@dataclass(frozen=True)
class BoundOfflineTask:
    thread_id: str
    binding_digest: str


@dataclass(frozen=True)
class TrustedOfflineScope:
    """Only a trusted caller chooses this namespace; NEVER task/PR/RAG text."""
    tenant_id: str
    repository: str

    def __post_init__(self) -> None:
        if (not isinstance(self.tenant_id, str)
                or not re.fullmatch(r"[a-z][a-z0-9-]{0,47}", self.tenant_id)
                or not isinstance(self.repository, str)
                or not re.fullmatch(r"[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}/[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}", self.repository)
                or any(part in (".", "..") for part in self.repository.split("/"))):
            raise ValueError("invalid trusted offline scope")

    def bind(self, task: object) -> BoundOfflineTask:
        if (not isinstance(task, dict) or set(task) != TASK_KEYS
                or task.get("schema") != TASK_SCHEMA
                or not isinstance(task.get("task_id"), str)
                or not re.fullmatch(r"[a-zA-Z0-9._:-]{1,96}", task["task_id"])
                or task.get("domain") not in ("PLATFORM", "TRUST", "MARKET", "GROWTH", "PRODUCT")
                or not isinstance(task.get("query"), str)
                or not 1 <= len(task["query"]) <= 300):
            raise ValueError("invalid offline task contract")
        identity = {"schema": SCHEMA, "mode": "OFFLINE", "tenant": self.tenant_id,
                    "repository": self.repository, "task_id": task["task_id"]}
        thread_id = "research-" + _digest(identity)[:56]
        fingerprint = _digest({**identity, "domain": task["domain"], "query": task["query"]})
        return BoundOfflineTask(thread_id, fingerprint)


def bind_checkpoint(conn: sqlite3.Connection, binding_digest: str) -> None:
    """Called under checkpoint_store's exclusive lock before graph restore.

    Reject copied checkpoint DBs and altered same-ID tasks. Unbound legacy
    checkpoints are never silently promoted into the new scoped namespace.
    """
    if not isinstance(binding_digest, str) or not re.fullmatch(r"[0-9a-f]{64}", binding_digest):
        raise ValueError("invalid offline binding digest")
    conn.execute("CREATE TABLE IF NOT EXISTS capital_offline_scope ("
                 "id INTEGER PRIMARY KEY CHECK (id = 1), digest TEXT NOT NULL)")
    rows = conn.execute("SELECT id, digest FROM capital_offline_scope").fetchall()
    if len(rows) > 1 or any(row[0] != 1 for row in rows):
        raise ValueError("invalid offline checkpoint binding")
    if rows:
        if rows[0][1] != binding_digest:
            raise ValueError("offline checkpoint scope mismatch")
        return
    # A legacy DB with real checkpoints must not be adopted without proof.
    existing = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='checkpoints'").fetchone()
    if existing and conn.execute("SELECT 1 FROM checkpoints LIMIT 1").fetchone():
        raise ValueError("unbound legacy checkpoint denied")
    conn.execute("INSERT INTO capital_offline_scope (id, digest) VALUES (1, ?)", (binding_digest,))
    conn.commit()
