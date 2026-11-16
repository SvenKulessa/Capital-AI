"""Offline, fail-closed multi-agent RAG slice for the isolated LangGraph worker.

No LLM, network, provider, merge, publish, scheduler or autonomous tool authority.
Documents are explicitly injected trusted local data; retrieved text is untrusted evidence.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import stat
from typing import TypedDict

os.environ["LANGGRAPH_STRICT_MSGPACK"] = "true"
os.environ["LANGSMITH_TRACING"] = "false"
os.environ["LANGCHAIN_TRACING_V2"] = "false"

from langgraph.graph import START, END, StateGraph
from auto_loop import Authority, execute_durable


class RagState(TypedDict, total=False):
    task_id: str
    question: str
    documents: list[dict]
    plan: list[str]
    evidence: list[dict]
    answer: str
    status: str


def validate_private_root(root: Path, *, require_mount: bool = True) -> dict:
    """Inspect only: never create or chmod host directories, never print secrets."""
    root = Path(root)
    if not root.is_absolute() or root.is_symlink():
        raise ValueError("worker root must be absolute and not a symlink")
    for path in (root, root / "checkpoints", root / "approvals"):
        info = path.lstat()
        if (not stat.S_ISDIR(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o700
                or info.st_uid != os.geteuid() or path.is_symlink()):
            raise PermissionError("worker directory ownership or mode invalid")
    if require_mount and not os.path.ismount(root):
        raise PermissionError("persistent worker mount not verified")
    return {"status": "LOCAL_PERMISSIONS_VERIFIED",
            "mount": "LOCAL_MOUNT_PRESENT" if os.path.ismount(root) else "NOT_PROVEN",
            "providerPersistence": "NOT_PROVEN"}


def _terms(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]{3,}", text.lower()))


def build_rag_graph():
    """Three deterministic agents: plan -> retrieve -> evidence review.

    A document never supplies commands, tool calls, permissions or graph routing.
    """
    def plan(state: RagState):
        q = state["question"]
        if not isinstance(q, str) or not 1 <= len(q) <= 512:
            return {"plan": [], "status": "BLOCKED"}
        return {"plan": ["retrieve_allowlisted_documents", "review_citations"],
                "status": "PLANNED"}

    def retrieve(state: RagState):
        if state["status"] == "BLOCKED":
            return {"evidence": []}
        docs = state.get("documents", [])
        if not isinstance(docs, list) or len(docs) > 32:
            return {"evidence": [], "status": "BLOCKED"}
        terms = _terms(state["question"])
        scored = []
        for doc in docs:
            if not isinstance(doc, dict) or set(doc) != {"id", "text"}:
                return {"evidence": [], "status": "BLOCKED"}
            identifier, content = doc["id"], doc["text"]
            if (not isinstance(identifier, str)
                    or not re.fullmatch(r"[a-zA-Z0-9._:-]{1,80}", identifier)
                    or not isinstance(content, str) or len(content) > 8000):
                return {"evidence": [], "status": "BLOCKED"}
            score = len(terms & _terms(content))
            if score:
                scored.append((score, identifier, content))
        scored.sort(key=lambda x: (-x[0], x[1]))
        evidence = [{"id": identifier, "score": score,
                     "sha256": hashlib.sha256(content.encode("utf-8")).hexdigest(),
                     "excerpt": content[:320]} for score, identifier, content in scored[:3]]
        return {"evidence": evidence, "status": "RETRIEVED" if evidence else "NOT_PROVEN"}

    def review(state: RagState):
        if state["status"] != "RETRIEVED":
            return {"answer": "No grounded evidence available.", "status": "NOT_PROVEN"}
        refs = ", ".join(item["id"] + "@" + item["sha256"][:12]
                         for item in state["evidence"])
        # No model-generated claims or execution of retrieved instructions.
        return {"answer": "Relevant source evidence: " + refs,
                "status": "EVIDENCE_ONLY"}

    builder = StateGraph(RagState)
    builder.add_node("planner", plan)
    builder.add_node("retriever", retrieve)
    builder.add_node("reviewer", review)
    builder.add_edge(START, "planner")
    builder.add_edge("planner", "retriever")
    builder.add_edge("retriever", "reviewer")
    builder.add_edge("reviewer", END)
    return builder.compile()


def run_offline(question: str, documents: list[dict]) -> dict:
    return build_rag_graph().invoke({"question": question, "documents": documents})


def worker_readback(root: Path = Path("/var/lib/capital-ai-agent")) -> dict:
    """Read-only readiness; a local mount does not prove Render disk persistence."""
    try:
        return validate_private_root(root)
    except (OSError, ValueError) as exc:
        return {"status": "BLOCKED", "reason": type(exc).__name__,
                "providerPersistence": "NOT_PROVEN"}


if __name__ == "__main__":
    print(json.dumps(worker_readback(), sort_keys=True))
