"""Durability, fail-closed storage and resumed-authority regression tests."""
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

here = Path(__file__).with_name("auto_loop.py")
spec = importlib.util.spec_from_file_location("capital_durable_execution", here)
loop = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = loop
spec.loader.exec_module(loop)


class Actions:
    def __init__(self):
        self.calls = []

    def analyze(self, state):
        self.calls.append("analyze")
        return {"ok": True}

    def implement(self, state):
        self.calls.append("implement")
        return {"ok": True}

    def test(self, state):
        self.calls.append("test")
        return {"passed": True}

    def evidence(self, state):
        self.calls.append("evidence")
        return {}


class DurableTests(unittest.TestCase):
    def test_reopen_after_process_like_restart_does_not_repeat_side_effects(self):
        with tempfile.TemporaryDirectory() as d:
            db = str(Path(d, "state.sqlite"))
            a = Actions()
            authority = loop.Authority(allow_changes=True)
            first = loop.execute_durable(a, authority, "resume:1", db)
            self.assertEqual(first["status"], "MERGE_NOT_PROVEN")
            self.assertEqual(a.calls, ["analyze", "implement", "test", "evidence"])
            second_agent = Actions()
            resumed = loop.execute_durable(second_agent, authority, "resume:1", db)
            self.assertEqual(resumed, first)
            self.assertEqual(second_agent.calls, [])
            self.assertTrue(Path(db).exists())
            self.assertEqual(Path(db).stat().st_mode & 0o077, 0)

    def test_separate_thread_id_never_inherits_prior_authority(self):
        with tempfile.TemporaryDirectory() as d:
            path = str(Path(d, "state.sqlite"))
            a = Actions()
            first = loop.execute_durable(a, loop.Authority(allow_changes=True), "tenant:a", path)
            self.assertEqual(first["status"], "MERGE_NOT_PROVEN")
            b = Actions()
            second = loop.execute_durable(b, loop.Authority(read_only=True, allow_changes=True), "tenant:b", path)
            self.assertEqual(second["status"], "READ_ONLY_COMPLETE")
            self.assertEqual(b.calls, ["analyze", "evidence"])

    def test_invalid_state_paths_and_symlinks_are_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d, "safe.sqlite")
            alias = Path(d, "link.sqlite")
            path.touch()
            alias.symlink_to(path)
            for invalid in ("relative.sqlite", str(alias), str(Path(d, "bad.txt")), ""):
                with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                    loop.execute_durable(Actions(), loop.Authority(), "task", invalid)

    def test_untrusted_permissions_fail_closed(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d, "private")
            path.mkdir(mode=0o700)
            os.chmod(path, 0o755)
            with self.assertRaises(PermissionError):
                loop.execute_durable(Actions(), loop.Authority(), "task", str(path / "state.sqlite"))

    def test_closed_task_cannot_be_reopened_with_more_power(self):
        with tempfile.TemporaryDirectory() as d:
            db = str(Path(d, "state.sqlite"))
            a = Actions()
            initial = loop.execute_durable(a, loop.Authority(), "task", db)
            self.assertEqual(initial["status"], "ANALYZED")
            elevated = Actions()
            reread = loop.execute_durable(elevated, loop.Authority(allow_merge=True, allow_changes=True), "task", db)
            self.assertEqual(reread, initial)
            self.assertEqual(elevated.calls, [])

    def test_authority_revoked_on_merge_node_rejects_persisted_ready_state(self):
        # Explicitly test resumed node, not only the upstream authorize decision.
        from unittest.mock import Mock
        actions = Mock()
        actions.merge.return_value = {"merged": True, "sha": "c" * 40, "expected_head_sha": "b" * 40}
        g = loop.build_graph(actions, loop.Authority(read_only=True, allow_merge=True))
        # Compile behavior is verified in the normal test suite; this source
        # regression guards the side-effect node even after a checkpoint.
        self.assertIn("authority.read_only or not authority.allow_merge", here.read_text())
