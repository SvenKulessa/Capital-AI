"""Offline regression and negative tests for the dormant CI-wait supervisor."""
import os
from pathlib import Path
import tempfile
import unittest

from continuous_pr_supervisor import (
    Candidate, CheckReadback, SingleWorkerLock, check_state, serve,
)

HEAD_A = "a" * 40
HEAD_B = "b" * 40


class Adapter:
    def __init__(self, tasks, polls=None, executions=None):
        self.tasks = tasks
        self.polls = polls or {}
        self.actions = []
        self.recorded = []
        self.executions = executions or {}

    def next_candidate(self, processed):
        return next((t for t in self.tasks if t.key not in processed), None)

    def read_ci(self, candidate):
        sequence = self.polls.get(candidate.key, ["READY"])
        state = sequence.pop(0) if len(sequence) > 1 else sequence[0]
        self.actions.append(("read", candidate.key, state))
        return CheckReadback(candidate.head_sha, state)

    def execute_one(self, candidate):
        self.actions.append(("execute", candidate.key))
        return self.executions.get(candidate.key, "READ_ONLY_COMPLETE")

    def record_cycle(self, candidate, result):
        self.recorded.append((candidate.key, result))


class SupervisorTests(unittest.TestCase):
    def test_pending_poll_every_30_seconds_then_launch_next_immediately(self):
        a, b = Candidate(101, HEAD_A), Candidate(102, HEAD_B)
        adapter = Adapter([a, b], {a.key: ["PENDING", "PENDING", "READY"]})
        sleeps = []
        done = serve(adapter, stop_requested=lambda: False, sleep=sleeps.append, max_cycles=2)
        self.assertEqual(done, 2)
        self.assertEqual(sleeps, [30, 30])
        self.assertEqual([x for x in adapter.actions if x[0] == "execute"],
                         [("execute", a.key), ("execute", b.key)])

    def test_failed_check_never_executes_but_next_pr_runs(self):
        a, b = Candidate(10, HEAD_A), Candidate(11, HEAD_B)
        adapter = Adapter([a, b], {a.key: ["FAILED"]})
        self.assertEqual(serve(adapter, stop_requested=lambda: False, max_cycles=2), 2)
        self.assertEqual(adapter.recorded, [(a.key, "BLOCKED"), (b.key, "READ_ONLY_COMPLETE")])
        self.assertNotIn(("execute", a.key), adapter.actions)

    def test_stop_while_waiting_cancels_without_execution_or_completion(self):
        a = Candidate(100, HEAD_A)
        adapter = Adapter([a], {a.key: ["PENDING", "READY"]})
        flag = [False]
        def sleep(s):
            self.assertEqual(s, 30)
            flag[0] = True
        self.assertEqual(serve(adapter, stop_requested=lambda: flag[0], sleep=sleep), 0)
        self.assertEqual(adapter.recorded, [])

    def test_unverified_head_and_invalid_adapter_response_fail_closed(self):
        a, b = Candidate(20, HEAD_A), Candidate(21, HEAD_B)
        adapter = Adapter([a, b])
        def read_ci(candidate):
            return CheckReadback(HEAD_B, "READY") if candidate == a else CheckReadback(HEAD_B, "UNKNOWN")
        adapter.read_ci = read_ci
        self.assertEqual(serve(adapter, stop_requested=lambda: False, max_cycles=2), 2)
        self.assertEqual(adapter.recorded, [(a.key, "NOT_PROVEN"), (b.key, "NOT_PROVEN")])
        self.assertFalse(any(x[0] == "execute" for x in adapter.actions))

    def test_exception_does_not_grant_authority(self):
        a = Candidate(100, HEAD_A)
        adapter = Adapter([a])
        adapter.execute_one = lambda candidate: (_ for _ in ()).throw(RuntimeError("secret"))
        self.assertEqual(serve(adapter, stop_requested=lambda: False, max_cycles=1), 1)
        self.assertEqual(adapter.recorded[0][1], "NOT_PROVEN")

    def test_record_failure_halts_next_cycle(self):
        a, b = Candidate(1, HEAD_A), Candidate(2, HEAD_B)
        adapter = Adapter([a, b])
        def fail(*_):
            raise OSError("disk failure")
        adapter.record_cycle = fail
        self.assertEqual(serve(adapter, stop_requested=lambda: False, max_cycles=2), 1)
        self.assertNotIn(("execute", b.key), adapter.actions)

    def test_bad_adapter_duplicate_does_not_reexecute(self):
        a = Candidate(12, HEAD_A)
        adapter = Adapter([a])
        adapter.next_candidate = lambda ignored: a
        stopped = [False]
        def sleep(s):
            stopped[0] = True
        self.assertEqual(serve(adapter, stop_requested=lambda: stopped[0], sleep=sleep), 1)
        self.assertEqual(sum(x[0] == "execute" for x in adapter.actions), 1)

    def test_validation_rejects_invalid_identity(self):
        for n, sha in [(0, HEAD_A), (1, "short"), (True, HEAD_A), (1, HEAD_A.upper())]:
            with self.subTest(n=n, sha=sha), self.assertRaises(ValueError):
                Candidate(n, sha)
        self.assertEqual(check_state(Candidate(1, HEAD_A), object()), "NOT_PROVEN")
        with self.assertRaises(ValueError):
            serve(Adapter([]), stop_requested=lambda: True, max_cycles=-1)

    def test_private_single_worker_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            os.chmod(directory, 0o700)
            lockpath = str(Path(directory) / "pr-supervisor.lock")
            with SingleWorkerLock(lockpath):
                with self.assertRaises(BlockingIOError):
                    with SingleWorkerLock(lockpath):
                        pass
            with SingleWorkerLock(lockpath):
                pass
            os.chmod(lockpath, 0o644)
            with self.assertRaises(ValueError):
                with SingleWorkerLock(lockpath):
                    pass


if __name__ == "__main__":
    unittest.main()
