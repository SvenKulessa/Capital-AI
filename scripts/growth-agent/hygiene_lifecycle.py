"""Reference-only lifecycle evidence for the existing execution graph."""
from datetime import datetime
import re

SCHEMA = "CAPITAL_AI_HYGIENE_LIFECYCLE@1"
HANDOFF = "CAPITAL_AI_HYGIENE_HANDOFF@1"
METHOD = "doc-drift-claims-v1"
KEYS = frozenset(("contractVersion", "threadId", "runId", "sourceSha",
                  "observedAt", "scopeDigest", "sourceDigest", "contentDigest",
                  "methodId", "checked", "affected", "missing", "score",
                  "coverage", "status", "authorityGranted"))


def valid_handoff(value, task_id):
    if type(value) is not dict or set(value) != KEYS:
        return None
    if (value["contractVersion"] != HANDOFF or value["methodId"] != METHOD
            or value["status"] != "NOT_PROVEN" or value["authorityGranted"] is not False):
        return None
    if not isinstance(task_id, str) or not re.fullmatch(r"[A-Za-z0-9._:-]{1,96}", task_id):
        return None
    thread = task_id if re.fullmatch(r"offline-[a-f0-9]{40}", task_id) else None
    if value["threadId"] != thread:
        return None
    for field, size in (("sourceSha", 40), ("scopeDigest", 64), ("sourceDigest", 64),
                        ("contentDigest", 64)):
        if not isinstance(value[field], str) or not re.fullmatch(r"[a-f0-9]{%d}" % size, value[field]):
            return None
    if value["runId"] != "hygiene-" + value["sourceDigest"]:
        return None
    at = value["observedAt"]
    if not isinstance(at, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z", at):
        return None
    try:
        datetime.fromisoformat(at.replace("Z", "+00:00"))
    except ValueError:
        return None
    for field in ("checked", "affected", "missing"):
        if type(value[field]) is not int or not 0 <= value[field] <= 1_000_000:
            return None
    n, affected = value["checked"], value["affected"]
    if affected > n or type(value["coverage"]) is not int:
        return None
    if n == 0:
        if value["score"] is not None or value["coverage"] != 0:
            return None
    elif (type(value["score"]) is not int or value["coverage"] != 15
          or value["score"] != (200 * (n - affected) + n) // (2 * n)):
        return None
    return dict(value)


def observe_handoff(observer, phase, task_id):
    if observer is None:
        return None
    try:
        return valid_handoff(observer(phase, task_id), task_id)
    except Exception:
        return None


def finish_lifecycle(task_id, baseline, final, readback):
    baseline = valid_handoff(baseline, task_id)
    final = valid_handoff(final, task_id)
    readback = valid_handoff(readback, task_id)
    fields = ("sourceSha", "scopeDigest", "contentDigest", "methodId",
              "checked", "affected", "missing", "score", "coverage")
    readback_match = bool(final and readback
                          and readback["observedAt"] >= final["observedAt"]
                          and readback["sourceDigest"] != final["sourceDigest"]
                          and all(final[k] == readback[k] for k in fields))
    comparable = bool(baseline and final and readback_match
                      and baseline["observedAt"] < final["observedAt"]
                      and baseline["sourceDigest"] != final["sourceDigest"]
                      and baseline["scopeDigest"] == final["scopeDigest"]
                      and baseline["methodId"] == final["methodId"]
                      and baseline["checked"] == final["checked"]
                      and baseline["missing"] == final["missing"]
                      and baseline["score"] is not None and final["score"] is not None)
    delta = final["score"] - baseline["score"] if comparable else None
    return {"schema": SCHEMA, "status": "NOT_PROVEN", "authorityGranted": False,
            "baseline": baseline, "final": final, "readback": readback,
            "readbackMatch": readback_match, "comparable": comparable,
            "deltaPoints": delta, "regression": delta < 0 if comparable else None}
