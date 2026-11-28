"""Offline isolated LangGraph worker, with fail-closed background service mode.

Not wired to GitHub writes, Render deploy, LLM or paid API. An authorized
operator may create private local research tasks atomically in inbox/.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import signal
import stat
import time
from pathlib import Path

from agent_platform import DOMAINS, build_research_graph, research_evidence_handoff
from domain_profile_binding import bind_domain_task
from checkpoint_store import execute_durable_graph
from acode_failure_event import research_task, SCHEMA as ACOPY_SCHEMA

ROOT = Path("/var/lib/capital-ai-agent")
MAX_TASK_SIZE = 2048
STOP = False


def check_root(root: Path, *, require_mount: bool) -> None:
    root = Path(root)
    if not root.is_absolute():
        raise ValueError("state root must be absolute")
    # Refuse any symlink in the path ancestry before checking private children.
    # /var and /var/lib may be public directories, but cannot redirect the root.
    for ancestor in (root, *root.parents):
        if ancestor.is_symlink():
            raise ValueError("symlinked state-root ancestor")
    for name in ("", "checkpoints", "inbox", "approvals"):
        path = root / name
        info = path.lstat()
        if (not stat.S_ISDIR(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o700
                or info.st_uid != os.geteuid() or path.is_symlink()):
            raise ValueError("private worker directory invalid: " + (name or "root"))
    if require_mount and not os.path.ismount(root):
        raise ValueError("persistent worker mount not proven")


def load_task(path: Path, inbox: Path) -> dict:
    if path.parent != inbox or not re.fullmatch(r"[a-zA-Z0-9._-]{1,80}\.json", path.name):
        raise ValueError("invalid task path")
    info = path.lstat()
    if (not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600
            or info.st_uid != os.geteuid() or info.st_size > MAX_TASK_SIZE):
        raise ValueError("task must be a private regular file")
    # O_NONBLOCK ensures a task swapped for a FIFO cannot hang the worker.
    fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK | getattr(os, "O_NOFOLLOW", 0))
    try:
        opened = os.fstat(fd)
        if (not stat.S_ISREG(opened.st_mode)
                or opened.st_ino != info.st_ino or opened.st_dev != info.st_dev
                or opened.st_size > MAX_TASK_SIZE or opened.st_uid != os.geteuid()
                or stat.S_IMODE(opened.st_mode) != 0o600):
            raise ValueError("task changed during read")
        raw = os.read(fd, MAX_TASK_SIZE + 1)
    finally:
        os.close(fd)
    task = json.loads(raw)
    if isinstance(task, dict) and task.get("schema") == ACOPY_SCHEMA:
        task = research_task(task)
    if (not isinstance(task, dict) or set(task) != {"schema", "task_id", "domain", "query"}
            or task["schema"] != "CAPITAL_AI_OFFLINE_RESEARCH@1"
            or not isinstance(task["task_id"], str)
            or not re.fullmatch(r"[a-zA-Z0-9._:-]{1,96}", task["task_id"])
            or task["domain"] not in DOMAINS
            or not isinstance(task["query"], str)
            or not 1 <= len(task["query"]) <= 300):
        raise ValueError("unsupported research contract")
    return task


def process(task: dict, *, state_root: Path, repo_root: Path) -> dict:
    # Single-owner local scope only. Customer tenant admission is NOT implemented.
    # Do not accept tenant/repository from task files or retrieved documents.
    # An immutable digest of all five profiles + app/registry/root policy is part
    # of the trusted checkpoint key. Changing any profile starts a new thread,
    # never replays an old completed result as current evidence.
    binding = bind_domain_task(
        repo_root, tenant="owner-local", repository="SvenKulessa/Capital-AI",
        task=task,
    )
    initial = {"task_id": binding.thread_id, "domain": binding.domain,
               "query": binding.query}
    return execute_durable_graph(
        lambda saver: build_research_graph(repo_root, checkpointer=saver,
                                           expected_bundle_sha256=binding.bundle_sha256),
        binding.thread_id,
        str(state_root / "checkpoints" / (binding.thread_id + ".sqlite3")), initial,
        enforce_offline_binding=True,
    )


def _stop(_sig, _frame):
    global STOP
    STOP = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true", help="Offline inbox scanner; no network calls")
    parser.add_argument("--single", metavar="TASK_FILE", help="Run one synthetic/local offline task")
    parser.add_argument("--synthetic-root", help="Test-only private state path, never in --serve")
    parser.add_argument("--evidence-handoff", action="store_true", help="Single-task reference-only owner handoff")
    args = parser.parse_args()
    if args.serve == bool(args.single):
        parser.error("specify exactly one of --serve or --single")
    if args.evidence_handoff and not args.single:
        parser.error("--evidence-handoff requires --single")
    if args.serve and args.synthetic_root:
        parser.error("--serve cannot override production root")
    if args.serve and os.environ.get("CAPITAL_AI_OFFLINE_WORKER_ENABLED") != "true":
        parser.error("worker disabled by default")
    for name in ("GITHUB_TOKEN", "GH_TOKEN", "RENDER_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY", "OPENAI_API_KEY_PERSONAL", "DEEPSEEK_API_KEY", "SUPABASE_SECRET_KEY"):
        if os.environ.get(name):
            parser.error("provider credential not permitted in offline worker")
    os.umask(0o077)
    root = Path(args.synthetic_root) if args.synthetic_root else ROOT
    if not root.is_absolute():
        parser.error("state root must be absolute")
    check_root(root, require_mount=args.serve)
    repo_root = Path(__file__).resolve().parents[2]
    if args.single:
        task = load_task(Path(args.single), root / "inbox")
        result = process(task, state_root=root, repo_root=repo_root)
        if args.evidence_handoff:
            print(json.dumps(research_evidence_handoff(repo_root, result), sort_keys=True))
            return
        print(json.dumps({"status": result.get("status"), "domain": result.get("domain"),
                          "sources": len(result.get("citations", [])),
                          "agents": result.get("agent_route", [])}, sort_keys=True))
        return
    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)
    seen = set()
    while not STOP:
        check_root(root, require_mount=True)
        for path in sorted((root / "inbox").glob("*.json")):
            if STOP:
                break
            try:
                task = load_task(path, root / "inbox")
                task_hash = hashlib.sha256(json.dumps(task, sort_keys=True).encode()).hexdigest()
                if task_hash not in seen:
                    state = process(task, state_root=root, repo_root=repo_root)
                    seen.add(task_hash)
                    print(json.dumps({"event": "offline_research", "status": state.get("status")}), flush=True)
            except (OSError, ValueError, TypeError, json.JSONDecodeError):
                print(json.dumps({"event": "invalid_offline_task", "status": "BLOCKED"}), flush=True)
        time.sleep(3)


if __name__ == "__main__":
    main()
