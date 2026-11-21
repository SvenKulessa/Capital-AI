"""Provider-free negative tests for the read-only CI supervisor bridge."""
from __future__ import annotations

from unittest.mock import patch
import unittest

from continuous_pr_supervisor import Candidate, serve
from trusted_ci_round_adapter import TrustedCIReadback
from provider_adapters import CHECK_SOURCES, GitHubRenderActions, REPO, TrustedAssessment

HEAD = "a" * 40
MAIN = "b" * 40
CANDIDATE = Candidate(17, HEAD)


def check(name, number, state="completed", result="success", head=HEAD):
    app_slug, app_id = CHECK_SOURCES.get(name, ("github-actions", 15368))
    return {"name": name, "id": number, "head_sha": head,
            "app": {"slug": app_slug, "id": app_id}, "status": state,
            "conclusion": result if state == "completed" else None}


def all_green():
    return [
        check("Docker Security Gate", 1), check("Domain Governance", 2),
        check("CodeQL", 3), check("Analyze (python)", 4),
    ]


class HTTP:
    def __init__(self, runs=None):
        self.runs = list(runs) if runs is not None else all_green()
        self.paths = []

    def github(self, path):
        self.paths.append(path)
        return {"total_count": len(self.runs), "check_runs": list(self.runs)}


class FakeActions:
    permitted = True
    verified = True

    def __init__(self, http, *, pr_number, assessment, enable_merge):
        if enable_merge is not False:
            raise AssertionError("write scope")
        self.pr_number = pr_number

    def _current(self, *, observe_dependabot=False):
        if observe_dependabot is not True or not self.permitted:
            raise ValueError("stale PR")
        return ({"head": {"sha": HEAD}, "base": {"sha": MAIN}}, MAIN)

    def _checks(self, head):
        if not self.verified or head != HEAD:
            return ({}, False, [])
        return ({"Docker Security Gate": "success",
                 "Domain Governance": "success"}, True, [1, 2])


