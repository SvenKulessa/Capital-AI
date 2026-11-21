"""Digest-only licensed Context Round on the existing pinned offline LangGraph.

Input originates only from the separately trusted JS round projection. The caller
must refresh rights and consent for each invocation. No provider, LLM or publish.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import stat

os.environ["LANGSMITH_TRACING"] = "false"
os.environ["LANGCHAIN_TRACING_V2"] = "false"
os.environ["LANGGRAPH_STRICT_MSGPACK"] = "true"

from checkpoint_store import execute_durable_graph

PROJECTION = "CAPITAL_AI_LICENSED_GRAPH_PROJECTION@1"
ROUND = "CAPITAL_AI_LICENSED_CONTEXT_ROUND@1"
HEX = re.compile(r"^[a-f0-9]{64}$")
IDENT = re.compile(r"^[a-z0-9][a-z0-9_-]{3,79}$")
TASK = re.compile(r"^[A-Za-z0-9._:-]{1,96}$")
KEYS = {"contractVersion", "roundContractVersion", "tenantId", "roundSha256",
        "channel", "contentId", "imageSha256", "logoSha256", "sources",
        "rejectedSourceCount", "candidates", "rejectedConsentCount",
        "publicationState", "publicPublishAllowed", "autoPromote",
        "providerCalls", "publishCalls", "projectionSha256"}


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False,
        separators=(",", ":"), allow_nan=False).encode("utf-8")).hexdigest()


def validate_projection(p):
    if not isinstance(p, dict) or set(p) != KEYS:
        raise ValueError("GRAPH_PROJECTION_FIELDS_INVALID")
    if (p["contractVersion"] != PROJECTION or p["roundContractVersion"] != ROUND
            or not isinstance(p["tenantId"], str) or not IDENT.fullmatch(p["tenantId"])
            or p["channel"] not in ("X", "INSTAGRAM")
            or p["contentId"] != ("CAP-GROW-005" if p["channel"] == "X" else "CAP-GROW-007")
            or any(not isinstance(p[k], str) or not HEX.fullmatch(p[k])
                   for k in ("roundSha256", "imageSha256", "logoSha256", "projectionSha256"))
            or p["publicationState"] != "DRAFT_ONLY"
            or p["publicPublishAllowed"] is not False or p["autoPromote"] is not False
            or type(p["providerCalls"]) is not int or p["providerCalls"] != 0
            or type(p["publishCalls"]) is not int or p["publishCalls"] != 0):
        raise ValueError("GRAPH_AUTHORITY_DENIED")
    if (not isinstance(p["sources"], list) or len(p["sources"]) > 3
            or not isinstance(p["candidates"], list) or len(p["candidates"]) > 10
            or type(p["rejectedSourceCount"]) is not int
            or not 0 <= p["rejectedSourceCount"] <= 3
            or type(p["rejectedConsentCount"]) is not int
            or not 0 <= p["rejectedConsentCount"] <= 80):
        raise ValueError("GRAPH_BATCH_INVALID")
    ids = set()
    for s in p["sources"]:
        if (not isinstance(s, dict) or set(s) !=
                {"id", "sourceSha256", "summarySha256", "rightsEvidenceSha256"}
                or not isinstance(s["id"], str) or not IDENT.fullmatch(s["id"])
                or s["id"] in ids or any(not isinstance(s[k], str) or not HEX.fullmatch(s[k])
                for k in ("sourceSha256", "summarySha256", "rightsEvidenceSha256"))):
            raise ValueError("GRAPH_RIGHTS_OR_SOURCE_INVALID")
        ids.add(s["id"])
    for item in p["candidates"]:
        if (not isinstance(item, dict) or set(item) != {"id", "version", "state"}
                or item["id"] not in ("universe-evidence-3x3", "universe-evidence-3x3-portrait")
                or item["state"] != "CANDIDATE_ONLY"
                or not isinstance(item["version"], str)
                or item["version"] != "1.0.1-candidate." + p["roundSha256"][:12]):
            raise ValueError("GRAPH_TEMPLATE_PROMOTION_DENIED")
    if digest({k: v for k, v in p.items() if k != "projectionSha256"}) != p["projectionSha256"]:
        raise ValueError("GRAPH_REPLAY_TAMPERED")
    return p


def thread_id(tenant, task, projection_sha):
    if not isinstance(task, str) or not TASK.fullmatch(task):
        raise ValueError("GRAPH_TASK_INVALID")
    return "licensed-" + digest([tenant, task, projection_sha])[:40]


def build_graph(expected, *, checkpointer=None):
    from langgraph.graph import START, END, StateGraph

    def bound(s):
        return all(s.get(k) == v for k, v in expected.items())

    def admit(s):
        return {"status": "ADMITTED" if bound(s) else "HOLD",
                "route": ["admission"]}

    def retrieve(s):
        ok = bound(s) and s.get("status") == "ADMITTED" and bool(s["sources"])
        return {"status": "SOURCE_BOUND" if ok else "HOLD",
                "retrievedDigests": [x["sourceSha256"] for x in s["sources"]] if ok else [],
                "route": ["admission", "source_context"]}

    def trust(s):
        ok = bound(s) and s.get("status") == "SOURCE_BOUND" and (
            s.get("retrievedDigests") == [x["sourceSha256"] for x in s["sources"]])
        return {"status": "TRUST_REVIEWED" if ok else "HOLD",
                "route": ["admission", "source_context", "trust"]}

    def quality(s):
        ok = bound(s) and s.get("status") == "TRUST_REVIEWED"
        return {"status": "OFFLINE_DRAFT_VERIFIED" if ok else "HOLD",
                "route": ["admission", "source_context", "trust", "quality"]}

    graph = StateGraph(dict)
    for n, fn in (("admission", admit), ("source_context", retrieve),
                  ("trust", trust), ("quality", quality)):
        graph.add_node(n, fn)
    graph.add_edge(START, "admission")
    graph.add_edge("admission", "source_context")
    graph.add_edge("source_context", "trust")
    graph.add_edge("trust", "quality")
    graph.add_edge("quality", END)
    return graph.compile(checkpointer=checkpointer)


def execute(projection, *, tenant_id, task_id, db_path, refresh_current):
    p = validate_projection(projection)
    # A callback supplied by the trusted caller, never a user-controlled JSON bit.
    if (tenant_id != p["tenantId"] or not callable(refresh_current)
            or refresh_current(p) is not True):
        raise ValueError("GRAPH_TRUSTED_REFRESH_REQUIRED")
    tid = thread_id(tenant_id, task_id, p["projectionSha256"])
    path = Path(db_path)
    if path.name != tid + ".sqlite3":
        raise ValueError("GRAPH_CHECKPOINT_THREAD_MISMATCH")
    run_id = "lcr-" + digest([tid, p["roundSha256"], p["imageSha256"]])[:40]
    initial = {"task_id": tid, "tenantId": tenant_id, "channel": p["channel"],
               "roundSha256": p["roundSha256"], "projectionSha256": p["projectionSha256"],
               "graphRunId": run_id, "sources": p["sources"], "candidates": p["candidates"],
               "rejectedConsentCount": p["rejectedConsentCount"]}
    result = execute_durable_graph(
        lambda saver: build_graph(initial, checkpointer=saver),
        tid, db_path, initial,
    )
    meta = path.stat()
    if not stat.S_ISREG(meta.st_mode) or stat.S_IMODE(meta.st_mode) != 0o600:
        raise ValueError("GRAPH_CHECKPOINT_READBACK_UNSAFE")
    from langgraph.checkpoint.sqlite import SqliteSaver
    conn = sqlite3.connect(path, check_same_thread=False, timeout=5.0)
    try:
        snapshot = build_graph(initial, checkpointer=SqliteSaver(conn)).get_state(
            {"configurable": {"thread_id": tid}})
        if not snapshot or snapshot.next or snapshot.values != result:
            raise ValueError("GRAPH_CHECKPOINT_READBACK_FAILED")
    finally:
        conn.close()
    if (any(result.get(k) != v for k, v in initial.items())
            or result.get("route") != ["admission", "source_context", "trust", "quality"]
            or result.get("status") != ("OFFLINE_DRAFT_VERIFIED" if p["sources"] else "HOLD")):
        raise ValueError("GRAPH_REPLAY_MISMATCH")
    return {"contractVersion": ROUND, "tenantId": tenant_id, "graphRunId": run_id,
            "checkpointThread": tid, "roundSha256": p["roundSha256"],
            "projectionSha256": p["projectionSha256"], "status": result["status"],
            "graphExecution": "LOCAL_CHECKPOINT_READBACK_VERIFIED",
            "ragExecution": "NOT_PROVEN", "sourcesAdmitted": len(p["sources"]),
            "templateCandidates": len(p["candidates"]), "publicationState": "DRAFT_ONLY",
            "publicPublishAllowed": False, "autoPromote": False,
            "providerCalls": 0, "publishCalls": 0}
