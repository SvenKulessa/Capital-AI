"""Trusted, fail-closed GitHub/Render adapters for the existing execution graph.

External text, PR bodies and workflow logs are never authority. No manual
Render deploy is provided. Credentials remain on the trusted local worker.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, HTTPRedirectHandler

REPO = "SvenKulessa/Capital-AI"
SERVICE_ID = "srv-dau1rp893c1s73cdhm1g"
REQUIRED = ("Docker Security Gate", "Domain Governance")
OPTIONAL_SKIP = frozenset(("Supabase Preview", "Production Handoff Gate", "publish_candidate"))
BRANCH_RE = re.compile(r"^capital-ai-(product|market|platform|trust|growth)/[a-z0-9][a-z0-9._-]*-[0-9]{8}$")
HEX40 = re.compile(r"^[a-f0-9]{40}$")
# Escape dots: DNS labels must match exactly, never wildcard hosts.
MERGE_URL_RE = re.compile(r"https://api\.github\.com/repos/SvenKulessa/Capital-AI/pulls/[0-9]+/merge")


def sha(value):
    return isinstance(value, str) and HEX40.fullmatch(value) is not None


@dataclass(frozen=True)
class TrustedAssessment:
    """Must be produced by a trusted reviewer, never from issue/PR text or LLM output."""
    scope_complete: bool = False
    trust_boundaries_clear: bool = False
    no_active_hold: bool = False
    applicable_checks_green: bool = False

    def approved(self):
        return all(value is True for value in
                   (self.scope_complete, self.trust_boundaries_clear,
                    self.no_active_hold, self.applicable_checks_green))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


class SafeHTTP:
    """Only fixed HTTPS origins; rejects redirects, oversized and non-JSON content."""
    def __init__(self, *, github_token="", render_token="", opener=None, timeout=10):
        self._github_token = github_token
        self._render_token = render_token
        self._opener = opener or build_opener(NoRedirect)
        self._timeout = min(15, max(1, timeout))

    def _request(self, url, *, token="", method="GET", body=None):
        if not (url.startswith("https://api.github.com/repos/SvenKulessa/Capital-AI/")
                or url.startswith("https://api.render.com/v1/services/" + SERVICE_ID + "/")
                or url == "https://capital-ai.online/healthz"):
            raise ValueError("origin outside fixed provider allowlist")
        if method not in ("GET", "PUT") or (method == "PUT" and
                MERGE_URL_RE.fullmatch(url) is None):
            raise ValueError("unsupported mutation")
        if method == "PUT" and not token:
            raise ValueError("GitHub authorization missing")
        headers = {"Accept": "application/json", "User-Agent": "capital-ai-execution-first"}
        if token:
            headers["Authorization"] = "Bearer " + token
        payload = json.dumps(body, separators=(",", ":")).encode() if body is not None else None
        if payload is not None:
            headers["Content-Type"] = "application/json"
        try:
            request = Request(url, data=payload, headers=headers, method=method)
            with self._opener.open(request, timeout=self._timeout) as response:
                if response.status < 200 or response.status >= 300:
                    raise ValueError("provider status is not successful")
                if "json" not in response.headers.get("Content-Type", "").lower():
                    raise ValueError("unexpected response media type")
                content = response.read(262145)
                if len(content) > 262144:
                    raise ValueError("response size exceeded")
                return json.loads(content)
        except (HTTPError, URLError, OSError, ValueError, json.JSONDecodeError) as exc:
            # No underlying URL, token, exception body or provider payload in logs/state.
            raise RuntimeError("TRUSTED_PROVIDER_REQUEST_NOT_PROVEN") from None

    def github(self, path, *, method="GET", body=None):
        if not isinstance(path, str) or re.fullmatch(r"/(?:pulls/[0-9]+(?:/merge)?|branches/main|commits/[a-f0-9]{40}/check-runs\?per_page=100)", path) is None:
            raise ValueError("invalid or unapproved GitHub path")
        return self._request("https://api.github.com/repos/" + REPO + path,
                             token=self._github_token, method=method, body=body)

    def render(self, path):
        if path != "/deploys?limit=20":
            raise ValueError("render path not allowed")
        return self._request("https://api.render.com/v1/services/" + SERVICE_ID + path,
                             token=self._render_token)

    def health(self):
        return self._request("https://capital-ai.online/healthz")


class GitHubRenderActions:
    """PR-scoped adapter. TrustedAssessment and executor come from trusted code.

    The implement step confirms an existing complete PR. A trusted executor
    can implement/repair, but neither PR prose nor the model is executable.
    """
    def __init__(self, http, *, pr_number, assessment: TrustedAssessment,
                 executor=None, enable_merge=False, approved_head_sha=None,
                 approved_base_sha=None):
        if type(pr_number) is not int or not 1 <= pr_number <= 999999:
            raise ValueError("invalid PR number")
        if not isinstance(assessment, TrustedAssessment):
            raise TypeError("trusted assessment required")
        self.http = http
        self.number = pr_number
        self.assessment = assessment
        self.executor = executor
        self.enable_merge = enable_merge is True
        if self.enable_merge and not (sha(approved_head_sha) and sha(approved_base_sha)):
            raise ValueError("mutating adapter requires exact trusted head/base SHAs")
        self.approved_head_sha = approved_head_sha
        self.approved_base_sha = approved_base_sha
        self._head = None

    def _pr(self):
        result = self.http.github(f"/pulls/{self.number}")
        if not isinstance(result, dict):
            raise ValueError("invalid PR")
        return result

    def _current(self):
        pr = self._pr()
        main = self.http.github("/branches/main")
        head = pr.get("head") or {}
        base = pr.get("base") or {}
        main_sha = (main.get("commit") or {}).get("sha")
        head_sha = head.get("sha")
        good = (pr.get("state") == "open" and pr.get("draft") is False
                and base.get("ref") == "main" and sha(base.get("sha"))
                and sha(head_sha) and sha(main_sha)
                and BRANCH_RE.fullmatch(head.get("ref", "")) is not None
                and head.get("repo", {}).get("full_name") == REPO
                and (not self.enable_merge or (
                    head_sha == self.approved_head_sha
                    and base.get("sha") == self.approved_base_sha
                    and main_sha == self.approved_base_sha)))
        if not good:
            raise ValueError("PR scope not verified")
        return pr, main_sha

    def _checks(self, head_sha):
        data = self.http.github(f"/commits/{head_sha}/check-runs?per_page=100")
        runs = data.get("check_runs") if isinstance(data, dict) else None
        if (not isinstance(runs, list) or not runs
                or data.get("total_count") != len(runs)):
            raise ValueError("incomplete GitHub check coverage")
        by_name = {}
        for run in runs:
            if not isinstance(run, dict) or not isinstance(run.get("name"), str):
                raise ValueError("invalid check run")
            name = run["name"]
            if name in by_name:  # Do not use old successes to mask pending reruns.
                by_name[name] = "duplicate"
            else:
                by_name[name] = (run.get("conclusion") if run.get("status") == "completed" else "pending")
        required_ok = all(by_name.get(name) == "success" for name in REQUIRED)
        applicable_ok = all(status == "success" or (status == "skipped" and name in OPTIONAL_SKIP)
                            for name, status in by_name.items())
        return by_name, required_ok and applicable_ok

    def analyze(self, state):
        pr, _ = self._current()
        self._head = pr["head"]["sha"]
        return {"ok": True}

    def implement(self, state):
        pr, _ = self._current()
        if self.executor is not None:
            return {"ok": self.executor.implement(state) is True}
        return {"ok": pr.get("changed_files", 0) > 0 and self.assessment.scope_complete is True}

    def test(self, state):
        pr, _ = self._current()
        _, ok = self._checks(pr["head"]["sha"])
        return {"passed": ok}

    def repair(self, state):
        if self.executor is None:
            return {"ok": False}
        return {"ok": self.executor.repair(state) is True}

    def evidence(self, state):
        pr, main_sha = self._current()
        checks, valid = self._checks(pr["head"]["sha"])
        return {
            "base_sha": pr["base"]["sha"],
            "head_sha": pr["head"]["sha"],
            "checks": checks,
            "applicable_checks_green": valid and self.assessment.applicable_checks_green is True,
            "mergeable": pr.get("mergeable") is True and pr["base"]["sha"] == main_sha,
            "trust_boundaries_clear": self.assessment.trust_boundaries_clear is True,
            "scope_complete": self.assessment.scope_complete is True,
            "current_main": pr["base"]["sha"] == main_sha,
            "no_active_hold": self.assessment.no_active_hold is True,
            "run_ids": sorted({r.get("id") for r in
                self.http.github(f"/commits/{pr['head']['sha']}/check-runs?per_page=100").get("check_runs", [])
                if type(r.get("id")) is int}),
        }

    def merge(self, state):
        evidence = state.get("evidence") or {}
        if (not self.enable_merge or not self.assessment.approved()
                or evidence.get("head_sha") != self.approved_head_sha
                or evidence.get("base_sha") != self.approved_base_sha):
            return {}
        pr = self._pr()
        if pr.get("merged") is True:  # Crash/retry after remote merge: never PUT again.
            merge_sha = pr.get("merge_commit_sha")
            return ({"merged": True, "sha": merge_sha, "expected_head_sha": evidence["head_sha"]}
                    if sha(merge_sha) and pr.get("head", {}).get("sha") == evidence["head_sha"] else {})
        # Recompute evidence immediately before the mutation.
        current = self.evidence(state)
        from auto_loop import merge_evidence_verified
        if current != evidence or not merge_evidence_verified(current):
            return {}
        result = self.http.github(f"/pulls/{self.number}/merge", method="PUT",
                                  body={"sha": evidence["head_sha"], "merge_method": "squash"})
        if not isinstance(result, dict) or result.get("merged") is not True or not sha(result.get("sha")):
            return {}
        return {"merged": True, "sha": result["sha"], "expected_head_sha": evidence["head_sha"]}

    def observe_deployment(self, state):
        target = state.get("merge_sha")
        if not sha(target):
            return {}
        items = self.http.render("/deploys?limit=20")
        if not isinstance(items, list):
            return {}
        # Render lists newest-first; an older live snapshot is not the
        # currently deployed revision and must never satisfy runtime evidence.
        if not items or not isinstance(items[0], dict):
            return {}
        deploy = items[0].get("deploy", items[0])
        if not isinstance(deploy, dict):
            return {}
        commit = deploy.get("commit", {})
        if (deploy.get("status") == "live" and isinstance(commit, dict)
                and commit.get("id") == target):
            return {"deployed": True, "deployed_sha": target}
        return {}

    def verify_runtime(self, state):
        target = state.get("merge_sha")
        if not sha(target) or state.get("observed_sha") != target:
            return {}
        # Deployment may have changed between observation and health readback.
        if self.observe_deployment(state).get("deployed_sha") != target:
            return {}
        response = self.http.health()
        if not isinstance(response, dict):
            return {}
        identity = response.get("runtimeIdentity") or {}
        if (response.get("status") == "ok" and response.get("ingress") == "fail_closed"
                and identity.get("sourceSha") == target):
            return {"verified": True, "deployed_sha": target}
        return {}
