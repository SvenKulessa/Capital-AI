"""Offline tests; no provider or browser launch."""
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from oss_mcp import quality_readback, ReadbackError, private_dir, launch_spec, REPO
HEAD = "a" * 40
class OSSReadbackTests(unittest.TestCase):
    def reader(self, findings, drift=False):
        calls = []
        def read(path):
            calls.append(path)
            if path.startswith("/pulls/"):
                return {"number": 916, "head": {"sha": "b"*40 if drift and len(calls)>1 else HEAD,
                    "repo": {"full_name": REPO}}}
            return findings
        return read
    def test_empty_repository_not_pr_pass(self):
        out = quality_readback(916, HEAD, self.reader([]))
        self.assertEqual(out["status"], "REPOSITORY_READBACK_VERIFIED")
        self.assertEqual(out["prQuality"], "NOT_PROVEN")
        self.assertEqual(out["findings"], 0)
    def test_404_never_green(self):
        def read(path):
            if path.startswith("/pulls/"):
                return self.reader([])(path)
            raise ReadbackError("HTTP_404")
        out = quality_readback(916, HEAD, read)
        self.assertEqual(out["reason"], "HTTP_404")
        self.assertEqual(out["prQuality"], "NOT_PROVEN")
    def test_head_drift_never_green(self):
        out = quality_readback(916, HEAD, self.reader([], True))
        self.assertEqual(out["reason"], "HEAD_OR_REPO_MISMATCH")
    def test_malformed_pr_nested_shapes_fail_closed(self):
        for malformed in ("invalid", ["invalid"], {"sha": HEAD, "repo": ["invalid"]},
                          {"sha": HEAD, "repo": "invalid"}):
            with self.subTest(head=malformed):
                out = quality_readback(916, HEAD, lambda _: {"number": 916, "head": malformed})
                self.assertEqual(out["reason"], "HEAD_OR_REPO_MISMATCH")
                self.assertEqual(out["prQuality"], "NOT_PROVEN")
    def test_malformed_final_readback_fails_closed(self):
        read = self.reader([])
        calls = []
        def changed(path):
            calls.append(path)
            if len(calls) == 3:
                return {"number": 916, "head": ["invalid"]}
            return read(path)
        out = quality_readback(916, HEAD, changed)
        self.assertEqual(out["reason"], "HEAD_OR_REPO_MISMATCH")
        self.assertNotIn("counts", out)
    def test_malformed_or_duplicate_finding(self):
        row = {"number": 1, "state": "open", "rule": {"severity": "warning"}}
        self.assertEqual(quality_readback(916, HEAD, self.reader([row,row]))["reason"], "INVALID_FINDINGS")
    def test_count_only_no_raw_messages(self):
        row = {"number": 1, "state": "open", "rule": {"severity": "warning"}, "message": "secret fixture"}
        out = quality_readback(916, HEAD, self.reader([row]))
        self.assertEqual(out["counts"]["warning"], 1)
        self.assertNotIn("secret fixture", str(out))
    def test_default_disabled(self):
        with TemporaryDirectory() as tmp, self.assertRaisesRegex(ValueError, "DISABLED"):
            launch_spec("github", Path(tmp) / "root", {})
    def test_github_env_does_not_leak_model_secrets(self):
        with TemporaryDirectory() as tmp:
            cmd, env = launch_spec("github", Path(tmp) / "root", {
                "CAI_OSS_MCP_ENABLED":"1", "CAI_GITHUB_MCP_READ_TOKEN":"synthetic-token",
                "OPENAI_API_KEY":"synthetic-model"})
            self.assertIn("--read-only", cmd)
            self.assertNotIn("OPENAI_API_KEY", env)
            self.assertNotIn("synthetic-token", " ".join(cmd))
    def test_private_dir_rejects_symlink(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "link").symlink_to(root, target_is_directory=True)
            with self.assertRaises(ValueError):
                private_dir(root / "link")
