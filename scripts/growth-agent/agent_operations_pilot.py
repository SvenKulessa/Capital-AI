"""Read-only LangGraph proof for CAPITAL-AI's three B2B agent pilot workflows.

No network, provider, model, database, shell, publishing, or merge actions.
This is a separately tested graph adapter, NOT the Node HTTP runtime.
"""
from __future__ import annotations

import re
from pathlib import Path
import json
import hashlib
import uuid

from auto_loop import Authority, execute, execute_durable

WORKFLOWS = {
    "ci-evidence": ("platform-engineering", "trust-engineering"),
    "credential-expiry": ("trust-engineering", "incident-response"),
    "media-rights": ("growth-engineering", "legal-compliance"),
}


def _registry_skills_present() -> bool:
    path = Path(__file__).resolve().parents[2] / ".agents" / "skills" / "registry.json"
    try:
        registry = json.loads(path.read_text(encoding="utf-8"))
        return all(
            skill in registry["skillGovernance"]
            for skills in WORKFLOWS.values() for skill in skills
        )
    except (OSError, ValueError, KeyError, TypeError):
        return False


def _analyze(workflow_id: str, payload: dict) -> tuple[str, dict] | None:
    """Whitelist demo data; accept neither tenant identities nor credentials."""
    if not isinstance(payload, dict) or workflow_id not in WORKFLOWS:
        return None
    if workflow_id == "ci-evidence":
        if set(payload) != {"repository", "commitSha", "checks"}:
            return None
        if not isinstance(payload["repository"], str) or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", payload["repository"]):
            return None
        if not isinstance(payload["commitSha"], str) or not re.fullmatch(r"[0-9a-f]{40}", payload["commitSha"]):
            return None
        c = payload["checks"]
        if not isinstance(c, dict) or set(c) != {"dockerSecurityGate", "domainGovernance"}:
            return None
        if any(v not in ("success", "failure", "pending") for v in c.values()):
            return None
        return ("REVIEW_REQUIRED" if not all(v == "success" for v in c.values()) else "SYNTHETIC_READY_FOR_REVIEW",
                {"checks": "USER_SUPPLIED", "providerVerified": False})
    if workflow_id == "credential-expiry":
        if set(payload) != {"entries"} or not isinstance(payload["entries"], list) or not 1 <= len(payload["entries"]) <= 8:
            return None
        for item in payload["entries"]:
            if not isinstance(item, dict) or set(item) != {"provider", "daysToExpiry"}:
                return None
            if not isinstance(item["provider"], str) or not re.fullmatch(r"[a-z][a-z0-9_-]{1,31}", item["provider"]):
                return None
            if type(item["daysToExpiry"]) is not int or not -365 <= item["daysToExpiry"] <= 3650:
                return None
        return "METADATA_REVIEW", {"providerVerified": False, "checked": len(payload["entries"])}
    if set(payload) != {"assets"} or not isinstance(payload["assets"], list) or not 1 <= len(payload["assets"]) <= 12:
        return None
    for item in payload["assets"]:
        if not isinstance(item, dict) or set(item) != {"id", "commercialRights", "sourceVerified", "attributionComplete"}:
            return None
        if not isinstance(item["id"], str) or not re.fullmatch(r"[A-Za-z0-9._-]{1,48}", item["id"]):
            return None
        if item["commercialRights"] not in ("ALLOWED", "DENIED", "UNVERIFIED"):
            return None
        if type(item["sourceVerified"]) is not bool or type(item["attributionComplete"]) is not bool:
            return None
    return "RIGHTS_REVIEW", {"commercialClearance": False, "checked": len(payload["assets"])}


class ReadOnlyDemoAdapter:
    def __init__(self, workflow_id: str, payload: dict):
        self.workflow_id = workflow_id
        self.payload = payload
        self.assessment = None
        self.calls = []

    def analyze(self, _state):
        self.calls.append("analyze")
        result = _analyze(self.workflow_id, self.payload)
        if result is None or not _registry_skills_present():
            return {"ok": False}
        self.assessment = result
        return {"ok": True}

    def evidence(self, _state):
        self.calls.append("evidence")
        return {"scope_complete": False, "trust_boundaries_clear": False}

    def implement(self, _state):
        raise AssertionError("Read-only demo must never implement or mutate")

    def merge(self, _state):
        raise AssertionError("Read-only demo must never merge")


def preview(workflow_id: str, payload: dict) -> dict:
    adapter = ReadOnlyDemoAdapter(workflow_id, payload)
    if not isinstance(workflow_id, str) or workflow_id not in WORKFLOWS:
        return {"status": "BLOCKED", "history": [], "assessment": None, "calls": []}
    state = execute(adapter, Authority(read_only=True), "agentpilot:" + workflow_id)
    return {
        "status": state["status"],
        "history": state.get("history", []),
        "assessment": adapter.assessment,
        "calls": adapter.calls,
        "mode": "LOCAL_LANGGRAPH_READ_ONLY",
        "productionEligible": False,
        "externalProviderCalls": 0,
    }



def preview_durable(workflow_id: str, payload: dict, *, tenant_id: str,
                    idempotency_key: str, db_path: str) -> dict:
    """Exercise existing SQLite-backed LangGraph read-only checkpoint recovery.

    Caller must supply a VERIFIED tenant identity and independently bind the
    payload hash to its idempotency key in the Supabase transactional ledger.
    This is a separated, offline worker proof, not an HTTP execution adapter.
    """
    try:
        tenant = str(uuid.UUID(tenant_id))
    except (ValueError, TypeError, AttributeError):
        return {"status": "BLOCKED", "reason": "INVALID_TENANT"}
    if (not isinstance(workflow_id, str) or workflow_id not in WORKFLOWS
            or not isinstance(idempotency_key, str)
            or not re.fullmatch(r"[A-Za-z0-9_-]{12,64}", idempotency_key)
            or _analyze(workflow_id, payload) is None):
        return {"status": "BLOCKED", "reason": "INVALID_INPUT"}
    # Hashed thread namespace prevents one user's key from resuming another's
    # checkpoint and avoids including tenant identifiers in SQLite thread IDs.
    material = "|".join((tenant, workflow_id, idempotency_key))
    task_id = "agentpilot:" + hashlib.sha256(material.encode("utf-8")).hexdigest()[:48]
    adapter = ReadOnlyDemoAdapter(workflow_id, payload)
    state = execute_durable(adapter, Authority(read_only=True), task_id, db_path)
    return {
        "status": state["status"],
        "history": state.get("history", []),
        "calls": adapter.calls,
        "checkpoint": "PRIVATE_SQLITE_DURABLE_READ_ONLY",
        "replayedCheckpoint": not adapter.calls,
        "productionEligible": False,
        "externalProviderCalls": 0,
    }
