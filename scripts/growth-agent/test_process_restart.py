"""Real separate-process SQLite checkpoint resume, with synthetic actions only.

Three Python interpreters share one private SQLite file. Nothing calls GitHub,
Render, a shell executor, or a network provider. A revoked authority is tested
in a distinct second interpreter, not merely another function invocation.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

WORKER = r'''
import json
import os
from pathlib import Path
import sqlite3
import sys

os.umask(0o077)
from auto_loop import Authority, build_graph, execute_durable
from langgraph.checkpoint.sqlite import SqliteSaver

stage, db, audit = sys.argv[1:]
H, B, M = "b"*40, "a"*40, "c"*40
task = "synthetic-process-restart"
config = {"configurable":{"thread_id":task},"recursion_limit":24}

class SyntheticActions:
    def analyze(self, state):
        return {"ok":True}
    def implement(self, state):
        return {"ok":True}
    def test(self, state):
        return {"passed":True}
    def repair(self, state):
        return {"ok":False}
    def evidence(self, state):
        return {"base_sha":B,"head_sha":H,
                "checks":{"Docker Security Gate":"success","Domain Governance":"success"},
                "applicable_checks_green":True,"mergeable":True,
                "trust_boundaries_clear":True,"scope_complete":True,
                "current_main":True,"no_active_hold":True,"run_ids":[1,2]}
    def merge(self, state):
        with open(audit, "a", encoding="ascii") as handle:
            handle.write("synthetic_merge_once\n")
        return {"merged":True,"sha":M,"expected_head_sha":H}
    def observe_deployment(self, state):
        return {"deployed":True,"deployed_sha":M}
    def verify_runtime(self, state):
        return {"verified":True,"deployed_sha":M}

actions = SyntheticActions()
if stage == "prepare":
    conn = sqlite3.connect(db, check_same_thread=False)
    try:
        graph = build_graph(actions, Authority(allow_changes=True, allow_merge=True,
                            observe_existing_deploy=True),
                            checkpointer=SqliteSaver(conn), interrupt_after=["authorize"])
        state = graph.invoke({"task_id":task,"attempts":0,"history":[]}, config)
        assert state["status"] == "MERGE_READY", state["status"]
        assert graph.get_state(config).next == ("merge",)
        status = state["status"]
    finally:
        conn.close()
elif stage in ("resume", "revoked"):
    authority = (Authority(read_only=True,allow_merge=False)
                 if stage == "revoked" else Authority(allow_changes=True,
                 allow_merge=True,observe_existing_deploy=True))
    state = execute_durable(actions, authority, task, db)
    status = state["status"]
else:
    raise ValueError("unsupported stage")
print(json.dumps({"pid":os.getpid(),"status":status,
                  "history":state.get("history",[])}))
'''


def process(stage: str, db: Path, audit: Path) -> dict:
    # The child is a fresh process every time, not forked Python state.
    env = dict(os.environ)
    for key in ("GITHUB_TOKEN", "GH_TOKEN", "RENDER_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
        env.pop(key, None)
    env["PYTHONPATH"] = str(Path(__file__).parent)
    env["LANGSMITH_TRACING"] = "false"
    env["LANGCHAIN_TRACING_V2"] = "false"
    result = subprocess.run(
        [sys.executable, "-c", WORKER, stage, str(db), str(audit)],
        cwd=Path(__file__).parent, env=env, capture_output=True, text=True,
        check=False, timeout=40,
    )
    if result.returncode != 0:
        # Fixture contains no credentials and deliberately does not contact providers.
        raise AssertionError("synthetic subprocess failed: " + result.stderr[-2000:])
    return json.loads(result.stdout.strip())


class SeparateProcessRestartTests(unittest.TestCase):
    def test_interrupt_resume_then_reopen_without_repeating_a_mutation(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            root.chmod(0o700)
            db, audit = root / "checkpoint.sqlite3", root / "synthetic-audit.txt"
            first = process("prepare", db, audit)
            self.assertEqual(first["status"], "MERGE_READY")
            self.assertFalse(audit.exists())
            second = process("resume", db, audit)
            self.assertEqual(second["status"], "VERIFIED")
            self.assertNotEqual(first["pid"], second["pid"])
            self.assertEqual(second["history"].count("analyze"), 1)
            self.assertEqual(second["history"].count("merge"), 1)
            third = process("resume", db, audit)
            self.assertEqual(third["status"], "VERIFIED")
            self.assertNotEqual(second["pid"], third["pid"])
            self.assertEqual(audit.read_text(encoding="ascii").splitlines(),
                             ["synthetic_merge_once"])
            self.assertEqual(db.stat().st_mode & 0o077, 0)

    def test_revoked_authority_on_new_process_prevents_merge(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            root.chmod(0o700)
            db, audit = root / "checkpoint.sqlite3", root / "synthetic-audit.txt"
            first = process("prepare", db, audit)
            second = process("revoked", db, audit)
            self.assertNotEqual(first["pid"], second["pid"])
            self.assertEqual(second["status"], "BLOCKED")
            self.assertIn("merge_denied", second["history"])
            self.assertFalse(audit.exists())


if __name__ == "__main__":
    unittest.main()
