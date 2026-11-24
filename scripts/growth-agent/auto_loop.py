"""Bounded, evidence-gated LangGraph agent execution loop for trusted adapters.

No provider, GitHub, Render, database or shell tools are invoked by this module.
Only explicitly injected trusted actions can cause side effects. Not a scheduler.
"""
from __future__ import annotations

from dataclasses import dataclass
import os
import re
from typing import TypedDict

from domain_profile_binding import BoundDomainTask, REPOSITORY, bind_domain_task, load_domain_profiles

os.environ["LANGGRAPH_STRICT_MSGPACK"] = "true"
os.environ["LANGSMITH_TRACING"] = "false"
os.environ["LANGCHAIN_TRACING_V2"] = "false"

from langgraph.graph import START, END, StateGraph
from langgraph.checkpoint.memory import InMemorySaver


class LoopState(TypedDict, total=False):
    task_id: str
    domain: str
    query: str
    bundle_sha256: str
    profile_sha256: str
    profile_skills: list[str]
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


def build_graph(actions, authority: Authority, *, checkpointer=None, interrupt_after=None,
                bound_task: BoundDomainTask | None = None, repo_root=None):
    """Compile LangGraph without granting authority to runtime inputs.

    Trusted actions: analyze, implement, test, repair, evidence, merge,
    observe_deployment, verify_runtime. Methods receive a snapshot of state
    and return dicts; missing/raising methods fail closed.
    """
    if bound_task is not None and (
            not isinstance(bound_task, BoundDomainTask) or repo_root is None
    ):
        raise ValueError("bound graph requires validated task and repository source")

    def binding_valid(state) -> bool:
        if bound_task is None:
            return True
        if not bound_task.matches_state(state):
            return False
        try:
            current = load_domain_profiles(repo_root)
            route = current["domains"][bound_task.domain]
            return (
                current["bundle_sha256"] == bound_task.bundle_sha256
                and route["profile_sha256"] == bound_task.profile_sha256
                and tuple(route["skills"]) == bound_task.skills
                and not current["permission_expansion"]
                and not current["provider_access"]
            )
        except (OSError, ValueError, KeyError, TypeError):
            return False

    def call(method, state):
        # Check the exact source-bound task before EVERY trusted adapter call,
        # including after an interrupted or resumed checkpoint.
        if not binding_valid(state):
            return {}
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
        if not binding_valid(state):
            return event(state, "task_binding_denied", status="BLOCKED")
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
        # Recheck authority and the current retry budget at the side-effect boundary:
        # a resumed checkpoint may have been routed under older permissions.
        if authority.read_only or not authority.allow_changes:
            return event(state, "repair_denied", status="BLOCKED")
        if state.get("attempts", 0) >= authority.max_repairs:
            return event(state, "repair_budget_exhausted", status="BLOCKED")
        attempts = state.get("attempts", 0) + 1
        ok = call("repair", {**state, "attempts": attempts}).get("ok") is True
        return event(state, "repair", attempts=attempts, status="REPAIRED" if ok else "BLOCKED")

    def evidence(state):
        if not binding_valid(state):
            return event(state, "task_binding_denied", status="BLOCKED")
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
        # A resumed checkpoint must not inherit a revoked merge authorization.
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
    return builder.compile(checkpointer=checkpointer if checkpointer is not None else InMemorySaver(),
                           interrupt_after=interrupt_after)


def execute(actions, authority: Authority, task_id: str) -> LoopState:
    if not isinstance(task_id, str) or not re.fullmatch(r"[a-zA-Z0-9._:-]{1,96}", task_id):
        raise ValueError("task_id must be a short non-secret identifier")
    return build_graph(actions, authority).invoke(
        {"task_id": task_id, "attempts": 0, "history": []},
        {"configurable": {"thread_id": task_id}, "recursion_limit": 24},
    )



