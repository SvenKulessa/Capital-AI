"""Network-isolated integration and negative tests for actual provider adapters."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).parent))
import auto_loop as loop
import trusted_provider_actions as provider

HEAD = "b" * 40
MAIN = "a" * 40
MERGED = "c" * 40
GITHUB = "https://api.github.com/repos/SvenKulessa/Capital-AI/"
RENDER = "https://api.render.com/v1/"


def scope(**kwargs):
    values = {"pr_number": 913, "head_sha": HEAD, "main_sha": MAIN}
    values.update(kwargs)
    return provider.ProviderScope(**values)


class FakeTransport:
    def __init__(self):
        self.requests = []
        self.pr = {
            "number": 913, "title": "[CAPITAL-AI-PLATFORM] Tested provider integration",
            "draft": False, "merged": False, "mergeable": True, "mergeable_state": "clean",
            "labels": [],
            "head": {"sha": HEAD, "ref": "capital-ai-platform/trusted-actions-20261115",
                     "repo": {"full_name": provider.REPO}},
            "base": {"sha": MAIN, "ref": "main"}
        }
        self.checks = [
            {"name": "Docker Security Gate", "head_sha": HEAD, "status": "completed", "conclusion": "success", "id": 11},
            {"name": "Domain Governance", "head_sha": HEAD, "status": "completed", "conclusion": "success", "id": 12},
            {"name": "CodeQL", "head_sha": HEAD, "status": "completed", "conclusion": "success", "id": 13},
            {"name": "Supabase Preview", "head_sha": HEAD, "status": "completed", "conclusion": "skipped", "id": 14},
        ]
        self.current_main = MAIN
        self.render_sha = MERGED
        self.health_sha = MERGED
        self.rerun_status = "failure"
        self.raise_on_merge = False
        self.merged_count = 0

    def request(self, method, url, token, payload=None):
        self.requests.append((method, url, payload))
        if url == GITHUB + "pulls/913" and method == "GET":
            return self.pr
        if url == GITHUB + "branches/main":
            return {"commit": {"sha": self.current_main}}
        if url == GITHUB + f"commits/{HEAD}/check-runs?per_page=100":
            return {"total_count": len(self.checks), "check_runs": self.checks}
        if url == GITHUB + "pulls/913/merge" and method == "PUT":
            if self.raise_on_merge:
                self.pr["merged"] = True
                self.pr["merge_commit_sha"] = MERGED
                raise ConnectionError("SECRET-NEVER-LEAK")
            if payload != {"sha": HEAD, "merge_method": "squash"}:
                raise AssertionError("missing expected SHA")
            self.merged_count += 1
            self.pr["merged"] = True
            self.pr["merge_commit_sha"] = MERGED
            return {"merged": True, "sha": MERGED}
        if url == RENDER + f"services/{provider.RENDER_SERVICE}":
            return {"id": provider.RENDER_SERVICE, "branch": "main",
                    "repo": "https://github.com/SvenKulessa/Capital-AI"}
        if url == RENDER + f"services/{provider.RENDER_SERVICE}/deploys?limit=10":
            return [{"deploy": {"status": "live", "commit": {"id": self.render_sha}}}]
        if url == provider.HEALTH_URL:
            return {"status": "ok", "runtimeIdentity": {"sourceSha": self.health_sha}}
        if url == GITHUB + "actions/runs/42":
            return {"head_sha": HEAD, "status": "completed", "conclusion": self.rerun_status}
        if url == GITHUB + "actions/runs/42/rerun-failed-jobs" and method == "POST":
            return {}
        raise AssertionError("unexpected URL (fail-closed): " + url)


def adapter(fake=None, **scope_values):
    return provider.TrustedGitHubRenderActions(
        scope(**scope_values), github_token="dummy-gh", render_token="dummy-render",
        transport=fake or FakeTransport()
    )


class ProviderTests(unittest.TestCase):
    def test_live_provider_graph_end_to_end_with_exact_sha(self):
        fake = FakeTransport()
        actions = adapter(fake, prepared_head_verified=True, scope_complete=True,
                          trust_boundaries_clear=True, allow_merge=True)
        s = loop.execute(actions, loop.Authority(
            allow_changes=True, allow_merge=True, observe_existing_deploy=True), "provider:test")
        self.assertEqual(s["status"], "VERIFIED")
        self.assertEqual(s["merge_sha"], MERGED)
        self.assertEqual(fake.merged_count, 1)
        self.assertTrue(all("dummy-" not in str(s) for _ in range(1)))
        self.assertFalse(any(method == "POST" and "deploys" in url for method, url, _ in fake.requests))

    def test_green_checks_not_permission_to_merge(self):
        fake = FakeTransport()
        actions = adapter(fake, prepared_head_verified=True, scope_complete=True,
                          trust_boundaries_clear=True)
        s = loop.execute(actions, loop.Authority(allow_changes=True, allow_merge=True), "test:permission")
        self.assertEqual(s["status"], "BLOCKED")
        self.assertEqual(fake.merged_count, 0)

    def test_missing_risk_or_scope_attestation_blocks_merges(self):
        for missing in ("trust_boundaries_clear", "scope_complete", "prepared_head_verified"):
            with self.subTest(missing=missing):
                values = {"prepared_head_verified": True, "scope_complete": True,
                          "trust_boundaries_clear": True, "allow_merge": True}
                values[missing] = False
                fake = FakeTransport()
                a = adapter(fake, **values)
                result = loop.execute(a, loop.Authority(
                    allow_changes=True, allow_merge=True), "test:" + missing)
                self.assertIn(result["status"], ("BLOCKED", "MERGE_NOT_PROVEN"))
                self.assertEqual(fake.merged_count, 0)

    def test_rejects_changed_head_main_and_hold(self):
        for kind in ("head", "main", "hold", "draft"):
            with self.subTest(kind=kind):
                f = FakeTransport()
                if kind == "head":
                    f.pr["head"]["sha"] = "d" * 40
                elif kind == "main":
                    f.current_main = "e" * 40
                elif kind == "hold":
                    f.pr["labels"] = [{"name": "P0-HOLD"}]
                elif kind == "draft":
                    f.pr["draft"] = True
                a = adapter(f, prepared_head_verified=True, scope_complete=True,
                            trust_boundaries_clear=True, allow_merge=True)
                self.assertFalse(a.analyze({})["ok"])
                self.assertFalse(loop.merge_evidence_verified(a.evidence({})))
                self.assertFalse(a.merge({"evidence": {"head_sha": HEAD}}))

    def test_pending_skipped_failed_required_or_codeql_never_green(self):
        for case in ("pending", "required_skipped", "codeql_failure", "unknown_skipped"):
            with self.subTest(case=case):
                f = FakeTransport()
                if case == "pending":
                    f.checks[0]["status"] = "in_progress"
                if case == "required_skipped":
                    f.checks[1]["conclusion"] = "skipped"
                if case == "codeql_failure":
                    f.checks[2]["conclusion"] = "failure"
                if case == "unknown_skipped":
                    f.checks.append({"name": "Security Audit", "status": "completed", "conclusion": "skipped"})
                a = adapter(f, prepared_head_verified=True, scope_complete=True,
                            trust_boundaries_clear=True, allow_merge=True)
                self.assertFalse(a.test({})["passed"])
                self.assertFalse(loop.merge_evidence_verified(a.evidence({})))

    def test_missing_check_pages_fail_closed(self):
        f = FakeTransport()
        class Truncated(FakeTransport):
            def request(self, method, url, token, payload=None):
                value = super().request(method, url, token, payload)
                if "check-runs" in url:
                    value["total_count"] = 101
                return value
        a = adapter(Truncated(), prepared_head_verified=True)
        self.assertFalse(a.test({})["passed"])

    def test_merge_transport_failure_reconciles_without_duplicate_mutation(self):
        f = FakeTransport()
        f.raise_on_merge = True
        a = adapter(f, prepared_head_verified=True, scope_complete=True,
                    trust_boundaries_clear=True, allow_merge=True)
        result = a.merge({"evidence": {"head_sha": HEAD}})
        self.assertEqual(result["sha"], MERGED)
        self.assertEqual(len([x for x in f.requests if x[0] == "PUT"]), 1)
        second = a.merge({"evidence": {"head_sha": HEAD}})
        self.assertEqual(second["sha"], MERGED)
        self.assertEqual(len([x for x in f.requests if x[0] == "PUT"]), 1)

    def test_runtime_wrong_sha_or_unavailable_denies_verified(self):
        for key in ("render", "health"):
            f = FakeTransport()
            if key == "render":
                f.render_sha = "d" * 40
            else:
                f.health_sha = "d" * 40
            a = adapter(f)
            self.assertFalse(a.verify_runtime({"merge_sha": MERGED,
                                               "observed_sha": MERGED}).get("verified", False))

    def test_ci_retry_is_pinned_and_only_for_failed_run(self):
        f = FakeTransport()
        a = adapter(f, allow_ci_retry=True, retry_run_id=42)
        result = a.repair({})
        self.assertTrue(result["rerun_requested"])
        self.assertFalse(result["ok"])
        f.rerun_status = "in_progress"
        result = a.repair({})
        self.assertFalse(result["ok"])
        self.assertEqual(len([x for x in f.requests if "rerun-failed-jobs" in x[1]]), 1)

    def test_scope_does_not_allow_other_domains_or_services(self):
        for values in ({"repo": "attacker/private"}, {"render_service": "srv-other"},
                       {"health_url": "http://capital-ai.online/healthz"},
                       {"head_sha": "wrong"}, {"main_sha": "wrong"}):
            with self.subTest(values=values), self.assertRaises(ValueError):
                scope(**values)

    def test_real_transport_rejects_cross_host_redirection_without_network(self):
        t = provider.HttpJsonTransport()
        for url in ("http://api.github.com/repos/a/b", "https://evil.example.com/",
                    "https://capital-ai.online/admin",
                    "https://api.render.com:444/v1/services/srv", "https://capital-ai.online/healthz?x=1"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                t.request("GET", url, None)

    def test_no_provider_tokens_persist_in_sqlite(self):
        f = FakeTransport()
        a = adapter(f, prepared_head_verified=True, scope_complete=True,
                    trust_boundaries_clear=True, allow_merge=True)
        with tempfile.TemporaryDirectory() as d:
            path = str(Path(d, "checkpoint.sqlite"))
            s = loop.execute_durable(a, loop.Authority(allow_changes=True, allow_merge=True),
                                     "persistence:provider", path)
            self.assertEqual(s["status"], "MERGED")
            self.assertNotIn(b"dummy-gh", Path(path).read_bytes())
            self.assertNotIn(b"dummy-render", Path(path).read_bytes())
            resumed_fake = FakeTransport()
            b = adapter(resumed_fake, prepared_head_verified=True, scope_complete=True,
                        trust_boundaries_clear=True, allow_merge=True)
            again = loop.execute_durable(b, loop.Authority(allow_changes=True, allow_merge=True),
                                         "persistence:provider", path)
            self.assertEqual(s, again)
            self.assertEqual(resumed_fake.requests, [])


if __name__ == "__main__":
    unittest.main()
