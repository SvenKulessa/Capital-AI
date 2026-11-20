"""Offline, fail-closed CI failure fingerprints for the existing LangGraph worker.

No network, shell, credentials, LLM, automated patching, tenant discovery or merge.
The caller must obtain tenant identity and source evidence independently.
"""
from __future__ import annotations

import hashlib
import json
import re
import uuid

SCHEMA = "CAPITAL_AI_FAILURE_INTELLIGENCE@1"
CATEGORIES = frozenset({"SECURITY", "BUILD", "TEST", "GOVERNANCE", "DEPENDENCY", "REGRESSION"})
SOURCES = frozenset({"GITHUB_ACTIONS", "CODEQL", "DOCKER_SECURITY_GATE", "DOMAIN_GOVERNANCE"})
CODE = re.compile(r"[A-Z][A-Z0-9_]{2,63}\Z")
CHECK = re.compile(r"[a-z][a-z0-9_-]{1,63}\Z")
REPO = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\Z")
SHA = re.compile(r"[0-9a-f]{40}\Z")
SIGNAL_KEYS = frozenset({"schema", "repository", "commit_sha", "source", "check", "category", "failure_code", "run_id", "conclusion"})


def _code(value: object) -> bool:
    return isinstance(value, str) and bool(CODE.fullmatch(value))


def _sha(value: object) -> bool:
    return isinstance(value, str) and bool(SHA.fullmatch(value))


def _tenant(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("trusted tenant scope required")
    try:
        canonical = str(uuid.UUID(value))
    except ValueError as exc:
        raise ValueError("invalid trusted tenant scope") from exc
    if canonical != value:
        raise ValueError("noncanonical trusted tenant scope")
    return canonical


def _digest(value: dict) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def classify_failure(signal: dict, *, trusted_tenant_id: str) -> dict:
    """Fingerprint a metadata-only, externally verified failed CI observation.

    The caller authenticates tenant_id, repository membership and CI facts. This
    pure function checks shape but cannot attest that GitHub emitted the input.
    Free-form log text, paths, messages and secrets are never accepted.
    """
    tenant = _tenant(trusted_tenant_id)
    if not isinstance(signal, dict) or set(signal) != SIGNAL_KEYS:
        raise ValueError("invalid failure evidence shape")
    repo = signal["repository"]
    if (signal["schema"] != SCHEMA
            or not isinstance(repo, str) or not REPO.fullmatch(repo)
            or not _sha(signal["commit_sha"])
            or not isinstance(signal["source"], str) or signal["source"] not in SOURCES
            or not isinstance(signal["check"], str) or not CHECK.fullmatch(signal["check"])
            or not isinstance(signal["category"], str) or signal["category"] not in CATEGORIES
            or not _code(signal["failure_code"])
            or signal["conclusion"] != "failure"
            or type(signal["run_id"]) is not int or not 1 <= signal["run_id"] < 2**63):
        raise ValueError("invalid failure metadata")
    # Deliberately exclude run and commit from the fingerprint so recurring
    # failures correlate, but retain both for immutable evidence provenance.
    key = {"tenant": tenant, "repository": repo, "source": signal["source"],
           "check": signal["check"], "category": signal["category"],
           "failure_code": signal["failure_code"]}
    return {"schema": SCHEMA, "fingerprint": _digest(key),
            "tenant_key": _digest({"tenant": tenant}),
            "repository": repo, "source_sha": signal["commit_sha"],
            "source": signal["source"], "category": signal["category"],
            "check": signal["check"], "failure_code": signal["failure_code"],
            "run_id": signal["run_id"], "evidence_url": f"https://github.com/{repo}/actions/runs/{signal['run_id']}",
            "admission": "NOT_PROVEN", "provider_verified": False}


def propose_repair(observation: dict, *, root_cause_code: str, strategy_code: str,
                   patch_sha: str | None = None) -> dict:
    """Create an untrusted hypothesis, never a verified repair pattern."""
    if (not isinstance(observation, dict) or observation.get("schema") != SCHEMA
            or observation.get("admission") != "NOT_PROVEN"
            or not isinstance(observation.get("fingerprint"), str)
            or not re.fullmatch(r"[0-9a-f]{64}", observation["fingerprint"])
            or not _code(root_cause_code) or not _code(strategy_code)
            or (patch_sha is not None and not _sha(patch_sha))):
        raise ValueError("unverified candidate rejected")
    return {"schema": "CAPITAL_AI_REPAIR_CANDIDATE@1",
            "fingerprint": observation["fingerprint"],
            "tenant_key": observation["tenant_key"],
            "source_sha": observation["source_sha"],
            "root_cause_code": root_cause_code, "strategy_code": strategy_code,
            "patch_sha": patch_sha, "status": "HYPOTHESIS_NOT_PROVEN",
            "automatic_merge_allowed": False, "production_eligible": False}


def eligible_for_admission(candidate: dict, evidence: dict) -> bool:
    """Advisory precondition, not a security approval or authority grant.

    An external trusted host must verify the evidence, real independent
    reviewer identities, permissions, test logs, and commit binding.
    """
    required = {"reproduced", "root_cause_confirmed", "tests_passed",
                "security_clear", "trust_independent", "quality_independent",
                "patch_sha"}
    return bool(isinstance(candidate, dict) and isinstance(evidence, dict)
                and candidate.get("status") == "HYPOTHESIS_NOT_PROVEN"
                and set(evidence) == required
                and all(evidence[x] is True for x in required - {"patch_sha"})
                and _sha(candidate.get("patch_sha"))
                and evidence["patch_sha"] == candidate["patch_sha"])