def execute_durable(actions, authority: Authority, task_id: str, db_path: str) -> LoopState:
    """Single-writer SQLite-backed LangGraph checkpoint and crash-safe continuation.

    A completed thread is returned without repeating actions; a pending checkpoint
    resumes with None. External merge adapter must reconcile a remote merge made
    immediately before an interrupted checkpoint write (idempotent GET-first).
    """
    import fcntl
    import sqlite3
    import stat
    from pathlib import Path
    from langgraph.checkpoint.sqlite import SqliteSaver

    if not isinstance(task_id, str) or not re.fullmatch(r"[a-zA-Z0-9._:-]{1,96}", task_id):
        raise ValueError("invalid task id")
    path = Path(db_path)
    if not path.is_absolute() or path.suffix != ".sqlite3":
        raise ValueError("checkpoint path must be an absolute .sqlite3 file")
    parent = path.parent.resolve(strict=True)
    mode = parent.stat().st_mode
    if not stat.S_ISDIR(mode) or mode & 0o077:
        raise ValueError("checkpoint directory must be private")
    if path.is_symlink() or path.with_name(path.name + ".lock").is_symlink():
        raise ValueError("checkpoint symlinks forbidden")
    os_flags = os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0)
    lockfd = os.open(str(path) + ".lock", os_flags, 0o600)
    try:
        # Nonblocking lock: never concurrently execute a thread from two workers.
        fcntl.flock(lockfd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if os.stat(lockfd).st_mode & 0o077:
            raise ValueError("checkpoint lock permissions are not private")
        fd = os.open(path, os_flags, 0o600)
        try:
            if os.fstat(fd).st_mode & 0o077:
                raise ValueError("checkpoint file permissions are not private")
        finally:
            os.close(fd)
        conn = sqlite3.connect(path, check_same_thread=False, timeout=5.0)
        try:
            saver = SqliteSaver(conn)
            graph = build_graph(actions, authority, checkpointer=saver)
            config = {"configurable": {"thread_id": task_id}, "recursion_limit": 24}
            snapshot = graph.get_state(config)
            if snapshot and snapshot.values:
                # No automatic restart after a completed/blocked task.
                if not snapshot.next:
                    return snapshot.values
                # Resume pending checkpoint. Do not restart from START.
                return graph.invoke(None, config)
            return graph.invoke({"task_id": task_id, "attempts": 0, "history": []}, config)
        finally:
            conn.close()
    finally:
        fcntl.flock(lockfd, fcntl.LOCK_UN)
        os.close(lockfd)



def execute_bound_readonly(actions, repo_root, task: dict, *,
                           tenant: str = "owner-local",
                           repository: str = REPOSITORY) -> LoopState:
    """Read-only use of the SAME existing execution graph and offline identity.

    Does not construct an additional orchestrator or admit ONLINE/customer
    permissions. No profile attribute can override Authority(read_only=True).
    """
    binding = bind_domain_task(
        repo_root, tenant=tenant, repository=repository, task=task
    )
    state = build_graph(
        actions, Authority(read_only=True), bound_task=binding, repo_root=repo_root
    ).invoke(
        binding.initial_state(),
        {"configurable": {"thread_id": binding.thread_id}, "recursion_limit": 24},
    )
    if not binding.matches_state(state) or not _bound_sources_current(repo_root, binding):
        raise ValueError("stale bound execution result")
    return state


def _bound_sources_current(repo_root, binding: BoundDomainTask) -> bool:
    try:
        current = load_domain_profiles(repo_root)
        route = current["domains"][binding.domain]
        return (
            current["bundle_sha256"] == binding.bundle_sha256
            and route["profile_sha256"] == binding.profile_sha256
            and tuple(route["skills"]) == binding.skills
        )
    except (OSError, ValueError, KeyError, TypeError):
        return False


def execute_bound_durable_readonly(actions, repo_root, task: dict, db_path: str, *,
                                   tenant: str = "owner-local",
                                   repository: str = REPOSITORY) -> LoopState:
    """Reuse the existing SQLite lock and file binding; fail closed on replay."""
    from checkpoint_store import execute_durable_graph

    binding = bind_domain_task(
        repo_root, tenant=tenant, repository=repository, task=task
    )
    state = execute_durable_graph(
        lambda saver: build_graph(
            actions, Authority(read_only=True), checkpointer=saver,
            bound_task=binding, repo_root=repo_root,
        ),
        binding.thread_id, db_path, binding.initial_state(),
        enforce_offline_binding=True,
    )
    if not binding.matches_state(state) or not _bound_sources_current(repo_root, binding):
        raise ValueError("stale bound checkpoint result")
    return state
