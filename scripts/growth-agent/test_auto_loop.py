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
            return {"passed": False, "failure_fingerprint": f"{self.failures:064x}"}
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

    def test_identical_failure_stops_without_repeating_repair(self):
        a = Adapter()
        a.test = lambda state: {"passed": False, "failure_fingerprint": "d" * 64}
        state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True))
        self.assertEqual(state["stop_reason"], "NO_PROGRESS")
        self.assertEqual(state["attempts"], 1)
        self.assertEqual(a.calls.count("repair"), 1)
        self.assertNotIn("merge", a.calls)

    def test_hard_stops_and_unknown_outcomes_never_repair(self):
        for kind in loop.HARD_STOPS:
            with self.subTest(kind=kind):
                a = Adapter()
                a.test = lambda state: {"passed": False, "failure_class": kind}
                state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True))
                self.assertEqual(state["status"], "BLOCKED")
                self.assertEqual(state["stop_reason"], kind)
                self.assertEqual(state["attempts"], 0)
                self.assertNotIn("repair", a.calls)
                self.assertNotIn("merge", a.calls)
        a = Adapter()
        a.test = lambda state: {"status": "UNKNOWN"}
        state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True))
        self.assertEqual(state["status"], "NOT_PROVEN")
        self.assertNotIn("repair", a.calls)

    def test_ci_wait_does_not_repair_or_merge(self):
        a = Adapter()
        a.test = lambda state: {"passed": False, "status": "WAIT", "failure_class": "CI_PENDING"}
        state = self.run_graph(a, loop.Authority(allow_changes=True, allow_merge=True))
        self.assertEqual(state["status"], "WAIT")
        self.assertEqual(state["wait_phase"], "test")
        self.assertEqual(state["attempts"], 0)
        self.assertNotIn("repair", a.calls)
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



def hygiene_receipt(phase, task_id, **patch):
    index = {"baseline": 1, "final": 2, "readback": 3}[phase]
    digest = str(index) * 64
    return {"contractVersion": "CAPITAL_AI_HYGIENE_HANDOFF@1",
            "threadId": task_id if task_id.startswith("offline-") else None,
            "runId": "hygiene-" + digest, "sourceSha": SHA_MAIN,
            "observedAt": "2026-11-28T12:00:0%d.000Z" % index,
            "scopeDigest": "a" * 64, "sourceDigest": digest,
            "contentDigest": "b" * 64 if index == 1 else "c" * 64,
            "methodId": "doc-drift-claims-v1", "checked": 4,
            "affected": 1 if index == 1 else 0, "missing": 0,
            "score": 75 if index == 1 else 100, "coverage": 15,
            "status": "NOT_PROVEN", "authorityGranted": False, **patch}


