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

from agent_platform import DOMAINS, build_research_graph
from checkpoint_store import execute_durable_graph

ROOT = Path("/var/lib/capital-ai-agent")
MAX_TASK_SIZE = 2048
STOP = False


def check_root(root: Path, *, require_mount: bool) -> None:
    root = Path(root)
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
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        info = os.fstat(fd)
        if info.st_size > MAX_TASK_SIZE or info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) != 0o600:
            raise ValueError("task changed during read")
        raw = os.read(fd, MAX_TASK_SIZE + 1)
    finally:
        os.close(fd)
    task = json.loads(raw)
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
    task_hash = hashlib.sha256(json.dumps(task, sort_keys=True).encode()).hexdigest()[:28]
    thread_id = "research-" + task_hash
    initial = {"task_id": thread_id, "domain": task["domain"], "query": task["query"]}
    return execute_durable_graph(
        lambda saver: build_research_graph(repo_root, checkpointer=saver),
        thread_id, str(state_root / "checkpoints" / (thread_id + ".sqlite3")), initial,
    )


def _stop(_sig, _frame):
    global STOP
    STOP = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true", help="Offline inbox scanner; no network calls")
    parser.add_argument("--single", metavar="TASK_FILE", help="Run one synthetic/local offline task")
    parser.add_argument("--synthetic-root", help="Test-only private state path, never in --serve")
    args = parser.parse_args()
    if args.serve == bool(args.single):
        parser.error("specify exactly one of --serve or --single")
    if args.serve and args.synthetic_root:
        parser.error("--serve cannot override production root")
    if args.serve and os.environ.get("CAPITAL_AI_OFFLINE_WORKER_ENABLED") != "true":
        parser.error("worker disabled by default")
    for name in ("GITHUB_TOKEN", "GH_TOKEN", "RENDER_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"):
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
