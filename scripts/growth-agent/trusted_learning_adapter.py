"""Opt-in, read-only GitHub provenance for offline learning, not a merge gate.

Reviewers sign independently outside this module. Key material and the authorized
tenant/repository map come only from a trusted runtime, never logs/PRs/prompts.
No signature-minting endpoint, provider write, deploy or paid operation exists here.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import hmac
import json
import re
import time

import failure_learning as fl
from provider_adapters import HOLD_TITLE, OPTIONAL_SKIP, REPO, required_workflow_group_verified


@dataclass(frozen=True)
class ReviewProof:
    tenant: str
    repository: str
    pr_number: int
    issued_at: int
    trust_mac: str
    quality_mac: str


def canonical_review(scope, fp, reviewed, proof):
    """Stable, role-separated message; every signed claim is commit/scope-bound."""
    data = {
        "schema": "CAPITAL_AI_LEARNING_REVIEW@1",
        "scope": scope,
        "fingerprint": fp.digest,
        "tenant": proof.tenant,
        "repository": proof.repository,
        "pr_number": proof.pr_number,
        "issued_at": proof.issued_at,
        "reviewed": asdict(reviewed),
    }
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def _current_review_target(pr, main, reviewed, proof) -> bool:
    if not isinstance(pr, dict) or not isinstance(main, dict):
        return False
    head, base, commit = pr.get("head"), pr.get("base"), main.get("commit")
    if not all(isinstance(value, dict) for value in (head, base, commit)):
        return False
    title = pr.get("title")
    return (pr.get("number") == proof.pr_number
            and pr.get("state") == "open"
            and pr.get("draft") is False
            and pr.get("mergeable") is True
            and pr.get("mergeable_state") == "clean"
            and isinstance(title, str) and bool(title.strip())
            and HOLD_TITLE.search(title) is None
            and base.get("ref") == "main"
            and isinstance(head.get("repo"), dict)
            and head["repo"].get("full_name") == proof.repository
            and head.get("sha") == reviewed.head_sha
            and base.get("sha") == reviewed.base_sha
            and commit.get("sha") == reviewed.base_sha)


class TrustedLearningVerifier:
    """Verification-only adapter; injected GitHub client must be an authorized SafeHTTP.

    A trusted caller binds a logged-in tenant to an allowlisted repository and
    supplies independent >=32-byte TRUST and QUALITY verification keys. The
    signer processes and transport are separate trusted components.
    """

    def __init__(self, github, *, authorized_repositories, trust_key, quality_key, clock=None):
        if not isinstance(trust_key, bytes) or not isinstance(quality_key, bytes):
            raise ValueError("independent reviewer keys required")
        if len(trust_key) < 32 or len(quality_key) < 32 or hmac.compare_digest(trust_key, quality_key):
            raise ValueError("invalid independent reviewer keys")
        if not isinstance(authorized_repositories, dict):
            raise TypeError("trusted tenant mapping required")
        self._github = github
        self._authorized = {tenant: frozenset(repos) for tenant, repos in authorized_repositories.items()}
        self._trust_key = trust_key
        self._quality_key = quality_key
        self._clock = clock or time.time

    def verify(self, *, scope, fp, reviewed, proof) -> bool:
        try:
            if not isinstance(proof, ReviewProof) or not fl.outcome_valid(fp, reviewed):
                return False
            if (proof.repository != REPO or proof.repository not in self._authorized.get(proof.tenant, ())
                    or scope != fl.scope_key(proof.tenant, proof.repository)
                    or type(proof.pr_number) is not int or not 1 <= proof.pr_number <= 999999
                    or type(proof.issued_at) is not int
                    or not 0 <= self._clock() - proof.issued_at <= 300):
                return False
            if not all(isinstance(v, str) and re.fullmatch(r"[0-9a-f]{64}", v)
                       for v in (proof.trust_mac, proof.quality_mac)):
                return False
            message = canonical_review(scope, fp, reviewed, proof)
            for role, key, supplied in (("TRUST", self._trust_key, proof.trust_mac),
                                        ("QUALITY", self._quality_key, proof.quality_mac)):
                expected = hmac.new(key, role.encode("ascii") + bytes((0,)) + message, hashlib.sha256).hexdigest()
                if not hmac.compare_digest(expected, supplied):
                    return False

            # Live provider evidence, never the reviewer's assertion about CI.
            pr = self._github.github(f"/pulls/{proof.pr_number}", method="GET")
            main = self._github.github("/branches/main", method="GET")
            if not _current_review_target(pr, main, reviewed, proof):
                return False

            data = self._github.github(f"/commits/{reviewed.head_sha}/check-runs?per_page=100",
                                       method="GET")
            runs = data.get("check_runs") if isinstance(data, dict) else None
            if (not isinstance(runs, list) or not runs or len(runs) > 100
                    or type(data.get("total_count")) is not int
                    or data["total_count"] != len(runs)):
                return False
            seen, ids = {}, set()
            required_runs = {name: [] for name in fl.REQUIRED_CHECKS}
            for run in runs:
                if not isinstance(run, dict):
                    return False
                name, run_id = run.get("name"), run.get("id")
                if (not isinstance(name, str) or not name or name in seen
                        or type(run_id) is not int or run_id <= 0 or run_id in ids
                        or run.get("head_sha") != reviewed.head_sha):
                    return False
                ids.add(run_id)
                if name in required_runs:
                    required_runs[name].append(run)
                    continue
                app = run.get("app")
                if (name.startswith("Analyze (")
                        and (not isinstance(app, dict) or app.get("slug") != "github-actions")):
                    return False
                if (name == "CodeQL" and
                        (not isinstance(app, dict) or app.get("slug") != "github-advanced-security")):
                    return False
                if run.get("status") != "completed":
                    return False
                result = run.get("conclusion")
                if result != "success" and not (result == "skipped" and name in OPTIONAL_SKIP):
                    return False
                seen[name] = result
            for name, group in required_runs.items():
                if not required_workflow_group_verified(self._github, name, group, reviewed.head_sha):
                    return False
                seen[name] = "success"
            if seen.get("Analyze (python)") != "success" and seen.get("CodeQL") != "success":
                return False
            if not all(seen.get(name) == state for name, state in reviewed.checks.items()):
                return False
            # Bound the PR/head/main readback both before and after checking CI.
            # A head/main change during the inspection invalidates the receipt.
            refreshed_pr = self._github.github(f"/pulls/{proof.pr_number}", method="GET")
            refreshed_main = self._github.github("/branches/main", method="GET")
            return _current_review_target(refreshed_pr, refreshed_main, reviewed, proof)
        except Exception:
            # No raw provider response, token, PR text or signature in diagnostics.
            return False
