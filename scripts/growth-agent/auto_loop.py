"""Bounded, evidence-gated LangGraph agent execution loop for trusted adapters.

No provider, GitHub, Render, database or shell tools are invoked by this module.
Only explicitly injected trusted actions can cause side effects. Not a scheduler.
"""
from __future__ import annotations

from dataclasses import dataclass
import os
import re
from typing import TypedDict

os.environ["LANGSMITH_TRACING"] = "false"
os.environ["LANGCHAIN_TRACING_V2"] = "false"
os.environ["LANGGRAPH_STRICT_MSGPACK"] = "true"

from langgraph.graph import START, END, StateGraph
from langgraph.checkpoint.memory import InMemorySaver


class LoopState(TypedDict, total=False):
    task_id: str
    status: str
    attempts: int
    evidence: dict
    checks_passed: bool
    merge_sha: str
    observed_sha: str
    history: list[str]


@dataclass(frozen=True)
class Authority:
    """Trusted caller-supplied, immutable scope. Never derive from PR text or state."""
    allow_changes: bool = False
    allow_merge: bool = False
    observe_existing_deploy: bool = False
    read_only: bool = False
    max_repairs: int = 2

    def __post_init__(self):
        if not 0 <= self.max_repairs <= 3:
            raise ValueError("max_repairs must be between 0 and 3")


REQUIRED_CHECKS = ("Docker Security Gate", "Domain Governance")
EVIDENCE_KEYS = ("base_sha", "head_sha", "checks", "applicable_checks_green",
                 "mergeable", "trust_boundaries_clear", "scope_complete",
                 "current_main", "no_active_hold", "run_ids")


def _sha(value: object) -> bool:
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{40}", value) is not None


def merge_evidence_verified(evidence: object) -> bool:
    """Positive evidence only. Missing/failed/cancelled/skipped is never approval."""
    if not isinstance(evidence, dict):
        return False
    if not (_sha(evidence.get("base_sha")) and _sha(evidence.get("head_sha"))):
        return False
    checks = evidence.get("checks")
    if not isinstance(checks, dict) or any(checks.get(check) != "success" for check in REQUIRED_CHECKS):
        return False
    return all(evidence.get(key) is True for key in
               ("applicable_checks_green", "mergeable", "trust_boundaries_clear",
                "scope_complete", "current_main", "no_active_hold"))


def build_graph(actions, authority: Authority, *, checkpointer=None):
    """Compile LangGraph without granting authority to runtime inputs.

    Trusted actions: analyze, implement, test, repair, evidence, merge,
    observe_deployment, verify_runtime. Methods receive a snapshot of state
    and return dicts; missing/raising methods fail closed.
    """
    def call(method, state):
        fn = getattr(actions, method, None)
        if not callable(fn):
            return {}
        try:
            outcome = fn(dict(state))
            return outcome if isinstance(outcome, dict) else {}
        except Exception:
            # Deliberately never serialize error messages, provider payloads or secrets.
            return {}

    def event(state, step, **updates):
        return {"history": [*state.get("history", []), step], **updates}

    def analyze(state):
        ok = call("analyze", state).get("ok") is True
        return event(state, "analyze", status="ANALYZED" if ok else "BLOCKED")

    def implement(state):
        if authority.read_only or not authority.allow_changes:
            return event(state, "write_denied", status="BLOCKED")
        ok = call("implement", state).get("ok") is True
        return event(state, "implement", status="IMPLEMENTED" if ok else "BLOCKED")

    def test(state):
        passed = call("test", state).get("passed") is True
        return event(state, "test", checks_passed=passed, status="TESTED" if passed else "TEST_FAILED")

    def repair(state):
        attempts = state.get("attempts", 0) + 1
        ok = call("repair", {**state, "attempts": attempts}).get("ok") is True
        return event(state, "repair", attempts=attempts, status="REPAIRED" if ok else "BLOCKED")

    def evidence(state):
        raw = call("evidence", state)
        filtered = {key: raw[key] for key in EVIDENCE_KEYS if key in raw}
        if authority.read_only:
            status = "READ_ONLY_COMPLETE" if state.get("status") == "ANALYZED" else "BLOCKED"
        else:
            status = state.get("status", "NOT_PROVEN")
        return event(state, "evidence", evidence=filtered, status=status)

    def authorize(state):
        if (authority.read_only or not authority.allow_merge
                or state.get("status") != "TESTED"
                or not state.get("checks_passed")
                or not merge_evidence_verified(state.get("evidence"))):
            return event(state, "merge_not_authorized", status=(
                state.get("status") if state.get("status") in {"BLOCKED", "READ_ONLY_COMPLETE", "TEST_FAILED"}
                else "MERGE_NOT_PROVEN"))
        return event(state, "merge_authorized", status="MERGE_READY")

    def merge(state):
        # Check authority again: a resumed checkpoint may predate a revoked grant.
        if (authority.read_only or not authority.allow_merge
                or not merge_evidence_verified(state.get("evidence"))):
            return event(state, "merge_denied", status="BLOCKED")
        result = call("merge", state)
        # Adapter must use evidence.head_sha as GitHub's expected_head_sha.
        ok = (result.get("merged") is True and _sha(result.get("sha"))
              and result.get("expected_head_sha") == state["evidence"]["head_sha"])
        return event(state, "merge", status="MERGED" if ok else "BLOCKED",
                     merge_sha=result.get("sha") if ok else "")

    def observe(state):
        # Observe normal main-triggered deployment only; never trigger a manual deploy.
        result = call("observe_deployment", state)
        sha = result.get("deployed_sha")
        ok = result.get("deployed") is True and sha == state.get("merge_sha")
        return event(state, "observe_deployment", status="DEPLOYED" if ok else "DEPLOYMENT_NOT_PROVEN",
                     observed_sha=sha if ok else "")

    def verify(state):
        result = call("verify_runtime", state)
        ok = result.get("verified") is True and result.get("deployed_sha") == state.get("merge_sha")
        return event(state, "verify_runtime", status="VERIFIED" if ok else "NOT_PROVEN")

    def after_analyze(s):
        if s["status"] == "BLOCKED":
            return "end"
        return "evidence" if authority.read_only else ("implement" if authority.allow_changes else "end")

    def after_test(s):
        if s["status"] == "TESTED":
            return "evidence"
        return "repair" if s.get("attempts", 0) < authority.max_repairs else "evidence"

    builder = StateGraph(LoopState)
    for name, node in (("analyze", analyze), ("implement", implement), ("test", test),
                       ("repair", repair), ("evidence", evidence), ("authorize", authorize),
                       ("merge", merge), ("observe", observe), ("verify", verify)):
        builder.add_node(name, node)
    builder.add_edge(START, "analyze")
    builder.add_conditional_edges("analyze", after_analyze,
                                  {"end": END, "evidence": "evidence", "implement": "implement"})
    builder.add_conditional_edges("implement",
                                  lambda s: "test" if s["status"] == "IMPLEMENTED" else "evidence",
                                  {"test": "test", "evidence": "evidence"})
    builder.add_conditional_edges("test", after_test, {"repair": "repair", "evidence": "evidence"})
    builder.add_conditional_edges("repair",
                                  lambda s: "test" if s["status"] == "REPAIRED" else "evidence",
                                  {"test": "test", "evidence": "evidence"})
    builder.add_edge("evidence", "authorize")
    builder.add_conditional_edges("authorize",
                                  lambda s: "merge" if s["status"] == "MERGE_READY" else "end",
                                  {"merge": "merge", "end": END})
    builder.add_conditional_edges("merge",
                                  lambda s: "observe" if s["status"] == "MERGED" and authority.observe_existing_deploy else "end",
                                  {"observe": "observe", "end": END})
    builder.add_conditional_edges("observe",
                                  lambda s: "verify" if s["status"] == "DEPLOYED" else "end",
                                  {"verify": "verify", "end": END})
    builder.add_edge("verify", END)
    return builder.compile(checkpointer=checkpointer if checkpointer is not None else InMemorySaver())


