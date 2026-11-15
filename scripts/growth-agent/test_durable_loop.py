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
            return {"state": "closed" if self.merged else "open",
                    "draft": False, "merged": self.merged,
                    "merge_commit_sha": C if self.merged else None,
                    "head": {"sha": B, "ref": "capital-ai-platform/checkpoint-20261115",
                             "repo": {"full_name": "SvenKulessa/Capital-AI"}},
                    "base": {"sha": A, "ref": "main"},
                    "mergeable": True, "changed_files": 1}
        if path == "/branches/main":
            return {"commit": {"sha": A}}
        if path.startswith("/commits/"):
            checks = [{"id": 10, "name": "Docker Security Gate", "status": "completed", "conclusion": "success"},
                      {"id": 11, "name": "Domain Governance", "status": "completed", "conclusion": "success"}]
            return {"total_count": 2, "check_runs": checks}
        raise ValueError(path)

    def render(self, path):
        return [{"deploy": {"status": "live", "commit": {"id": C}}}]

    def health(self):
        return {"status": "ok", "ingress": "fail_closed",
                "runtimeIdentity": {"sourceSha": C}}


class DurableTests(unittest.TestCase):
    def actions(self, http):
        return GitHubRenderActions(http, pr_number=42, assessment=OK, enable_merge=True)

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
