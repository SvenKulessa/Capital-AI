"""SQLite restart/recovery and fail-closed filesystem tests."""
import importlib.util
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest

root = Path(__file__).parent
for name in ("auto_loop", "provider_adapters"):
    if name not in sys.modules:
        spec = importlib.util.spec_from_file_location(name, root / (name + ".py"))
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        spec.loader.exec_module(module)
from auto_loop import Authority, build_graph, execute_durable
from provider_adapters import GitHubRenderActions, TrustedAssessment

A, B, C = "a" * 40, "b" * 40, "c" * 40
OK = TrustedAssessment(True, True, True, True)


class FakeTransport:
    def __init__(self):
        self.mutations = 0
        self.merged = False

    def github(self, path, *, method="GET", body=None):
        if method == "PUT":
            self.mutations += 1
            self.merged = True
            return {"merged": True, "sha": C}
        if path == "/pulls/42":
            return {"number": 42, "title": "[CAPITAL-AI-PLATFORM] Example",
                    "state": "closed" if self.merged else "open",
                    "draft": False, "merged": self.merged,
                    "merge_commit_sha": C if self.merged else None,
                    "head": {"sha": B, "ref": "capital-ai-platform/checkpoint-20261115",
                             "repo": {"full_name": "SvenKulessa/Capital-AI"}},
                    "base": {"sha": A, "ref": "main"},
                    "mergeable": True, "mergeable_state": "clean",
                    "changed_files": 1}
        if path == "/branches/main":
            return {"commit": {"sha": A}}
        if path in ("/actions/runs/100", "/actions/runs/101"):
            run_id = int(path.rsplit("/", 1)[-1])
            workflow_id, file = ((370506106, "build-security") if run_id == 100 else (371617040, "domain-governance"))
            return {"id": run_id, "workflow_id": workflow_id, "path": f".github/workflows/{file}.yml",
                    "head_sha": B, "event": "pull_request", "status": "completed", "conclusion": "success"}
        if path.startswith("/commits/"):
            checks = [
                {"id": 10, "name": "Docker Security Gate", "status": "completed",
                 "details_url": "https://github.com/SvenKulessa/Capital-AI/actions/runs/100/job/10",
                 "conclusion": "success", "head_sha": B, "app": {"slug": "github-actions", "id": 15368}},
                {"id": 11, "name": "Domain Governance", "status": "completed",
                 "details_url": "https://github.com/SvenKulessa/Capital-AI/actions/runs/101/job/11",
                 "conclusion": "success", "head_sha": B, "app": {"slug": "github-actions", "id": 15368}},
                {"id": 12, "name": "CodeQL", "status": "completed",
                 "conclusion": "success", "head_sha": B, "app": {"slug": "github-advanced-security", "id": 57789}},
            ]
            return {"total_count": len(checks), "check_runs": checks}
        raise ValueError(path)

    def render(self, path):
        return [{"deploy": {"status": "live", "commit": {"id": C}}}]

    def health(self):
        return {"status": "ok", "ingress": "fail_closed",
                "runtimeIdentity": {"sourceSha": C}}


