"""Offline, tenant-scoped CI failure learning prototype for SOLO_MAINTAINER_FLOW@2.

No network, model calls, shell execution, code changes, merges, or deployments.
Only a separately authorized, trusted reviewer may submit verified outcomes.
Never feed raw CI logs, issue text or provider responses to a checkpoint.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import stat
from typing import TypedDict

SCHEMA = "CAPITAL_AI_FAILURE_LEARNING@1"
REQUIRED_CHECKS = ("Docker Security Gate", "Domain Governance")
SHA = re.compile(r"[a-f0-9]{40}\Z")
SCOPE = re.compile(r"[A-Za-z0-9_.-]{1,72}/[A-Za-z0-9_.-]{1,72}\Z")
HEX = re.compile(r"[a-f0-9]{64}\Z")

# Fixed-order categories; output intentionally contains no captured error text.
CATEGORIES = (
    ("CI_TRANSPORT", re.compile(r"(?:HTTP\s*431|request header fields too large|docker context transfer)", re.I)),
    ("TYPECHECK", re.compile(r"(?:\berror TS\d{4}\b|typecheck failed|typescript compilation failed)", re.I)),
    ("TEST_ASSERTION", re.compile(r"(?:\bAssertionError\b|\bAssertionFailedError\b|\bnot ok \d+\b)", re.I)),
    ("DEPENDENCY", re.compile(r"(?:unable to resolve dependency|dependency resolution failed|npm ERR! ERESOLVE)", re.I)),
    ("NETWORK", re.compile(r"(?:EAI_AGAIN|ENOTFOUND|temporary failure in name resolution)", re.I)),
)

# Curated, non-executable playbooks. Learning ranks *only* these reviewed keys.
PLAYBOOKS = {
    "CI_TRANSPORT": ("inspect_ci_transport", "Check CI context transfer sizing, header limits and retry evidence; preserve the existing security scan."),
    "TYPECHECK": ("inspect_type_errors", "Reproduce the exact compiler diagnostic locally and test the smallest type-safe change."),
    "TEST_ASSERTION": ("inspect_test_regression", "Reproduce the failed assertion with its existing fixture before proposing a patch."),
    "DEPENDENCY": ("inspect_dependency_lock", "Compare dependency constraints and existing lockfiles; do not relax supply-chain gates."),
    "NETWORK": ("inspect_provider_reachability", "Distinguish transient name resolution from an application regression using independent CI evidence."),
}


@dataclass(frozen=True)
class FailureFingerprint:
    digest: str
    category: str
    source: str


def fingerprint(raw_log: str, *, source: str = "github-actions") -> FailureFingerprint:
    """Classify bounded untrusted input; never return or persist its raw text."""
    if source not in ("github-actions", "local-ci"):
        raise ValueError("unsupported source")
    if not isinstance(raw_log, str) or not 1 <= len(raw_log) <= 32_768:
        raise ValueError("invalid log size")
    category = next((name for name, pattern in CATEGORIES if pattern.search(raw_log)), "UNKNOWN")
    canonical = json.dumps([SCHEMA, source, category], separators=(",", ":"))
    return FailureFingerprint(hashlib.sha256(canonical.encode()).hexdigest(), category, source)


def scope_key(tenant: str, repository: str) -> str:
    """Opaque exact scope, not a cross-repository knowledge-sharing permission."""
    if not isinstance(tenant, str) or not re.fullmatch(r"[a-zA-Z0-9_.-]{1,72}", tenant):
        raise ValueError("invalid trusted tenant")
    if not isinstance(repository, str) or not SCOPE.fullmatch(repository):
        raise ValueError("invalid trusted repository")
    return hashlib.sha256(json.dumps([tenant, repository], separators=(",", ":")).encode()).hexdigest()


def _fp_ok(fp: FailureFingerprint) -> bool:
    if not isinstance(fp, FailureFingerprint) or fp.category not in PLAYBOOKS or fp.source not in ("github-actions", "local-ci"):
        return False
    expected = hashlib.sha256(json.dumps([SCHEMA, fp.source, fp.category], separators=(",", ":")).encode()).hexdigest()
    return fp.digest == expected


@dataclass(frozen=True)
class ReviewedOutcome:
    """Trusted-adapter evidence only; never construct from PR/issue/LLM text."""
    base_sha: str
    head_sha: str
    checks: dict[str, str]
    reproduced: bool
    regression_passed: bool
    trust_reviewed: bool
    quality_reviewed: bool
    fingerprint_digest: str
    applicable_checks_green: bool
    current_main: bool
    no_active_hold: bool
    trust_boundaries_clear: bool
    scope_complete: bool


def outcome_valid(fp: FailureFingerprint, reviewed: ReviewedOutcome) -> bool:
    return (isinstance(reviewed, ReviewedOutcome) and _fp_ok(fp)
            and isinstance(reviewed.base_sha, str) and SHA.fullmatch(reviewed.base_sha) is not None
            and isinstance(reviewed.head_sha, str) and SHA.fullmatch(reviewed.head_sha) is not None
            and reviewed.base_sha != reviewed.head_sha
            and isinstance(reviewed.checks, dict)
            and all(reviewed.checks.get(k) == "success" for k in REQUIRED_CHECKS)
            and all(getattr(reviewed, field) is True for field in
                    ("reproduced", "regression_passed", "trust_reviewed", "quality_reviewed",
                     "applicable_checks_green", "current_main", "no_active_hold",
                     "trust_boundaries_clear", "scope_complete"))
            and reviewed.fingerprint_digest == fp.digest)


class RepairKnowledge:
    """Private local SQLite index of approved outcomes; not an execution engine."""

    def __init__(self, path: Path):
        path = Path(path)
        if not path.is_absolute() or path.suffix != ".sqlite3" or path.is_symlink():
            raise ValueError("knowledge path must be an absolute non-symlink sqlite3 file")
        parent = path.parent.resolve(strict=True)
        info = path.parent.lstat()
        if (not stat.S_ISDIR(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o700
                or info.st_uid != os.geteuid() or parent != path.parent):
            raise ValueError("knowledge directory must be owner-private 0700")
        fd = os.open(path, os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0), 0o600)
        try:
            f = os.fstat(fd)
            if not stat.S_ISREG(f.st_mode) or stat.S_IMODE(f.st_mode) != 0o600 or f.st_uid != os.geteuid():
                raise ValueError("knowledge file must be owner-private 0600")
        finally:
            os.close(fd)
        self.path = path
        with self._connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS outcomes (
                scope TEXT NOT NULL, fingerprint TEXT NOT NULL, playbook TEXT NOT NULL,
                head_sha TEXT NOT NULL, PRIMARY KEY(scope, fingerprint, head_sha)
            )""")

    def _connect(self):
        return sqlite3.connect(self.path, timeout=5.0)

    def retrieve(self, *, scope: str, fp: FailureFingerprint) -> list[dict]:
        if not isinstance(scope, str) or not HEX.fullmatch(scope) or not _fp_ok(fp):
            return []
        key, guidance = PLAYBOOKS[fp.category]
        with self._connect() as db:
            (count,) = db.execute(
                "SELECT COUNT(*) FROM outcomes WHERE scope=? AND fingerprint=? AND playbook=?",
                (scope, fp.digest, key),
            ).fetchone()
        return [{"playbook": key, "summary": guidance, "verified_count": count,
                 "status": "EVIDENCE_BACKED_CANDIDATE" if count else "UNVERIFIED_CANDIDATE"}]

    def learn(self, *, scope: str, fp: FailureFingerprint, playbook: str,
              reviewed: ReviewedOutcome) -> bool:
        """Only the host's independent trusted reviewer can supply this evidence.

        No raw logs, patches, secret strings, token traces, or PR body are written.
        A success here means local learning, never permission to merge/deploy.
        """
        if (not isinstance(scope, str) or not HEX.fullmatch(scope) or not _fp_ok(fp)
                or playbook != PLAYBOOKS[fp.category][0] or not outcome_valid(fp, reviewed)):
            return False
        with self._connect() as db:
            cursor = db.execute(
                "INSERT OR IGNORE INTO outcomes(scope,fingerprint,playbook,head_sha) VALUES(?,?,?,?)",
                (scope, fp.digest, playbook, reviewed.head_sha),
            )
        return cursor.rowcount == 1


