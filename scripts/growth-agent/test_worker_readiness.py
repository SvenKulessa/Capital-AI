"""Worker readiness safety and missing-runtime negative tests."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest

spec = importlib.util.spec_from_file_location(
    "worker_readiness", Path(__file__).with_name("worker_readiness.py"))
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


class WorkerReadinessTests(unittest.TestCase):
    def test_missing_worker_state_never_becomes_ready(self):
        with tempfile.TemporaryDirectory() as folder:
            report = mod.inspect_worker(Path(folder) / "missing", env={"GITHUB_TOKEN":"private"})
            self.assertEqual(report["status"], "NOT_PROVEN")
            self.assertEqual(report["providerPermissions"], "NOT_PROVEN")
            self.assertNotIn("private", str(report))

    def test_private_directories_do_not_prove_runtime_or_token_scopes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / "agent"
            root.mkdir(mode=0o700)
            for name in ("approvals", "checkpoints"):
                (root / name).mkdir(mode=0o700)
            report = mod.inspect_worker(root, env={"GITHUB_TOKEN":"secret-one",
                                                    "RENDER_API_KEY":"secret-two"})
            self.assertEqual(report["status"], "LOCAL_PERMISSIONS_VERIFIED")
            self.assertEqual(report["runningWorker"], "NOT_PROVEN")
            self.assertEqual(report["providerPermissions"], "NOT_PROVEN")
            self.assertNotIn("secret-one", str(report))
            self.assertNotIn("secret-two", str(report))

    def test_world_readable_and_symlink_paths_fail_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / "agent"
            root.mkdir(mode=0o700)
            (root / "checkpoints").mkdir(mode=0o700)
            (root / "approvals").mkdir(mode=0o700)
            (root / "checkpoints").chmod(0o755)
            self.assertEqual(mod.inspect_worker(root, env={})["status"], "BLOCKED")
            (root / "checkpoints").chmod(0o700)
            (root / "approvals").rmdir()
            (root / "approvals").symlink_to(root / "checkpoints")
            self.assertEqual(mod.inspect_worker(root, env={})["status"], "BLOCKED")


if __name__ == "__main__":
    unittest.main()
