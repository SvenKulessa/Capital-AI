"""Private, recent approval files are not inferred from PR content."""
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).parent))
from run_reviewed_pr import assessment_from_private_file, checkpoint_task_id

def approval(expiration):
    return {"schema": "CAPITAL_AI_TRUSTED_PR_ASSESSMENT@1",
            "pr": 42, "head_sha": "a" * 40, "base_sha": "b" * 40,
            "expires_at": expiration.isoformat(),
            "review": {"scope_complete": True, "trust_boundaries_clear": True,
                       "no_active_hold": True, "applicable_checks_green": True}}

class TrustedApprovalTests(unittest.TestCase):
    def write(self, root, expiry):
        p = Path(root) / "assessment.json"
        p.write_text(json.dumps(approval(expiry)), encoding="utf8")
        p.chmod(0o600)
        return p

    def test_private_fresh_assessment_is_accepted(self):
        with tempfile.TemporaryDirectory() as root:
            p = self.write(root, datetime.now(timezone.utc) + timedelta(minutes=5))
            record, trusted = assessment_from_private_file(str(p), pr_number=42)
            self.assertTrue(trusted.approved())
            self.assertEqual(record["pr"], 42)

    def test_stale_too_long_wrong_scope_and_public_permissions_fail(self):
        with tempfile.TemporaryDirectory() as root:
            now = datetime.now(timezone.utc)
            for expiry in (now - timedelta(seconds=1), now + timedelta(hours=2)):
                with self.subTest(expiry=expiry):
                    p = self.write(root, expiry)
                    with self.assertRaises(ValueError):
                        assessment_from_private_file(str(p), pr_number=42)
            p = self.write(root, now + timedelta(minutes=5))
            with self.assertRaises(ValueError):
                assessment_from_private_file(str(p), pr_number=99)
            p.chmod(0o644)
            with self.assertRaises(ValueError):
                assessment_from_private_file(str(p), pr_number=42)

    def test_checkpoint_scope_prevents_cross_pr_and_cross_head_replay(self):
        head = "a" * 40
        current = checkpoint_task_id("same-job", 42, head, merge=True)
        self.assertEqual(current, checkpoint_task_id("same-job", 42, head, merge=True))
        self.assertNotEqual(current, checkpoint_task_id("same-job", 43, head, merge=True))
        self.assertNotEqual(current, checkpoint_task_id("same-job", 42, "b" * 40, merge=True))
        self.assertNotEqual(current, checkpoint_task_id("same-job", 42, head, merge=False))
        self.assertNotEqual(current, checkpoint_task_id("another-job", 42, head, merge=True))
        self.assertTrue(current.startswith("pr-42-"))
        self.assertNotIn("same-job", current)

    def test_checkpoint_scope_rejects_invalid_task_and_sha(self):
        for task_id, number, head in (
            ("../other", 42, "a" * 40),
            ("hidden/name", 42, "a" * 40),
            ("valid", True, "a" * 40),
            ("valid", 0, "a" * 40),
            ("valid", 42, "not-a-head"),
        ):
            with self.subTest(task=task_id, pr=number):
                with self.assertRaises(ValueError):
                    checkpoint_task_id(task_id, number, head, merge=True)

    def test_symlink_and_relative_paths_fail(self):
        with tempfile.TemporaryDirectory() as root:
            p = self.write(root, datetime.now(timezone.utc) + timedelta(minutes=5))
            alias = Path(root) / "link.json"
            alias.symlink_to(p)
            with self.assertRaises(ValueError):
                assessment_from_private_file(str(alias), pr_number=42)
            with self.assertRaises(ValueError):
                assessment_from_private_file("relative.json", pr_number=42)

if __name__ == "__main__":
    unittest.main()
