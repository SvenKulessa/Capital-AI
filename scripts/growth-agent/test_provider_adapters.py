"""Offline negative and positive tests for production GitHub/Render adapter."""
import importlib.util
from pathlib import Path
import sys
import unittest

root = Path(__file__).parent
for name in ("auto_loop", "provider_adapters"):
    spec = importlib.util.spec_from_file_location(name, root / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)

from provider_adapters import GitHubRenderActions, TrustedAssessment, SafeHTTP

MAIN = "a" * 40
HEAD = "b" * 40
MERGE = "c" * 40
GOOD = TrustedAssessment(True, True, True, True)


class FakeHTTP:
    def __init__(self):
        self.calls = []
        self.main = MAIN
        self.head = HEAD
        self.base = MAIN
        self.status = "success"
        self.merged = False
        self.mergeable = True
        self.deploy_sha = MERGE
        self.health_sha = MERGE
        self.mutation_count = 0
        self.checks = [
            {"id": 1, "name": "Docker Security Gate", "status": "completed", "conclusion": "success"},
            {"id": 2, "name": "Domain Governance", "status": "completed", "conclusion": "success"},
            {"id": 3, "name": "CodeQL", "status": "completed", "conclusion": "success"},
            {"id": 4, "name": "Supabase Preview", "status": "completed", "conclusion": "skipped"},
        ]

    def github(self, path, *, method="GET", body=None):
        self.calls.append((method, path))
        if method == "PUT":
            assert path == "/pulls/42/merge"
            assert body == {"sha": HEAD, "merge_method": "squash"}
            self.mutation_count += 1
            self.merged = True
            return {"merged": True, "sha": MERGE}
        if path == "/pulls/42":
            return {"state": "open" if not self.merged else "closed",
                    "merged": self.merged, "merge_commit_sha": MERGE if self.merged else None,
                    "draft": False, "mergeable": self.mergeable, "changed_files": 2,
                    "head": {"sha": self.head, "ref": "capital-ai-platform/execution-first-20261115",
                             "repo": {"full_name": "SvenKulessa/Capital-AI"}},
                    "base": {"ref": "main", "sha": self.base}}
        if path == "/branches/main":
            return {"commit": {"sha": self.main}}
        if path.startswith("/commits/") and path.endswith("/check-runs?per_page=100"):
            return {"total_count": len(self.checks),
                    "check_runs": self.checks}
        raise ValueError("unexpected path: " + path)

    def render(self, path):
        self.calls.append(("render", path))
        return [{"deploy": {"status": "live", "commit": {"id": self.deploy_sha}}}]

    def health(self):
        self.calls.append(("health", "/healthz"))
        return {"status": "ok", "ingress": "fail_closed",
                "runtimeIdentity": {"sourceSha": self.health_sha}}


class ProviderAdapterTests(unittest.TestCase):
    def adapter(self, client=None, assessment=GOOD, merge=True):
        return GitHubRenderActions(client or FakeHTTP(), pr_number=42,
                                   assessment=assessment, enable_merge=merge)

    def test_real_graph_integration_with_trusted_fake_transport(self):
        client = FakeHTTP()
        a = self.adapter(client)
        loop = sys.modules["auto_loop"]
        state = loop.execute(a, loop.Authority(allow_changes=True, allow_merge=True,
                                               observe_existing_deploy=True), "test-integration-42")
        self.assertEqual(state["status"], "VERIFIED")
        self.assertEqual(client.mutation_count, 1)
        self.assertEqual(state["merge_sha"], MERGE)
        self.assertIn(("health", "/healthz"), client.calls)

    def test_adapter_does_not_merge_when_authority_missing(self):
        client = FakeHTTP()
        a = self.adapter(client, merge=False)
        loop = sys.modules["auto_loop"]
        result = loop.execute(a, loop.Authority(allow_changes=True, allow_merge=True), "test-denied-42")
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(client.mutation_count, 0)

    def test_untrusted_assessment_is_rejected(self):
        with self.assertRaises(TypeError):
            GitHubRenderActions(FakeHTTP(), pr_number=42, assessment={"scope_complete": True})
        with self.assertRaises(ValueError):
            GitHubRenderActions(FakeHTTP(), pr_number=True, assessment=GOOD)

    def test_all_required_gates_fail_closed(self):
        loop = sys.modules["auto_loop"]
        for status, name in [("failure", "Docker Security Gate"), ("cancelled", "CodeQL"),
                             ("pending", "Domain Governance")]:
            with self.subTest(status=status, name=name):
                c = FakeHTTP()
                for run in c.checks:
                    if run["name"] == name:
                        run["conclusion"] = status
                        if status == "pending":
                            run["status"] = "in_progress"
                out = loop.execute(self.adapter(c), loop.Authority(allow_changes=True,
                                   allow_merge=True, max_repairs=0), f"test-{status}-{name.replace(' ', '-')}")
                self.assertNotIn("merge", out["history"])
                self.assertEqual(c.mutation_count, 0)

    def test_optional_skips_do_not_block_but_unknown_skip_does(self):
        c = FakeHTTP()
        self.assertTrue(self.adapter(c)._checks(HEAD)[1])
        c.checks.append({"id": 5, "name": "Critical unknown", "status": "completed", "conclusion": "skipped"})
        self.assertFalse(self.adapter(c)._checks(HEAD)[1])

    def test_duplicate_or_truncated_check_results_fail_closed(self):
        c = FakeHTTP()
        c.checks.append(c.checks[0].copy())
        self.assertFalse(self.adapter(c)._checks(HEAD)[1])
        class Truncated(FakeHTTP):
            def github(self, path, *, method="GET", body=None):
                result = super().github(path, method=method, body=body)
                if "check-runs?" in path:
                    result["total_count"] += 1
                return result
        with self.assertRaises(ValueError):
            self.adapter(Truncated())._checks(HEAD)

    def test_base_changed_between_evidence_and_merge_no_mutation(self):
        client = FakeHTTP()
        adapter = self.adapter(client)
        evidence = adapter.evidence({})
        client.main = "d" * 40
        self.assertEqual(adapter.merge({"evidence": evidence}), {})
        self.assertEqual(client.mutation_count, 0)

    def test_already_merged_is_idempotent_after_crash(self):
        client = FakeHTTP()
        adapter = self.adapter(client)
        evidence = adapter.evidence({})
        client.merged = True  # Remote merge committed before process lost state.
        result = adapter.merge({"evidence": evidence})
        self.assertEqual(result["sha"], MERGE)
        self.assertEqual(client.mutation_count, 0)

    def test_drifted_runtime_does_not_become_verified(self):
        c = FakeHTTP()
        adapter = self.adapter(c)
        c.deploy_sha = "d" * 40
        self.assertEqual(adapter.observe_deployment({"merge_sha": MERGE}), {})
        c.deploy_sha = MERGE
        c.health_sha = "d" * 40
        self.assertEqual(adapter.verify_runtime({"merge_sha": MERGE}), {})

    def test_no_redirect_or_other_domain_or_manual_deploy(self):
        t = SafeHTTP(github_token="sample", render_token="sample")
        for url, kwargs in [
            ("https://evil.example/healthz", {}),
            ("http://capital-ai.online/healthz", {}),
            ("https://api.render.com/v1/services/srv-wrong/deploys", {}),
            ("https://api.render.com/v1/services/srv-dau1rp893c1s73cdhm1g/deploys", {"method": "PUT"}),
        ]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                t._request(url, **kwargs)


if __name__ == "__main__":
    unittest.main()
