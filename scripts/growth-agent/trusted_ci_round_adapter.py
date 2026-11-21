"""Read-only, non-activating binding of CI evidence to the continuous PR supervisor.

The trusted host injects a *trusted* candidate selector, an existing SafeHTTP
instance and private evidence recorder. No credentials are acquired here.
No terminal, GitHub write, merge, deploy, or background process is started.
Never pass PR/LLM text to selector as authority.
"""
from __future__ import annotations

from continuous_pr_supervisor import Candidate, CheckReadback
from provider_adapters import (
    CHECK_SOURCES, REQUIRED, OPTIONAL_SKIP, GitHubRenderActions, TrustedAssessment,
)


class TrustedCIReadback:
    def __init__(self, http, *, select_candidate, record_result):
        if not callable(select_candidate) or not callable(record_result):
            raise ValueError("trusted selection and recorder callbacks required")
        self.http = http
        self.select_candidate = select_candidate
        self.record_result = record_result

    def next_candidate(self, already_processed):
        if not isinstance(already_processed, frozenset):
            raise ValueError("invalid processed scope")
        candidate = self.select_candidate(already_processed)
        if candidate is not None and not isinstance(candidate, Candidate):
            raise ValueError("selection is not a bound candidate")
        return candidate

    def read_ci(self, candidate):
        if not isinstance(candidate, Candidate):
            return CheckReadback("", "NOT_PROVEN")
        sha = candidate.head_sha
        try:
            # PR/branch/current-main checks are provided by the existing trusted adapter.
            actions = GitHubRenderActions(self.http, pr_number=candidate.pr_number,
                                          assessment=TrustedAssessment(), enable_merge=False)
            pr, main_sha = actions._current()
            if pr["head"]["sha"] != sha or pr["base"]["sha"] != main_sha:
                return CheckReadback(sha, "NOT_PROVEN")
            data = self.http.github(f"/commits/{sha}/check-runs?per_page=100")
            runs = data.get("check_runs") if isinstance(data, dict) else None
            if (not isinstance(runs, list) or not 1 <= len(runs) <= 100
                    or type(data.get("total_count")) is not int or data["total_count"] != len(runs)):
                return CheckReadback(sha, "NOT_PROVEN")
            states = {}
            seen_ids = set()
            for run in runs:
                if not isinstance(run, dict):
                    return CheckReadback(sha, "NOT_PROVEN")
                name, app = run.get("name"), run.get("app")
                run_id = run.get("id")
                if (not isinstance(name, str) or type(run_id) is not int or run_id <= 0
                        or run_id in seen_ids or name in states or run.get("head_sha") != sha):
                    return CheckReadback(sha, "NOT_PROVEN")
                seen_ids.add(run_id)
                if name in CHECK_SOURCES and (
                        not isinstance(app, dict)
                        or (app.get("slug"), app.get("id")) != CHECK_SOURCES[name]):
                    return CheckReadback(sha, "NOT_PROVEN")
                status, conclusion = run.get("status"), run.get("conclusion")
                if status in ("queued", "in_progress", "pending", "waiting", "requested"):
                    states[name] = "PENDING"
                elif status == "completed":
                    states[name] = ("SUCCESS" if conclusion == "success" or
                                    (conclusion == "skipped" and name in OPTIONAL_SKIP)
                                    else "FAILED")
                else:
                    return CheckReadback(sha, "NOT_PROVEN")
            if not all(name in states for name in REQUIRED):
                return CheckReadback(sha, "NOT_PROVEN")
            # Actual pending evidence, not absence of required evidence.
            if "PENDING" in states.values():
                return CheckReadback(sha, "PENDING")
            if "FAILED" in states.values():
                return CheckReadback(sha, "FAILED")
            checks, ok, _ = actions._checks(sha)
            if not ok or any(checks.get(name) != "success" for name in REQUIRED):
                return CheckReadback(sha, "NOT_PROVEN")
            return CheckReadback(sha, "READY")
        except Exception:
            # Fail closed; no provider responses or secrets in persisted state.
            return CheckReadback(sha, "NOT_PROVEN")

    def execute_one(self, candidate):
        # Even after READY a second independent provider read is required.
        # This bridge is deliberately read-only. A future privileged executor
        # must use the existing exact-SHA private assessment, not this result.
        return ("READ_ONLY_COMPLETE" if self.read_ci(candidate).state == "READY"
                else "NOT_PROVEN")

    def record_cycle(self, candidate, result):
        if (not isinstance(candidate, Candidate) or
                result not in {"READ_ONLY_COMPLETE", "BLOCKED", "NOT_PROVEN"}):
            raise ValueError("untrusted cycle result")
        # Caller owns private durable evidence; this class never writes files.
        self.record_result(candidate.pr_number, candidate.head_sha, result)
