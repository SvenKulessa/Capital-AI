"""Offline-only, non-authorizing tenant/repository/task checkpoint identity.

This module does not create tenant credentials, grants, network calls, or a
second scheduler. Identity is bound to the trusted host's scope, not PR text.
"""
from __future__ import annotations

import hashlib
import json
import math
import re

_SCOPE = re.compile(r"[a-z0-9][a-z0-9._-]{0,63}\Z", re.ASCII)
_REPO = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,99}/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\Z", re.ASCII)
_TASK = re.compile(r"[A-Za-z0-9._:-]{1,96}\Z", re.ASCII)


def _check_json_shape(value: object, depth: int = 0) -> None:
    """Reject non-JSON keys, ambiguous key coercion and unbounded nesting."""
    if depth > 12:
        raise ValueError("checkpoint payload nesting exceeds limit")
    if value is None or type(value) in (str, bool, int):
        return
    if type(value) is float:
        if not math.isfinite(value):
            raise ValueError("non-finite checkpoint number")
        return
    if type(value) is list:
        for item in value:
            _check_json_shape(item, depth + 1)
        return
    if type(value) is dict:
        if any(type(key) is not str for key in value):
            raise ValueError("checkpoint object keys must be strings")
        for item in value.values():
            _check_json_shape(item, depth + 1)
        return
    raise ValueError("unsupported checkpoint JSON value")


def scoped_thread_id(*, tenant: str, repository: str, task_id: str,
                     payload: dict, mode: str = "OFFLINE") -> str:
    """Derive a stable, namespace-separated SQLite thread ID.

    Scope is trusted host input. Payload is canonical JSON, not authority.
    Same scope+task+payload replays; any different scope or payload gets a
    different thread. The caller must not accept an arbitrary DB path.
    """
    if (not isinstance(tenant, str) or not _SCOPE.fullmatch(tenant)
            or not isinstance(repository, str) or not _REPO.fullmatch(repository)
            or not isinstance(task_id, str) or not _TASK.fullmatch(task_id)
            or mode != "OFFLINE" or not isinstance(payload, dict)):
        raise ValueError("invalid offline checkpoint scope")
    _check_json_shape(payload)
    try:
        canonical = json.dumps(
            {"schema": "CAPITAL_AI_OFFLINE_CHECKPOINT_SCOPE@1",
             "tenant": tenant, "repository": repository,
             "task": task_id, "mode": mode, "payload": payload},
            ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False,
        ).encode("ascii")
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError("invalid offline checkpoint payload") from exc
    if len(canonical) > 4096:
        raise ValueError("offline checkpoint payload too large")
    return "offline-" + hashlib.sha256(canonical).hexdigest()[:40]
