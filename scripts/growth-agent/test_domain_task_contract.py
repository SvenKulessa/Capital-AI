"""TRUST/QUALITY: shared non-authorizing scope/profile identity across graphs."""
from __future__ import annotations

from dataclasses import FrozenInstanceError
from pathlib import Path
import shutil
import tempfile
import unittest

from auto_loop import execute_bound_durable_readonly, execute_bound_readonly, build_graph, Authority
from domain_profile_binding import DOMAINS, REPOSITORY, SOURCES, bind_domain_task
from offline_scope import scoped_thread_id

REPO = Path(__file__).resolve().parents[2]
TASK = {"schema": "CAPITAL_AI_OFFLINE_RESEARCH@1", "task_id": "case-895",
        "domain": "TRUST", "query": "offline checkpoint"}


class Observer:
    def __init__(self):
        self.calls = []

    def analyze(self, state):
        self.calls.append("analyze")
        return {"ok": True, "allow_merge": True, "allow_changes": True}

    def evidence(self, state):
        self.calls.append("evidence")
        return {"permissionExpansion": True}

    def implement(self, state):
        self.calls.append("FORBIDDEN_IMPLEMENT")
        return {"ok": True}

    def merge(self, state):
        self.calls.append("FORBIDDEN_MERGE")
        return {"merged": True}


def fixture(root):
    for relative in SOURCES:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(REPO / relative, path)


class BoundDomainTaskTests(unittest.TestCase):
    def binding(self, task=None, repo_root=REPO, tenant="owner-local", repository=REPOSITORY):
        return bind_domain_task(repo_root, tenant=tenant, repository=repository,
                                task=TASK if task is None else task)

    def test_all_five_domains_share_worker_identity_without_permissions(self):
        for domain in DOMAINS:
            task = {**TASK, "domain": domain}
            binding = self.binding(task=task)
            expected = scoped_thread_id(
                tenant="owner-local", repository=REPOSITORY, task_id=task["task_id"],
                payload={**task, "bundle_sha256": binding.bundle_sha256},
            )
            with self.subTest(domain=domain):
                self.assertEqual(binding.thread_id, expected)
                self.assertEqual(binding.skills, (
                    domain.lower() + "-engineering", domain.lower() + "-advisory"))
                self.assertTrue(binding.matches_state(binding.initial_state()))
                self.assertEqual(len(binding.profile_sha256), 64)
                with self.assertRaises(FrozenInstanceError):
                    binding.domain = "GROWTH"

    def test_readonly_auto_loop_denies_all_mutating_callbacks(self):
        observer = Observer()
        result = execute_bound_readonly(observer, REPO, TASK)
        self.assertEqual(result["status"], "READ_ONLY_COMPLETE")
        self.assertEqual(observer.calls, ["analyze", "evidence"])
        self.assertNotIn("allow_merge", result)
        self.assertNotIn("permissionExpansion", result.get("evidence", {}))
        self.assertEqual(result["profile_skills"], ["trust-engineering", "trust-advisory"])

    def test_untrusted_scope_provider_and_online_claims_fail_closed(self):
        invalid = (
            {**TASK, "tenant": "customer-b"},
            {**TASK, "repository": "Other/Repo"},
            {**TASK, "mode": "ONLINE"},
            {**TASK, "grantMerge": True},
            {**TASK, "task_id": "id\u202e"},
            {**TASK, "domain": "UNKNOWN"},
            {**TASK, "query": ""},
        )
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                self.binding(task=payload)
        with self.assertRaises(ValueError):
            self.binding(repository="Other/Repo")
        with self.assertRaises(ValueError):
            self.binding(tenant="../customer")

    def test_scope_and_profile_change_rotate_thread_identity(self):
        first = self.binding()
        self.assertNotEqual(first.thread_id, self.binding(tenant="another-tenant").thread_id)
        self.assertNotEqual(first.thread_id,
                            self.binding(task={**TASK, "query": "changed payload"}).thread_id)
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "repo"
            root.mkdir()
            fixture(root)
            before = self.binding(repo_root=root)
            profile = root / "CAPITAL-AI-TRUST/domain.prompt.json"
            profile.write_text(
                profile.read_text(encoding="utf-8").replace(
                    '"prompt": "', '"prompt": "test source revision ', 1), encoding="utf-8")
            after = self.binding(repo_root=root)
            self.assertNotEqual(before.bundle_sha256, after.bundle_sha256)
            self.assertNotEqual(before.thread_id, after.thread_id)

    def test_spoofed_or_stale_graph_state_cannot_call_adapter(self):
        binding = self.binding()
        observer = Observer()
        graph = build_graph(
            observer, Authority(allow_changes=True, allow_merge=True),
            bound_task=binding, repo_root=REPO,
        )
        spoofed = {**binding.initial_state(), "profile_sha256": "0" * 64}
        result = graph.invoke(
            spoofed,
            {"configurable": {"thread_id": binding.thread_id}, "recursion_limit": 24},
        )
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(observer.calls, [])

    def test_profile_swap_during_readonly_flow_blocks_further_callbacks(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "repo"
            root.mkdir()
            fixture(root)
            class Swapper(Observer):
                def analyze(self, state):
                    self.calls.append("analyze")
                    p = root / "CAPITAL-AI-TRUST/domain.prompt.json"
                    p.write_text(p.read_text(encoding="utf-8") + "\n", encoding="utf-8")
                    return {"ok": True}
            observer = Swapper()
            with self.assertRaisesRegex(ValueError, "stale bound execution result"):
                execute_bound_readonly(observer, root, TASK)
            self.assertEqual(observer.calls, ["analyze"])

    def test_durable_replay_and_cross_scope_copy_fail_closed(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            root.chmod(0o700)
            db = str(root / "bound.sqlite3")
            observer = Observer()
            first = execute_bound_durable_readonly(observer, REPO, TASK, db)
            second = execute_bound_durable_readonly(observer, REPO, TASK, db)
            self.assertEqual(first, second)
            self.assertEqual(first["status"], "READ_ONLY_COMPLETE")
            self.assertEqual(observer.calls, ["analyze", "evidence"])
            for kwargs in (
                {"tenant": "customer-b"},
                {"task": {**TASK, "query": "replayed query"}},
            ):
                with self.subTest(kwargs=kwargs), self.assertRaisesRegex(ValueError, "scope mismatch"):
                    execute_bound_durable_readonly(
                        Observer(), REPO, kwargs.get("task", TASK), db,
                        tenant=kwargs.get("tenant", "owner-local"),
                    )


if __name__ == "__main__":
    unittest.main()
