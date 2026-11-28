"""Strict non-authorizing JSON ingress for existing offline research tasks."""
from __future__ import annotations

import json

MAX_TASK_BYTES = 2048
BIDI_CONTROLS = frozenset("\u061c\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069")


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate offline task property")
        result[key] = value
    return result


def _reject_constant(_value):
    raise ValueError("invalid offline task number")


def _safe_text(value: str) -> bool:
    return not any(c in BIDI_CONTROLS or ord(c) < 32 and c not in "\t\n\r"
                   or 0x7f <= ord(c) <= 0x9f or 0xd800 <= ord(c) <= 0xdfff
                   for c in value)


def valid_research_query(value: object) -> bool:
    """Shared constraint for file ingress and direct graph task binding."""
    return type(value) is str and 1 <= len(value) <= 300 and _safe_text(value)


def _check_text(value, depth=0):
    if depth > 12:
        raise ValueError("offline task nesting exceeds limit")
    if isinstance(value, str) and not _safe_text(value):
        raise ValueError("unsafe offline task text")
    if isinstance(value, dict):
        for key, item in value.items():
            _check_text(key, depth + 1)
            _check_text(item, depth + 1)
    elif isinstance(value, list):
        for item in value:
            _check_text(item, depth + 1)


def decode_offline_task(raw: bytes) -> dict:
    """Decode untrusted UTF-8 without ambiguous keys or unsafe controls.

    Schema and authorization checks remain with the existing worker and graph.
    Also accepts the existing ACOPY event envelope for subsequent validation.
    """
    if type(raw) is not bytes or not 1 <= len(raw) <= MAX_TASK_BYTES:
        raise ValueError("offline task size invalid")
    try:
        task = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object,
                          parse_constant=_reject_constant)
        if not isinstance(task, dict):
            raise ValueError("offline task must be an object")
        _check_text(task)
        return task
    except (UnicodeError, RecursionError) as exc:
        raise ValueError("invalid offline task JSON") from exc