class TrustedCIReadbackTests(unittest.TestCase):
    def adapter(self, http, **kwargs):
        log = []
        selector = kwargs.get("selector", lambda excluded:
                              CANDIDATE if CANDIDATE.key not in excluded else None)
        adapter = TrustedCIReadback(http, select_candidate=selector,
                                   record_result=lambda *args: log.append(args))
        return adapter, log

    def test_completed_checks_require_independent_provenance(self):
        http = HTTP()
        adapter, logs = self.adapter(http)
        with patch("trusted_ci_round_adapter.GitHubRenderActions", FakeActions):
            self.assertEqual(adapter.read_ci(CANDIDATE).state, "READY")
            self.assertEqual(adapter.execute_one(CANDIDATE), "READ_ONLY_COMPLETE")
            adapter.record_cycle(CANDIDATE, "READ_ONLY_COMPLETE")
        self.assertEqual(logs, [(17, HEAD, "READ_ONLY_COMPLETE")])
        self.assertTrue(all(x == "/commits/" + HEAD + "/check-runs?per_page=100"
                            for x in http.paths))

    def test_current_same_repository_dependabot_is_observable_without_merge_authority(self):
        class DependabotHTTP(HTTP):
            login = "dependabot[bot]"
            repository = REPO

            def github(self, path):
                if path == "/pulls/17":
                    return {
                        "number": 17, "state": "open", "draft": False,
                        "title": "[CAPITAL-AI-TRUST] Dependency update",
                        "user": {"login": self.login, "type": "Bot"},
                        "head": {"sha": HEAD, "ref": "dependabot/npm_and_yarn/routine",
                                 "repo": {"full_name": self.repository}},
                        "base": {"ref": "main", "sha": MAIN},
                    }
                if path == "/branches/main":
                    return {"commit": {"sha": MAIN}}
                return super().github(path)

        http = DependabotHTTP([check("Docker Security Gate", 1, "in_progress"),
                               check("Domain Governance", 2)])
        adapter, _ = self.adapter(http)
        self.assertEqual(adapter.read_ci(CANDIDATE).state, "PENDING")
        mutation = GitHubRenderActions(http, pr_number=17, assessment=TrustedAssessment(),
                                      enable_merge=True, approved_head_sha=HEAD, approved_base_sha=MAIN)
        with self.assertRaises(ValueError):
            mutation._current(observe_dependabot=True)
        http.login = "another[bot]"
        self.assertEqual(adapter.read_ci(CANDIDATE).state, "NOT_PROVEN")
        http.login, http.repository = "dependabot[bot]", "example/fork"
        self.assertEqual(adapter.read_ci(CANDIDATE).state, "NOT_PROVEN")

    def test_pending_waits_30_seconds_and_stop_interrupts_cycle(self):
        http = HTTP([check("Docker Security Gate", 1, "in_progress"),
                     check("Domain Governance", 2)])
        adapter, logs = self.adapter(http)
        stopped = [False]
        def wait(seconds):
            self.assertEqual(seconds, 30)
            stopped[0] = True
        with patch("trusted_ci_round_adapter.GitHubRenderActions", FakeActions):
            self.assertEqual(serve(adapter, stop_requested=lambda: stopped[0], sleep=wait), 0)
        self.assertEqual(logs, [])

    def test_source_spoof_and_head_mismatch_denied(self):
        for runs in [
            [check("Docker Security Gate", 1, head=MAIN), check("Domain Governance", 2)],
            [check("Docker Security Gate", 1), check("Domain Governance", 2),
             check("Docker Security Gate", 8)],
            [dict(check("Docker Security Gate", 1), app={"slug": "unknown", "id": 12}),
             check("Domain Governance", 2)],
        ]:
            http = HTTP(runs)
            adapter, _ = self.adapter(http)
            with patch("trusted_ci_round_adapter.GitHubRenderActions", FakeActions):
                self.assertEqual(adapter.read_ci(CANDIDATE).state, "NOT_PROVEN")

    def test_failed_or_unknown_checks_not_ready(self):
        cases = [
            (HTTP([check("Docker Security Gate", 1, result="failure"),
                   check("Domain Governance", 2)]), "FAILED"),
            (HTTP([check("Docker Security Gate", 1)]), "NOT_PROVEN"),
            (HTTP([check("Docker Security Gate", 1),
                   check("Domain Governance", 2), check("CodeQL", 3, result="neutral")]), "FAILED"),
        ]
        with patch("trusted_ci_round_adapter.GitHubRenderActions", FakeActions):
            for http, state in cases:
                self.assertEqual(self.adapter(http)[0].read_ci(CANDIDATE).state, state)

    def test_proven_failure_takes_precedence_over_pending_optional_check(self):
        # Existing failed required status is terminal even if CodeQL is queued.
        http = HTTP([
            check("Docker Security Gate", 1, result="failure"),
            check("Domain Governance", 2),
            check("CodeQL", 3, state="in_progress"),
        ])
        adapter, log = self.adapter(http)
        with patch("trusted_ci_round_adapter.GitHubRenderActions", FakeActions):
            self.assertEqual(adapter.read_ci(CANDIDATE).state, "FAILED")
            self.assertEqual(serve(adapter, stop_requested=lambda: False,
                                   sleep=lambda _: self.fail("unnecessary CI wait"),
                                   max_cycles=1), 1)
        self.assertEqual(log, [(17, HEAD, "BLOCKED")])

    def test_stale_pr_and_source_validator_fail_closed(self):
        http = HTTP()
        adapter, _ = self.adapter(http)
        with patch("trusted_ci_round_adapter.GitHubRenderActions", FakeActions):
            with patch.object(FakeActions, "permitted", False):
                self.assertEqual(adapter.read_ci(CANDIDATE).state, "NOT_PROVEN")
            with patch.object(FakeActions, "verified", False):
                self.assertEqual(adapter.read_ci(CANDIDATE).state, "NOT_PROVEN")
        self.assertEqual(adapter.read_ci(object()).state, "NOT_PROVEN")

    def test_unsupported_callback_and_result_denied(self):
        with self.assertRaises(ValueError):
            TrustedCIReadback(HTTP(), select_candidate=None, record_result=lambda *args: None)
        adapter, log = self.adapter(HTTP(), selector=lambda ignored: "not a Candidate")
        with self.assertRaises(ValueError):
            adapter.next_candidate(frozenset())
        with self.assertRaises(ValueError):
            adapter.record_cycle(CANDIDATE, "MERGED")
        self.assertEqual(log, [])

    def test_ready_after_poll_never_merges_or_deploys(self):
        http = HTTP([check("Docker Security Gate", 1, "queued"),
                     check("Domain Governance", 2)])
        adapter, log = self.adapter(http)
        rounds = [0]
        def sleep(_seconds):
            rounds[0] += 1
            http.runs = all_green()
        with patch("trusted_ci_round_adapter.GitHubRenderActions", FakeActions):
            self.assertEqual(serve(adapter, stop_requested=lambda: False,
                                   sleep=sleep, max_cycles=1), 1)
        self.assertEqual(rounds, [1])
        self.assertEqual(log, [(17, HEAD, "READ_ONLY_COMPLETE")])
        self.assertTrue(all(path.startswith("/commits/") for path in http.paths))


if __name__ == "__main__":
    unittest.main()