def execute(actions, authority: Authority, task_id: str) -> LoopState:
    if not isinstance(task_id, str) or not re.fullmatch(r"[a-zA-Z0-9._:-]{1,96}", task_id):
        raise ValueError("task_id must be a short non-secret identifier")
    return build_graph(actions, authority).invoke(
        {"task_id": task_id, "attempts": 0, "history": []},
        {"configurable": {"thread_id": task_id}, "recursion_limit": 24},
    )


def execute_durable(actions, authority: Authority, task_id: str, checkpoint_path: str):
    """Execute/resume a single trusted task with a private local SQLite checkpointer.

    The per-process lock prevents two solo-maintainer runners from acting on the
    same database concurrently. Reinvocation of a finished task never replays
    provider mutations. Interrupted tool calls must still be reconciled by the
    trusted adapter (especially GitHub merge), because external APIs and SQLite
    do not share an atomic transaction.
    """
    from contextlib import closing
    import fcntl
    from pathlib import Path
    import stat
    from langgraph.checkpoint.sqlite import SqliteSaver

    if not isinstance(task_id, str) or not re.fullmatch(r"[a-zA-Z0-9._:-]{1,96}", task_id):
        raise ValueError("invalid non-secret task_id")
    if not isinstance(checkpoint_path, str) or not checkpoint_path:
        raise ValueError("an explicit checkpoint path is required")
    path = Path(checkpoint_path)
    if not path.is_absolute() or path.suffix != ".sqlite" or path.is_symlink():
        raise ValueError("checkpoint must be an absolute, non-symlink .sqlite file")
    directory = path.parent
    if directory.is_symlink():
        raise ValueError("checkpoint parent must not be a symlink")
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    directory_mode = stat.S_IMODE(directory.stat().st_mode)
    if directory_mode & 0o077 or directory.stat().st_uid != os.getuid():
        raise PermissionError("checkpoint directory must be private to the current user")
    for item in (path, directory / (path.name + ".lock")):
        if item.is_symlink():
            raise ValueError("checkpoint lock/database symlink is forbidden")

    def private_file(candidate):
        flags = os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(candidate, flags, 0o600)
        os.fchmod(descriptor, 0o600)
        return descriptor

    lock_fd = private_file(str(path) + ".lock")
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        database_fd = private_file(path)
        os.close(database_fd)
        with SqliteSaver.from_conn_string(str(path)) as saver:
            graph = build_graph(actions, authority, checkpointer=saver)
            config = {"configurable": {"thread_id": task_id}, "recursion_limit": 24}
            previous = graph.get_state(config)
            if previous.values:
                if not previous.next:
                    # A completed graph (including BLOCKED) is immutable by default.
                    # New CI/evidence requires a new task_id, not a replayed merge.
                    return previous.values
                return graph.invoke(None, config)
            return graph.invoke(
                {"task_id": task_id, "attempts": 0, "history": []}, config
            )
    finally:
        os.close(lock_fd)
