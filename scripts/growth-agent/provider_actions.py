"""Explicit, least-privilege GitHub/Render actions for the execution-first graph.

The trusted host supplies authenticated, origin-pinned HTTP transports and the
authorized repository/PR/service IDs. No token, URL, permission or approval is
read from graph state, PR text or model output. No autonomous code generation.
"""
from __future__ import annotations
from dataclasses import dataclass
import re

from auto_loop import Authority, merge_evidence_verified, _sha, REQUIRED_CHECKS


@dataclass(frozen=True)
class Scope:
    repository: str
    pr_number: int
    render_service_id: str
    expected_base: str = "main"

    def __post_init__(self):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", self.repository):
            raise ValueError("invalid repository")
        if type(self.pr_number) is not int or self.pr_number < 1:
            raise ValueError("invalid PR")
        if not re.fullmatch(r"srv-[a-z0-9]+", self.render_service_id):
            raise ValueError("invalid Render service")


class TrustedProviderActions:
    """Transport API: github(method, path, payload=None), render(method,path).

    Host must pin origins to api.github.com and api.render.com, restrict auth
    to the scoped repository/service and use nonredirecting HTTPS with timeouts.
    All action methods fail closed; no tokens enter LangGraph state.
    """
    def __init__(self, scope: Scope, authority: Authority, github, render,
                 *, implement=None, test=None, repair=None,
                 risk_approved=False, scope_complete=False, no_active_hold=False):
        self.scope, self.authority = scope, authority
        self.github, self.render = github, render
        self._implement, self._test, self._repair = implement, test, repair
        self._risk_approved = risk_approved is True
        self._scope_complete = scope_complete is True
        self._no_active_hold = no_active_hold is True

    @property
    def _root(self):
        return "/repos/" + self.scope.repository

    def _pr(self):
        result = self.github("GET", self._root + "/pulls/" + str(self.scope.pr_number))
        if not isinstance(result, dict) or result.get("base", {}).get("ref") != self.scope.expected_base:
            raise ValueError("unexpected PR/base")
        if result.get("head", {}).get("repo", {}).get("full_name") != self.scope.repository:
            raise ValueError("cross-repository PR forbidden")
        if result.get("state") != "open" or result.get("draft") is True:
            raise ValueError("PR not mergeable")
        return result

    def analyze(self, state):
        try:
            self._pr()
            return {"ok": True}
        except (ValueError, KeyError, TypeError):
            return {"ok": False}

    def implement(self, state):
        if self.authority.read_only or not self.authority.allow_changes or not callable(self._implement):
            return {"ok": False}
        return {"ok": self._implement(dict(state)) is True}

    def test(self, state):
        return {"passed": callable(self._test) and self._test(dict(state)) is True}

    def repair(self, state):
        if self.authority.read_only or not self.authority.allow_changes or not callable(self._repair):
            return {"ok": False}
        return {"ok": self._repair(dict(state)) is True}

    def evidence(self, state):
        pr = self._pr()
        head, base = pr["head"]["sha"], pr["base"]["sha"]
        main = self.github("GET", self._root + "/branches/" + self.scope.expected_base)
        checks = self.github("GET", self._root + "/commits/" + head + "/check-runs?per_page=100")
        if not (_sha(head) and _sha(base) and main.get("commit", {}).get("sha") == base):
            return {}
        runs = checks.get("check_runs", [])
        if not isinstance(runs, list) or checks.get("total_count", len(runs)) != len(runs):
            return {}
        names = {}
        for run in runs:
            if run.get("head_sha") not in (None, head):
                return {}
            name = run.get("name")
            if name in names:
                return {}  # ambiguous duplicate check names are not positive evidence
            names[name] = run
        required = {name: ("success" if names.get(name, {}).get("status") == "completed"
                           and names[name].get("conclusion") == "success" else "missing")
                    for name in REQUIRED_CHECKS}
        applicable = all(x.get("status") == "completed" and
                         x.get("conclusion") in ("success", "neutral", "skipped")
                         for x in runs)
        return {"base_sha": base, "head_sha": head, "checks": required,
                "applicable_checks_green": applicable,
                "mergeable": pr.get("mergeable") is True and pr.get("mergeable_state") == "clean",
                "trust_boundaries_clear": self._risk_approved,
                "scope_complete": self._scope_complete,
                "current_main": True,
                "no_active_hold": self._no_active_hold,
                "run_ids": [r.get("id") for r in runs if type(r.get("id")) is int]}

    def merge(self, state):
        if self.authority.read_only or not self.authority.allow_merge:
            return {}
        claimed = state.get("evidence")
        if not merge_evidence_verified(claimed):
            return {}
        fresh = self.evidence(state)
        if not merge_evidence_verified(fresh) or fresh != claimed:
            return {}  # reject stale CI, stale main, new HOLD or changed PR
        head = fresh["head_sha"]
        result = self.github("PUT", self._root + "/pulls/" + str(self.scope.pr_number) + "/merge",
                             {"merge_method": "squash", "sha": head})
        if result.get("merged") is True and _sha(result.get("sha")):
            return {"merged": True, "sha": result["sha"], "expected_head_sha": head}
        return {}

    def observe_deployment(self, state):
        if not self.authority.observe_existing_deploy or self.authority.read_only:
            return {}
        sha = state.get("merge_sha")
        if not _sha(sha):
            return {}
        result = self.render("GET", "/v1/services/" + self.scope.render_service_id + "/deploys?limit=10")
        if not isinstance(result, list):
            return {}
        matches = [x for x in result if x.get("status") == "live"
                   and x.get("commit", {}).get("id") == sha]
        return {"deployed": len(matches) == 1, "deployed_sha": sha if len(matches) == 1 else ""}

    def verify_runtime(self, state):
        # A live deploy record is not proof of running image identity or health.
        # Host must supply a separately verified runtime readback; no synthetic PASS.
        return {"verified": False}