class DurableTests(unittest.TestCase):
    def actions(self, http):
        return GitHubRenderActions(http, pr_number=42, assessment=OK,
                                   enable_merge=True, approved_head_sha=B,
                                   approved_base_sha=A)

    def test_completed_thread_is_not_replayed_after_restart(self):
        with tempfile.TemporaryDirectory() as folder:
            db = str(Path(folder) / "state.sqlite3")
            http = FakeTransport()
            auth = Authority(allow_changes=True, allow_merge=True, observe_existing_deploy=True)
            first = execute_durable(self.actions(http), auth, "durable42", db)
            second = execute_durable(self.actions(http), auth, "durable42", db)
            self.assertEqual(first["status"], "VERIFIED")
            self.assertEqual(second["status"], "VERIFIED")
            self.assertEqual(http.mutations, 1)
            self.assertEqual(os.stat(db).st_mode & 0o077, 0)
            self.assertNotIn("PRIVATE_SECRET", Path(db).read_bytes().decode("latin1"))

    def test_interrupt_checkpoint_resumes_at_next_node(self):
        from langgraph.checkpoint.sqlite import SqliteSaver
        with tempfile.TemporaryDirectory() as folder:
            db = str(Path(folder) / "state.sqlite3")
            auth = Authority(allow_changes=True, allow_merge=True)
            http = FakeTransport()
            config = {"configurable": {"thread_id": "interrupted42"}, "recursion_limit": 24}
            conn = sqlite3.connect(db, check_same_thread=False)
            saver = SqliteSaver(conn)
            graph = build_graph(self.actions(http), auth, checkpointer=saver,
                                interrupt_after=["test"])
            first = graph.invoke({"task_id": "interrupted42", "attempts": 0, "history": []}, config)
            self.assertEqual(first["status"], "TESTED")
            snapshot = graph.get_state(config)
            self.assertTrue(snapshot.next)
            conn.close()
            os.chmod(db, 0o600)
            result = execute_durable(self.actions(http), auth, "interrupted42", db)
            self.assertEqual(result["status"], "MERGED")
            self.assertEqual(http.mutations, 1)
            self.assertEqual(result["history"].count("analyze"), 1)
            self.assertEqual(result["history"].count("implement"), 1)

    def test_revoked_merge_authority_after_checkpoint_never_calls_provider(self):
        from langgraph.checkpoint.sqlite import SqliteSaver
        with tempfile.TemporaryDirectory() as folder:
            db = str(Path(folder) / "revoke.sqlite3")
            config = {"configurable": {"thread_id": "revoked42"}, "recursion_limit": 24}
            http = FakeTransport()
            conn = sqlite3.connect(db, check_same_thread=False)
            saver = SqliteSaver(conn)
            graph = build_graph(self.actions(http),
                                Authority(allow_changes=True, allow_merge=True),
                                checkpointer=saver, interrupt_after=["authorize"])
            prior = graph.invoke({"task_id": "revoked42", "attempts": 0,
                                  "history": []}, config)
            self.assertEqual(prior["status"], "MERGE_READY")
            self.assertEqual(graph.get_state(config).next, ("merge",))
            conn.close()
            os.chmod(db, 0o600)
            result = execute_durable(self.actions(http),
                                     Authority(read_only=True, allow_changes=False,
                                               allow_merge=False),
                                     "revoked42", db)
            self.assertEqual(result["status"], "BLOCKED")
            self.assertEqual(http.mutations, 0)
            self.assertIn("merge_denied", result["history"])

    def test_pending_repair_rechecks_current_authority_and_budget(self):
        from langgraph.checkpoint.sqlite import SqliteSaver
        from test_auto_loop import Adapter
        cases = (
            (Authority(read_only=True), "repair_denied"),
            (Authority(allow_changes=False), "repair_denied"),
            (Authority(allow_changes=True, max_repairs=0), "repair_budget_exhausted"),
        )
        for resumed_authority, expected_event in cases:
            with self.subTest(authority=resumed_authority):
                with tempfile.TemporaryDirectory() as folder:
                    db = str(Path(folder) / "repair.sqlite3")
                    config = {"configurable": {"thread_id": "repair42"}, "recursion_limit": 24}
                    adapter = Adapter(failures=1)
                    conn = sqlite3.connect(db, check_same_thread=False)
                    try:
                        graph = build_graph(adapter, Authority(allow_changes=True),
                                            checkpointer=SqliteSaver(conn),
                                            interrupt_after=["test"])
                        prior = graph.invoke({"task_id": "repair42", "attempts": 0,
                                              "history": []}, config)
                        self.assertEqual(prior["status"], "TEST_FAILED")
                        self.assertEqual(graph.get_state(config).next, ("repair",))
                    finally:
                        conn.close()
                    os.chmod(db, 0o600)
                    result = execute_durable(adapter, resumed_authority, "repair42", db)
                    self.assertEqual(result["status"], "BLOCKED")
                    self.assertIn(expected_event, result["history"])
                    self.assertNotIn("repair", adapter.calls)
                    self.assertNotIn("merge", adapter.calls)
                    self.assertEqual(result["attempts"], 0)

    def test_wait_checkpoint_resumes_without_repeating_writes_or_repair(self):
        from test_auto_loop import Adapter
        class WaitingAdapter(Adapter):
            pending = True
            def test(self, state):
                self.calls.append("test")
                if self.pending:
                    return {"passed": False, "status": "WAIT", "failure_class": "CI_PENDING"}
                return {"passed": True}
        with tempfile.TemporaryDirectory() as folder:
            db = str(Path(folder) / "wait.sqlite3")
            auth = Authority(allow_changes=True, allow_merge=True, observe_existing_deploy=True)
            a = WaitingAdapter()
            first = execute_durable(a, auth, "wait42", db)
            self.assertEqual(first["status"], "WAIT")
            self.assertEqual(first["attempts"], 0)
            again = execute_durable(a, auth, "wait42", db)
            self.assertEqual(again["status"], "WAIT")
            a.pending = False
            final = execute_durable(a, auth, "wait42", db)
            self.assertEqual(final["status"], "VERIFIED")
            self.assertEqual(a.calls.count("analyze"), 1)
            self.assertEqual(a.calls.count("implement"), 1)
            self.assertEqual(a.calls.count("repair"), 0)
            self.assertEqual(a.calls.count("merge"), 1)
            self.assertEqual(a.calls.count("test"), 3)

    def test_wait_resume_denies_revoked_authority(self):
        from test_auto_loop import Adapter
        with tempfile.TemporaryDirectory() as folder:
            db = str(Path(folder) / "wait-revoked.sqlite3")
            a = Adapter()
            a.test = lambda state: {"status": "WAIT", "failure_class": "CI_PENDING"}
            first = execute_durable(a, Authority(allow_changes=True), "wait-revoke", db)
            self.assertEqual(first["status"], "WAIT")
            count = len(a.calls)
            final = execute_durable(a, Authority(read_only=True), "wait-revoke", db)
            self.assertEqual(final["status"], "BLOCKED")
            self.assertEqual(final["stop_reason"], "PERMISSION_STOP")
            self.assertEqual(len(a.calls), count)

    def test_deployment_wait_does_not_repeat_merge(self):
        with tempfile.TemporaryDirectory() as folder:
            db = str(Path(folder) / "deploy-wait.sqlite3")
            class WaitingTransport(FakeTransport):
                deploying = True
                def render(self, path):
                    if self.deploying:
                        return [{"deploy": {"status": "build_in_progress", "commit": {"id": C}}}]
                    return super().render(path)
            http = WaitingTransport()
            auth = Authority(allow_changes=True, allow_merge=True, observe_existing_deploy=True)
            first = execute_durable(self.actions(http), auth, "deploy-wait", db)
            self.assertEqual(first["status"], "WAIT")
            self.assertEqual(first["wait_phase"], "observe")
            self.assertEqual(http.mutations, 1)
            http.deploying = False
            final = execute_durable(self.actions(http), auth, "deploy-wait", db)
            self.assertEqual(final["status"], "VERIFIED")
            self.assertEqual(http.mutations, 1)
            self.assertEqual(final["attempts"], 0)

    def test_read_only_checkpoint_never_writes_to_github(self):
        with tempfile.TemporaryDirectory() as folder:
            http = FakeTransport()
            result = execute_durable(self.actions(http), Authority(read_only=True,
                 allow_changes=True, allow_merge=True), "readonly", str(Path(folder)/"readonly.sqlite3"))
            self.assertEqual(result["status"], "READ_ONLY_COMPLETE")
            self.assertEqual(http.mutations, 0)

    def test_unsafe_database_path_permissions_and_symlinks_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            http = FakeTransport()
            db = Path(folder) / "state.sqlite3"
            with self.assertRaises(ValueError):
                execute_durable(self.actions(http), Authority(), "a", "relative.sqlite3")
            unsafe = Path(folder) / "shared"
            unsafe.mkdir(mode=0o777)
            unsafe.chmod(0o777)
            with self.assertRaises(ValueError):
                execute_durable(self.actions(http), Authority(), "a", str(unsafe/"db.sqlite3"))
            db.symlink_to(Path(folder) / "other.sqlite3")
            with self.assertRaises(ValueError):
                execute_durable(self.actions(http), Authority(), "a", str(db))


if __name__ == "__main__":
    unittest.main()