class HygieneLifecycleTests(unittest.TestCase):
    def test_checkpoint_replay_and_measured_delta(self):
        calls = []
        def observer(phase, task):
            calls.append(phase)
            return hygiene_receipt(phase, task)
        with tempfile.TemporaryDirectory() as d:
            os.chmod(d, 0o700)
            path = os.path.join(d, "hygiene.sqlite3")
            adapter = Adapter()
            auth = loop.Authority(read_only=True)
            first = loop.execute_durable(adapter, auth, "hygiene:test", path, hygiene_observer=observer)
            self.assertEqual(first["status"], "READ_ONLY_COMPLETE")
            self.assertEqual(first["hygiene_lifecycle"]["deltaPoints"], 25)
            self.assertTrue(first["hygiene_lifecycle"]["readbackMatch"])
            self.assertFalse(first["hygiene_lifecycle"]["authorityGranted"])
            self.assertEqual(first["hygiene_lifecycle"]["status"], "NOT_PROVEN")
            self.assertEqual(calls, ["baseline", "final", "readback"])
            second = loop.execute_durable(adapter, auth, "hygiene:test", path, hygiene_observer=observer)
            self.assertEqual(first, second)
            self.assertEqual(calls, ["baseline", "final", "readback"])
            self.assertEqual(adapter.calls, ["analyze", "evidence"])

    def test_wait_does_not_finalize_and_resume_does_not_repeat_baseline(self):
        calls = []
        def observer(phase, task):
            calls.append(phase)
            return hygiene_receipt(phase, task)
        with tempfile.TemporaryDirectory() as d:
            os.chmod(d, 0o700)
            path = os.path.join(d, "wait.sqlite3")
            adapter = Adapter()
            adapter.test = lambda state: {"passed": False, "status": "WAIT", "failure_class": "CI_PENDING"}
            auth = loop.Authority(allow_changes=True, allow_merge=False)
            first = loop.execute_durable(adapter, auth, "hygiene:wait", path, hygiene_observer=observer)
            self.assertEqual(first["status"], "WAIT")
            self.assertNotIn("hygiene_lifecycle", first)
            self.assertEqual(calls, ["baseline"])
            adapter.test = lambda state: {"passed": True}
            second = loop.execute_durable(adapter, auth, "hygiene:wait", path, hygiene_observer=observer)
            self.assertEqual(second["status"], "MERGE_NOT_PROVEN")
            self.assertEqual(calls, ["baseline", "final", "readback"])
            self.assertEqual(adapter.calls.count("implement"), 1)

    def test_mismatched_readback_and_forged_claims_cannot_improve_score(self):
        for patch in ({"scopeDigest": "d" * 64}, {"contentDigest": "d" * 64},
                      {"authorityGranted": True}, {"score": 99}, {"status": "VERIFIED"},
                      {"rawPrompt": "synthetic-private"}, {"threadId": "offline-" + "f" * 40}):
            with self.subTest(patch=patch):
                def observer(phase, task):
                    return hygiene_receipt(phase, task, **(patch if phase == "readback" else {}))
                result = loop.execute(Adapter(), loop.Authority(read_only=True), "hygiene:negative",
                                      hygiene_observer=observer)["hygiene_lifecycle"]
                self.assertFalse(result["readbackMatch"])
                self.assertIsNone(result["deltaPoints"])
                self.assertNotIn("synthetic-private", str(result))
                self.assertFalse(result["authorityGranted"])

    def test_hard_stop_does_not_call_final_observer(self):
        calls = []
        def observer(phase, task):
            calls.append(phase)
            return hygiene_receipt(phase, task)
        adapter = Adapter()
        adapter.test = lambda state: {"passed": False, "failure_class": "SECURITY_STOP"}
        result = loop.execute(adapter, loop.Authority(allow_changes=True), "hygiene:stop",
                              hygiene_observer=observer)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(calls, ["baseline"])
        self.assertIsNone(result["hygiene_lifecycle"]["deltaPoints"])

    def test_failed_analysis_is_recorded_without_changing_status(self):
        adapter = Adapter()
        adapter.analyze = lambda state: {"ok": False}
        result = loop.execute(adapter, loop.Authority(), "hygiene:failed",
                              hygiene_observer=hygiene_receipt)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(result["hygiene_lifecycle"]["status"], "NOT_PROVEN")
        self.assertEqual(result["hygiene_lifecycle"]["deltaPoints"], 25)


    def test_pinned_scanner_real_checkout_and_tamper(self):
        import hashlib
        import shutil
        import subprocess
        from hygiene_scanner_adapter import PinnedScanner, PIN_PATHS
        node, git = shutil.which("node"), shutil.which("git")
        source = Path(__file__).resolve().parents[2]
        if not node or not git or not all((source / p).is_file() for p in PIN_PATHS):
            self.skipTest("host scanner dependencies absent from isolated worker image")
        with tempfile.TemporaryDirectory() as d:
            root = Path(d).resolve()
            pins = {}
            for name in PIN_PATHS:
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((source / name).read_bytes())
                pins[name] = hashlib.sha256(target.read_bytes()).hexdigest()
            (root / "README.md").write_text("Synthetic local document", encoding="utf-8")
            subprocess.run([git, "init", "-q", str(root)], check=True)
            subprocess.run([git, "-C", str(root), "add", "."], check=True)
            subprocess.run([git, "-C", str(root), "-c", "user.name=Fixture",
                            "-c", "user.email=fixture@example.invalid",
                            "-c", "commit.gpgsign=false", "commit", "-qm", "fixture"], check=True)
            observer = PinnedScanner(root, node=node, git=git, pins=pins)
            task = "offline-" + "a" * 40
            result = loop.execute(Adapter(), loop.Authority(read_only=True), task,
                                  hygiene_observer=observer)["hygiene_lifecycle"]
            self.assertTrue(result["readbackMatch"])
            self.assertEqual(result["baseline"]["threadId"], task)
            self.assertEqual(result["deltaPoints"], 0)
            self.assertEqual(result["baseline"]["coverage"], 15)
            self.assertFalse(result["authorityGranted"])
            with self.assertRaises(ValueError):
                observer("final", "../untrusted")
            (root / PIN_PATHS[0]).write_text("tampered", encoding="utf-8")
            with self.assertRaises(ValueError):
                observer("final", task)


if __name__ == "__main__":
    unittest.main()
