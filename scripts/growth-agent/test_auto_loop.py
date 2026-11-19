"""Synthetic, side-effect-free acceptance and negative tests for the execution graph."""
import importlib.util
from pathlib import Path
import sys
import unittest
import os
import tempfile
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("capital_execution_loop", Path(__file__).with_name("auto_loop.py"))
loop = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = loop
spec.loader.exec_module(loop)

SHA_MAIN = "a" * 40
SHA_HEAD = "b" * 40
SHA_MERGE = "c" * 40


def valid_evidence():
    return {
        "base_sha": SHA_MAIN,
        "head_sha": SHA_HEAD,
        "checks": {"Docker Security Gate": "success", "Domain Governance": "success"},
        "applicable_checks_green": True,
        "mergeable": True,
        "trust_boundaries_clear": True,
        "scope_complete": True,
        "current_main": True,
        "no_active_hold": True,
        "run_ids": [123],
    }


class Adapter:
    def __init__(self, failures=0, evidence=None, runtime_sha=SHA_MERGE):
        self.calls = []
        self.failures = failures
        self.evidence_data = evidence if evidence is not None else valid_evidence()
        self.runtime_sha = runtime_sha

    def analyze(self, state):
        self.calls.append("analyze")
        return {"ok": True}

    def implement(self, state):
        self.calls.append("implement")
        return {"ok": True}

    def test(self, state):
        self.calls.append("test")
        if self.failures:
            self.failures -= 1
            return {"passed": False}
        return {"passed": True}

    def repair(self, state):
        self.calls.append("repair")
        return {"ok": True}

    def evidence(self, state):
        self.calls.append("evidence")
        return self.evidence_data

    def merge(self, state):
        self.calls.append("merge")
        return {"merged": True, "sha": SHA_MERGE, "expected_head_sha": state["evidence"]["head_sha"]}

    def observe_deployment(self, state):
        self.calls.append("observe")
        return {"deployed": True, "deployed_sha": self.runtime_sha}

    def verify_runtime(self, state):
        self.calls.append("verify")
        return {"verified": True, "deployed_sha": self.runtime_sha}


class AutoLoopTests(unittest.TestCase):
    def run_graph(self, adapter, authority=None):
        return loop.execute(adapter, authority or loop.Authority(), "synthetic:test-1")

    def test_full_green_authorized_flow(self):
        a = Adapter()
        state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True, observe_existing_deploy=True))
        self.assertEqual(state["status"], "VERIFIED")
        self.assertEqual(a.calls, ["analyze", "implement", "test", "evidence", "merge", "observe", "verify"])
        self.assertEqual(state["merge_sha"], SHA_MERGE)

    def test_failed_test_repairs_and_revalidates(self):
        a = Adapter(failures=1)
        state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True, max_repairs=2))
        self.assertEqual(state["status"], "MERGED")
        self.assertEqual(state["attempts"], 1)
        self.assertEqual(a.calls.count("test"), 2)
        self.assertEqual(a.calls.count("repair"), 1)

    def test_exhausted_retry_never_merges(self):
        a = Adapter(failures=5)
        state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True, max_repairs=2))
        self.assertEqual(state["status"], "TEST_FAILED")
        self.assertEqual(state["attempts"], 2)
        self.assertNotIn("merge", a.calls)

    def test_readonly_cannot_write_even_if_changes_flag_set(self):
        a = Adapter()
        state = self.run_graph(a, loop.Authority(read_only=True, allow_changes=True, allow_merge=True))
        self.assertEqual(state["status"], "READ_ONLY_COMPLETE")
        self.assertEqual(a.calls, ["analyze", "evidence"])

    def test_default_fails_closed_without_any_mutating_callbacks(self):
        a = Adapter()
        state = self.run_graph(a)
        self.assertEqual(state["status"], "ANALYZED")
        self.assertEqual(a.calls, ["analyze"])

    def test_unproven_checks_or_high_risk_block_merge(self):
        for evidence in [
            {**valid_evidence(), "checks": {"Docker Security Gate": "success"}},
            {**valid_evidence(), "checks": {"Docker Security Gate": "cancelled", "Domain Governance": "success"}},
            {**valid_evidence(), "trust_boundaries_clear": False},
            {**valid_evidence(), "current_main": False},
            {**valid_evidence(), "no_active_hold": False},
            {**valid_evidence(), "head_sha": "invalid"},
        ]:
            with self.subTest(evidence=evidence):
                a = Adapter(evidence=evidence)
                state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True))
                self.assertEqual(state["status"], "MERGE_NOT_PROVEN")
                self.assertNotIn("merge", a.calls)

    def test_merge_permission_not_inferred_from_green_ci(self):
        a = Adapter()
        state = self.run_graph(a, loop.Authority(allow_changes=True))
        self.assertEqual(state["status"], "MERGE_NOT_PROVEN")
        self.assertNotIn("merge", a.calls)

    def test_runtime_sha_mismatch_prevents_verified_claim(self):
        a = Adapter(runtime_sha="d" * 40)
        state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True, observe_existing_deploy=True))
        self.assertEqual(state["status"], "DEPLOYMENT_NOT_PROVEN")
        self.assertNotIn("verify", a.calls)

    def test_missing_adapter_method_fails_closed(self):
        a = object()
        state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True))
        self.assertEqual(state["status"], "BLOCKED")
        self.assertEqual(state["history"], ["analyze"])

    def test_retries_are_bounded_and_invalid_authority_rejected(self):
        with self.assertRaises(ValueError):
            loop.Authority(max_repairs=100)
        with self.assertRaises(ValueError):
            loop.execute(Adapter(), loop.Authority(), "token with whitespace")

    def test_durable_completed_thread_is_not_replayed(self):
        with tempfile.TemporaryDirectory() as d:
            os.chmod(d, 0o700)
            path = os.path.join(d, "state.sqlite3")
            a = Adapter()
            authority = loop.Authority(allow_changes=True, allow_merge=False)
            first = loop.execute_durable(a, authority, "durable:test", path)
            self.assertEqual(first["status"], "MERGE_NOT_PROVEN")
            count = len(a.calls)
            second = loop.execute_durable(a, authority, "durable:test", path)
            self.assertEqual(second, first)
            self.assertEqual(len(a.calls), count)

    def test_durable_rejects_world_readable_directory_and_symlink(self):
        with tempfile.TemporaryDirectory() as d:
            os.chmod(d, 0o755)
            with self.assertRaises(ValueError):
                loop.execute_durable(Adapter(), loop.Authority(), "durable:test", os.path.join(d,"state.sqlite3"))
            os.chmod(d, 0o700)
            target = os.path.join(d, "target.sqlite3")
            os.symlink(target, os.path.join(d, "state.sqlite3"))
            with self.assertRaises(ValueError):
                loop.execute_durable(Adapter(), loop.Authority(), "durable:test", os.path.join(d,"state.sqlite3"))

    def test_secrets_in_exception_never_enter_state(self):
        a = Adapter()
        def bad(_):
            raise RuntimeError("SECRET_TOKEN_VALUE")
        a.test = bad
        state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True, max_repairs=0))
        self.assertNotIn("SECRET_TOKEN_VALUE", str(state))
        self.assertNotIn("merge", a.calls)


if __name__ == "__main__":
    unittest.main()
