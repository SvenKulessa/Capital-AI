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

from provider_adapters import GitHubRenderActions, TrustedAssessment, SafeHTTP, MERGE_URL_RE

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
        self.title = "[CAPITAL-AI-PLATFORM] Example"
        self.change_after_checks = {}
        self.workflow_overrides = {}
        self.merged = False
        self.mergeable = True
        self.merge_state = "clean"
        self.deploy_sha = MERGE
        self.health_sha = MERGE
        self.mutation_count = 0
        self.checks = [
            {"id": 1, "name": "Docker Security Gate", "status": "completed", "conclusion": "success"},
            {"id": 2, "name": "Domain Governance", "status": "completed", "conclusion": "success"},
            {"id": 3, "name": "CodeQL", "status": "completed", "conclusion": "success"},
            {"id": 4, "name": "Supabase Preview", "status": "completed", "conclusion": "skipped"},
        ]
        for check in self.checks:
            check["head_sha"] = HEAD
            check["details_url"] = (f"https://github.com/SvenKulessa/Capital-AI/actions/runs/"
                                    f"{100 + check['id']}/job/{check['id']}")
            if check["name"] == "CodeQL":
                check["app"] = {"slug": "github-advanced-security", "id": 57789}
            else:
                check["app"] = {"slug": "github-actions", "id": 15368}

    def github(self, path, *, method="GET", body=None):
        self.calls.append((method, path))
        if method == "PUT":
            assert path == "/pulls/42/merge"
            assert body == {"sha": HEAD, "merge_method": "squash"}
            self.mutation_count += 1
            self.merged = True
            return {"merged": True, "sha": MERGE}
        if path == "/pulls/42":
            return {"number": 42, "title": self.title, "state": "open" if not self.merged else "closed",
                    "merged": self.merged, "merge_commit_sha": MERGE if self.merged else None,
                    "draft": False, "mergeable": self.mergeable,
                    "mergeable_state": self.merge_state, "changed_files": 2,
                    "head": {"sha": self.head, "ref": "capital-ai-platform/execution-first-20261115",
                             "repo": {"full_name": "SvenKulessa/Capital-AI"}},
                    "base": {"ref": "main", "sha": self.base}}
        if path == "/branches/main":
            return {"commit": {"sha": self.main}}
        if path in ("/actions/runs/101", "/actions/runs/102"):
            run_id = int(path.rsplit("/", 1)[-1])
            workflow_id, file = ((370506106, "build-security") if run_id == 101 else (371617040, "domain-governance"))
            return {"id": run_id, "workflow_id": workflow_id, "path": f".github/workflows/{file}.yml",
                    "head_sha": HEAD, "event": "pull_request", "status": "completed",
                    "conclusion": "success", **self.workflow_overrides}
        if path.startswith("/commits/") and path.endswith("/check-runs?per_page=100"):
            for field, value in self.change_after_checks.items():
                setattr(self, field, value)
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
                                   assessment=assessment, enable_merge=merge,
                                   approved_head_sha=HEAD if merge else None,
                                   approved_base_sha=MAIN if merge else None)

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

    def test_mergeable_true_with_blocked_native_merge_state_never_mutates(self):
        """GitHub's mergeable boolean may be true while protections still block."""
        loop = sys.modules["auto_loop"]
        for status in ("blocked", "behind", "dirty", "unknown", None):
            with self.subTest(mergeable_state=status):
                client = FakeHTTP()
                client.merge_state = status
                task = "blocked-native-" + str(status or "missing")
                state = loop.execute(self.adapter(client), loop.Authority(
                    allow_changes=True, allow_merge=True, max_repairs=0), task)
                self.assertEqual(state["status"], "MERGE_NOT_PROVEN")
                self.assertNotIn("merge", state["history"])
                self.assertEqual(client.mutation_count, 0)

    def test_optional_skips_do_not_block_but_unknown_skip_does(self):
        c = FakeHTTP()
        self.assertTrue(self.adapter(c)._checks(HEAD)[1])
        c.checks.append({"id": 5, "name": "Critical unknown", "head_sha": HEAD, "status": "completed", "conclusion": "skipped"})
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

    def test_check_name_requires_expected_app_and_exact_head(self):
        for case in ("wrong_source", "wrong_head", "missing_codeql", "wrong_codeql"):
            with self.subTest(case=case):
                client = FakeHTTP()
                if case == "wrong_source":
                    client.checks[0]["app"]["id"] = 1
                if case == "wrong_head":
                    client.checks[0]["head_sha"] = MAIN
                if case == "missing_codeql":
                    client.checks.pop(2)
                if case == "wrong_codeql":
                    client.checks[2]["app"]["id"] = 1
                self.assertFalse(self.adapter(client)._checks(HEAD)[1])

    def test_required_workflow_is_bound_to_job_head_and_workflow_identity(self):
        for override in ({"workflow_id": 1}, {"path": ".github/workflows/other.yml"},
                         {"head_sha": MAIN}, {"event": "push"}, {"id": 99}):
            with self.subTest(override=override):
                client = FakeHTTP()
                client.workflow_overrides = override
                self.assertFalse(self.adapter(client)._checks(HEAD)[1])
        client = FakeHTTP()
        client.checks[0]["details_url"] = client.checks[0]["details_url"].removesuffix("/1") + "/9"
        self.assertFalse(self.adapter(client)._checks(HEAD)[1])

    def test_provider_eligibility_change_during_ci_readback_prevents_put(self):
        for update in ({"merge_state": "blocked"}, {"title": "[HOLD: PRIVATE] Example"},
                       {"main": "d" * 40}, {"head": "d" * 40}):
            with self.subTest(update=update):
                client = FakeHTTP()
                adapter = self.adapter(client)
                evidence = adapter.evidence({})
                client.change_after_checks = update
                self.assertEqual(adapter.merge({"evidence": evidence}), {})
                self.assertEqual(client.mutation_count, 0)

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
        self.assertEqual(adapter.verify_runtime({
            "merge_sha": MERGE, "observed_sha": MERGE}), {})

    def test_exact_head_base_binding_is_required_for_mutation(self):
        with self.assertRaises(ValueError):
            GitHubRenderActions(FakeHTTP(), pr_number=42, assessment=GOOD, enable_merge=True)
        fake = FakeHTTP()
        adapter = self.adapter(fake)
        evidence = adapter.evidence({})
        fake.head = "d" * 40
        self.assertEqual(adapter.merge({"evidence": evidence}), {})
        self.assertEqual(fake.mutation_count, 0)

    def test_only_latest_active_render_deploy_can_be_verified(self):
        class Historical(FakeHTTP):
            def render(self, path):
                return [{"deploy": {"status": "live", "commit": {"id": "d" * 40}}},
                        {"deploy": {"status": "live", "commit": {"id": MERGE}}}]
        a = self.adapter(Historical())
        self.assertEqual(a.observe_deployment({"merge_sha": MERGE}), {})
        self.assertEqual(a.verify_runtime({
            "merge_sha": MERGE, "observed_sha": MERGE}), {})

    def test_traversal_and_unlisted_provider_paths_fail_closed(self):
        t = SafeHTTP(github_token="sample", render_token="sample")
        for path in ("/pulls/42/../../admin", "/actions/runs/1/jobs", "/actions/runs/01",
                     "/pulls/42?allow=1", "/commits/not-a-sha/check-runs?per_page=100"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                t.github(path)
        with self.assertRaises(ValueError):
            t.github("/actions/runs/101", method="PUT")
        for path in ("/deploys/../secrets", "/deploys?limit=100"):
            with self.assertRaises(ValueError):
                t.render(path)

    def test_merge_url_regex_does_not_match_spoofed_host(self):
        self.assertIsNotNone(MERGE_URL_RE.fullmatch(
            "https://api.github.com/repos/SvenKulessa/Capital-AI/pulls/42/merge"))
        for spoof in ("https://apiXgithubYcom/repos/SvenKulessa/Capital-AI/pulls/42/merge",
                      "https://api.githubXcom/repos/SvenKulessa/Capital-AI/pulls/42/merge"):
            self.assertIsNone(MERGE_URL_RE.fullmatch(spoof))

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
