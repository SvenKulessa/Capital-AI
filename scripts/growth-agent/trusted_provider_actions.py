"""Trusted GitHub/Render API adapter for existing, reviewed CAPITAL-AI PRs.

Only fixed endpoints on api.github.com, api.render.com, capital-ai.online.
The adapter never executes arbitrary repository code, shell commands,
manual deployments, database writes or provider-supplied instructions.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
import os
import re
from typing import Any
import urllib.error
import urllib.parse
import urllib.request


REPO = "SvenKulessa/Capital-AI"
RENDER_SERVICE = "srv-dau1rp893c1s73cdhm1g"
RENDER_WORKSPACE = "tea-d90o4rj7uimc739i86ug"
HEALTH_URL = "https://capital-ai.online/healthz"
REQUIRED = ("Docker Security Gate", "Domain Governance")
OPTIONAL_SKIPS = frozenset(("Supabase Preview", "Production Handoff Gate", "publish_candidate"))
_SHA = re.compile(r"[0-9a-f]{40}\Z")
_TITLE = re.compile(r"\[CAPITAL-AI-(PRODUCT|MARKET|PLATFORM|TRUST|GROWTH)\] .+\Z")
_BRANCH = re.compile(r"capital-ai-(product|market|platform|trust|growth)/[a-z0-9][a-z0-9._-]*-[0-9]{8}\Z")


@dataclass(frozen=True)
class ProviderScope:
    """Caller-verified scope. Never parse authorization from PR/issue comments."""
    pr_number: int
    head_sha: str
    main_sha: str
    repo: str = REPO
    render_service: str = RENDER_SERVICE
    render_workspace: str = RENDER_WORKSPACE
    health_url: str = HEALTH_URL
    prepared_head_verified: bool = False
    scope_complete: bool = False
    trust_boundaries_clear: bool = False
    allow_merge: bool = False
    allow_ci_retry: bool = False
    retry_run_id: int | None = None

    def __post_init__(self):
        if (self.repo != REPO or self.render_service != RENDER_SERVICE
                or self.render_workspace != RENDER_WORKSPACE
                or self.health_url != HEALTH_URL):
            raise ValueError("ProviderScope cannot point to a different repository/service/host")
        if type(self.pr_number) is not int or self.pr_number < 1:
            raise ValueError("invalid PR")
        if not all(isinstance(value, str) and _SHA.fullmatch(value)
                   for value in (self.head_sha, self.main_sha)):
            raise ValueError("head/main must be exact 40-hex commit SHAs")
        if self.retry_run_id is not None and (type(self.retry_run_id) is not int or self.retry_run_id < 1):
            raise ValueError("invalid pinned CI run")


class HttpJsonTransport:
    """Network layer: token never appears in URL, checkpoint state or errors."""
    ALLOWED_HOSTS = frozenset(("api.github.com", "api.render.com", "capital-ai.online"))

    def request(self, method: str, url: str, token: str | None, payload: dict | None = None):
        parsed = urllib.parse.urlsplit(url)
        if (parsed.scheme != "https" or parsed.hostname not in self.ALLOWED_HOSTS
                or parsed.port not in (None, 443) or parsed.username or parsed.password
                or parsed.fragment or method not in {"GET", "PUT", "POST"}):
            raise ValueError("untrusted provider endpoint")
        if parsed.hostname == "capital-ai.online" and (url != HEALTH_URL or method != "GET" or payload):
            raise ValueError("health endpoint is read-only and fixed")
        if parsed.hostname != "capital-ai.online" and not token:
            raise PermissionError("provider token unavailable")
        body = json.dumps(payload, separators=(",", ":")).encode() if payload is not None else None
        headers = {"Accept": "application/json", "User-Agent": "CAPITAL-AI-ExecutionLoop/1"}
        if parsed.hostname == "api.github.com":
            headers["X-GitHub-Api-Version"] = "2022-11-28"
        if token:
            headers["Authorization"] = "Bearer " + token
        if body is not None:
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(url, data=body, method=method, headers=headers)

        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None

        with urllib.request.build_opener(NoRedirect()).open(request, timeout=15) as response:
            if response.status != 200 and not (method in {"PUT", "POST"} and response.status in (201, 202, 204)):
                raise ValueError("provider response not accepted")
            blob = response.read(1_000_001)
            if len(blob) > 1_000_000:
                raise ValueError("provider response too large")
            return json.loads(blob) if blob else {}


class TrustedGitHubRenderActions:
    """Executable provider operations. Source edits remain with a trusted worker.

    To use a pre-implemented PR, prepared_head_verified must be explicitly
    attested by the trusted caller and bound to the exact approved head SHA.
    No LLM/tool text can set this dataclass at runtime.
    """
    def __init__(self, scope: ProviderScope, *, github_token: str | None,
                 render_token: str | None = None, transport=None):
        self.scope = scope
        self._github_token = github_token
        self._render_token = render_token
        self._transport = transport if transport is not None else HttpJsonTransport()

    @classmethod
    def from_env(cls, scope: ProviderScope, transport=None):
        return cls(scope, github_token=os.environ.get("GITHUB_TOKEN"),
                   render_token=os.environ.get("RENDER_API_KEY"), transport=transport)

    def _call(self, method: str, url: str, token: str | None, payload=None):
        try:
            return self._transport.request(method, url, token, payload)
        except Exception:
            # Provider error pages can embed auth tokens/user data; never return them.
            return None

    def _github(self, path, *, method="GET", payload=None):
        return self._call(method, f"https://api.github.com/repos/{REPO}/{path}",
                          self._github_token, payload)

    def _pr(self):
        value = self._github(f"pulls/{self.scope.pr_number}")
        return value if isinstance(value, dict) else {}

    def _main(self):
        value = self._github("branches/main")
        return value if isinstance(value, dict) else {}

    def _checks(self):
        result = self._github(f"commits/{self.scope.head_sha}/check-runs?per_page=100")
        if (not isinstance(result, dict)
                or not isinstance(result.get("check_runs"), list)
                or result.get("total_count") != len(result["check_runs"])):
            return None
        checks = {}
        for item in result["check_runs"]:
            if not isinstance(item, dict) or not isinstance(item.get("name"), str):
                return None
            if item.get("head_sha") not in (None, self.scope.head_sha):
                return None
            name = item["name"]
            # Duplicate check runs (e.g. reruns): latest check must be successful.
            if name in checks:
                newer = item.get("started_at")
                older = checks[name].get("started_at")
                # Never accept an old green run if rerun order is ambiguous.
                if not isinstance(newer, str) or not isinstance(older, str) or newer == older:
                    return None
                if newer < older:
                    continue
            checks[name] = item
        if not all(name in checks for name in REQUIRED):
            return None
        return checks

    @staticmethod
    def _green(checks):
        if not isinstance(checks, dict):
            return False
        for name, result in checks.items():
            if result.get("status") != "completed":
                return False
            conclusion = result.get("conclusion")
            if conclusion == "success" or (conclusion == "skipped" and name in OPTIONAL_SKIPS):
                continue
            return False
        return all(checks[name].get("conclusion") == "success" for name in REQUIRED)

    def _identity(self):
        pr, main = self._pr(), self._main()
        head = pr.get("head") if isinstance(pr.get("head"), dict) else {}
        base = pr.get("base") if isinstance(pr.get("base"), dict) else {}
        labels = pr.get("labels") if isinstance(pr.get("labels"), list) else []
        labels = [item.get("name", "") for item in labels if isinstance(item, dict)]
        main_commit = main.get("commit") if isinstance(main.get("commit"), dict) else {}
        title = pr.get("title")
        branch = head.get("ref")
        valid = (
            pr.get("number") == self.scope.pr_number
            and head.get("sha") == self.scope.head_sha
            and isinstance(head.get("repo"), dict)
            and head["repo"].get("full_name") == REPO
            and base.get("ref") == "main"
            and base.get("sha") == self.scope.main_sha
            and main_commit.get("sha") == self.scope.main_sha
            and pr.get("draft") is False
            and isinstance(title, str) and bool(_TITLE.fullmatch(title))
            and isinstance(branch, str) and bool(_BRANCH.fullmatch(branch))
            and "[HOLD]" not in title
            and not any("HOLD" in label.upper() for label in labels)
        )
        return pr, valid

    def analyze(self, state):
        _, valid = self._identity()
        return {"ok": valid}

    def implement(self, state):
        # This stage confirms already-reviewed, existing implementation; it
        # never edits source or executes arbitrary commands from a PR.
        return {"ok": self.scope.prepared_head_verified and self.analyze(state)["ok"]}

    def test(self, state):
        return {"passed": self._green(self._checks()) and self.analyze(state)["ok"]}

    def repair(self, state):
        # Only rerun a specific, previously pinned failed CI run; no code edits,
        # no unbounded provider retries and never retry pending runs.
        if not (self.scope.allow_ci_retry and self.scope.retry_run_id):
            return {"ok": False}
        run = self._github(f"actions/runs/{self.scope.retry_run_id}")
        if (not isinstance(run, dict) or run.get("head_sha") != self.scope.head_sha
                or run.get("status") != "completed" or run.get("conclusion") != "failure"):
            return {"ok": False}
        result = self._github(f"actions/runs/{self.scope.retry_run_id}/rerun-failed-jobs",
                              method="POST")
        # Github returns 201/202 + empty object on success. Immediate CI is
        # pending; a separate future invocation must review the outcome.
        return {"ok": False, "rerun_requested": isinstance(result, dict)}

    def evidence(self, state):
        pr, valid = self._identity()
        checks = self._checks()
        green = valid and self._green(checks)
        check_result = {}
        if isinstance(checks, dict):
            check_result = {name: ("success" if entry.get("status") == "completed"
                                  and entry.get("conclusion") == "success" else "not_green")
                            for name, entry in checks.items() if name in REQUIRED}
        mergeable = valid and pr.get("mergeable") is True and pr.get("mergeable_state") == "clean"
        return {
            "base_sha": self.scope.main_sha,
            "head_sha": self.scope.head_sha,
            "checks": check_result,
            "applicable_checks_green": green,
            "mergeable": mergeable,
            "trust_boundaries_clear": self.scope.trust_boundaries_clear,
            "scope_complete": self.scope.scope_complete and self.scope.prepared_head_verified,
            "current_main": valid,
            "no_active_hold": valid,
            "run_ids": [item.get("id") for item in checks.values() if isinstance(item.get("id"), int)]
                       if isinstance(checks, dict) else [],
        }

    def merge(self, state):
        expected = self.scope.head_sha
        if not self.scope.allow_merge or state.get("evidence", {}).get("head_sha") != expected:
            return {}
        # A worker may crash after the GitHub merge but before the SQLite
        # checkpoint. Reconcile that exact PR instead of merging again.
        pr = self._pr()
        if pr.get("merged") is True:
            sha = pr.get("merge_commit_sha")
            if (pr.get("head", {}).get("sha") == expected
                    and isinstance(sha, str) and _SHA.fullmatch(sha)):
                return {"merged": True, "sha": sha, "expected_head_sha": expected}
            return {}
        from auto_loop import merge_evidence_verified
        if not merge_evidence_verified(self.evidence(state)):
            return {}
        result = self._github(f"pulls/{self.scope.pr_number}/merge", method="PUT",
                              payload={"sha": expected, "merge_method": "squash"})
        if isinstance(result, dict) and result.get("merged") is True:
            sha = result.get("sha")
            if isinstance(sha, str) and _SHA.fullmatch(sha):
                return {"merged": True, "sha": sha, "expected_head_sha": expected}
        # Race/retry reconciliation after transport failure.
        pr = self._pr()
        sha = pr.get("merge_commit_sha")
        if (pr.get("merged") is True and pr.get("head", {}).get("sha") == expected
                and isinstance(sha, str) and _SHA.fullmatch(sha)):
            return {"merged": True, "sha": sha, "expected_head_sha": expected}
        return {}

    def _render(self, path):
        return self._call("GET", f"https://api.render.com/v1/{path}", self._render_token)

    def observe_deployment(self, state):
        merge_sha = state.get("merge_sha")
        if not isinstance(merge_sha, str) or not _SHA.fullmatch(merge_sha):
            return {}
        service = self._render(f"services/{RENDER_SERVICE}")
        if isinstance(service, dict) and "service" in service:
            service = service["service"]
        if (not isinstance(service, dict) or service.get("id") != RENDER_SERVICE
                or service.get("branch") != "main"
                or service.get("repo") != f"https://github.com/{REPO}"):
            return {}
        result = self._render(f"services/{RENDER_SERVICE}/deploys?limit=10")
        if not isinstance(result, list) or not result:
            return {}
        first = result[0]
        if not isinstance(first, dict):
            return {}
        first = first.get("deploy", first)
        if not isinstance(first, dict):
            return {}
        commit = first.get("commit", {})
        if (first.get("status") == "live" and isinstance(commit, dict)
                and commit.get("id") == merge_sha):
            return {"deployed": True, "deployed_sha": merge_sha}
        return {}

    def verify_runtime(self, state):
        merge_sha = state.get("merge_sha")
        if state.get("observed_sha") != merge_sha or not _SHA.fullmatch(merge_sha or ""):
            return {}
        if self.observe_deployment(state).get("deployed_sha") != merge_sha:
            return {}
        result = self._call("GET", HEALTH_URL, None)
        identity = result.get("runtimeIdentity", {}) if isinstance(result, dict) else {}
        ok = (isinstance(identity, dict) and result.get("status") == "ok"
              and identity.get("sourceSha") == merge_sha)
        return {"verified": ok, "deployed_sha": merge_sha if ok else ""}