class LearningState(TypedDict, total=False):
    scope: str
    fingerprint: FailureFingerprint
    status: str
    candidates: list[dict]
    route: list[str]
    trust_clear: bool
    quality_clear: bool


def build_learning_graph(knowledge: RepairKnowledge):
    """Real offline LangGraph: PLATFORM -> RAG -> independent TRUST -> QUALITY.

    The graph never calls learn; it cannot elevate a candidate to an approval.
    """
    from langgraph.graph import START, END, StateGraph

    def platform(state: LearningState) -> dict:
        fp = state.get("fingerprint")
        safe = isinstance(state.get("scope"), str) and bool(HEX.fullmatch(state["scope"])) and _fp_ok(fp)
        return {"status": "FINGERPRINTED" if safe else "BLOCKED", "route": ["PLATFORM"]}

    def rag(state: LearningState) -> dict:
        candidates = (knowledge.retrieve(scope=state["scope"], fp=state["fingerprint"])
                      if state["status"] == "FINGERPRINTED" else [])
        return {"candidates": candidates, "route": state["route"] + ["RAG"],
                "status": "RETRIEVED" if candidates else "NOT_PROVEN"}

    def trust(state: LearningState) -> dict:
        candidates = state.get("candidates", [])
        fp = state.get("fingerprint")
        clear = (state.get("status") == "RETRIEVED" and _fp_ok(fp)
                 and len(candidates) == 1
                 and candidates[0]["playbook"] == PLAYBOOKS[fp.category][0])
        return {"trust_clear": bool(clear), "route": state["route"] + ["TRUST"]}

    def quality(state: LearningState) -> dict:
        ok = (state.get("trust_clear") is True and len(state.get("candidates", [])) == 1
              and state["candidates"][0]["status"] in
              ("EVIDENCE_BACKED_CANDIDATE", "UNVERIFIED_CANDIDATE"))
        return {"quality_clear": bool(ok), "route": state["route"] + ["QUALITY"],
                "status": "REPAIR_CANDIDATE" if ok else "NOT_PROVEN"}

    graph = StateGraph(LearningState)
    for name, node in (("platform", platform), ("rag", rag), ("trust", trust), ("quality", quality)):
        graph.add_node(name, node)
    graph.add_edge(START, "platform")
    graph.add_edge("platform", "rag")
    graph.add_edge("rag", "trust")
    graph.add_edge("trust", "quality")
    graph.add_edge("quality", END)
    return graph.compile()


def propose(knowledge: RepairKnowledge, *, tenant: str, repository: str,
            log: str, source: str = "github-actions") -> dict:
    """Never put raw log content in LangGraph state or the persistent store."""
    fp = fingerprint(log, source=source)
    result = build_learning_graph(knowledge).invoke(
        {"scope": scope_key(tenant, repository), "fingerprint": fp},
        {"recursion_limit": 8},
    )
    return {"schema": SCHEMA, "fingerprint": fp.digest, "category": fp.category,
            "status": result["status"], "candidates": result.get("candidates", []),
            "route": result.get("route", []), "writes_authorized": False,
            "merge_authorized": False, "live_verified": False}
