"""Single-owner LangGraph SQLite checkpoint store for offline multi-agent tasks.

Shares the repository's pinned SqliteSaver, fixed thread namespace and
fail-closed filesystem invariants with the existing reviewed-PR graph.
"""
from __future__ import annotations

import fcntl
import os
from pathlib import Path
import re
import sqlite3
import stat

from langgraph.checkpoint.sqlite import SqliteSaver
from offline_task_scope import bind_checkpoint


def execute_durable_graph(graph_factory, task_id: str, db_path: str, initial_state: dict,
                          *, binding_digest: str | None = None) -> dict:
    if (not isinstance(task_id, str)
            or not re.fullmatch(r"[a-zA-Z0-9._:-]{1,96}", task_id)
            or not isinstance(initial_state, dict) or initial_state.get("task_id") != task_id):
        raise ValueError("invalid checkpoint task")
    path = Path(db_path)
    if not path.is_absolute() or path.suffix != ".sqlite3":
        raise ValueError("checkpoint path must be absolute SQLite")
    directory = path.parent
    info = directory.lstat()
    if (not stat.S_ISDIR(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o700
            or info.st_uid != os.geteuid() or directory.is_symlink()):
        raise ValueError("checkpoint directory not owner-private")
    lock = path.with_name(path.name + ".lock")
    if path.is_symlink() or lock.is_symlink():
        raise ValueError("checkpoint symlink forbidden")
    os.umask(0o077)
    flags = os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0)
    lockfd = os.open(lock, flags, 0o600)
    try:
        fcntl.flock(lockfd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        lstat = os.fstat(lockfd)
        if (not stat.S_ISREG(lstat.st_mode) or lstat.st_uid != os.geteuid()
                or stat.S_IMODE(lstat.st_mode) != 0o600):
            raise ValueError("checkpoint lock permissions invalid")
        fd = os.open(path, flags, 0o600)
        try:
            meta = os.fstat(fd)
            if (not stat.S_ISREG(meta.st_mode) or meta.st_uid != os.geteuid()
                    or stat.S_IMODE(meta.st_mode) != 0o600):
                raise ValueError("checkpoint database permissions invalid")
        finally:
            os.close(fd)
        conn = sqlite3.connect(path, check_same_thread=False, timeout=5.0)
        try:
            if binding_digest is not None:
                bind_checkpoint(conn, binding_digest)
            graph = graph_factory(SqliteSaver(conn))
            config = {"configurable": {"thread_id": task_id}, "recursion_limit": 24}
            snapshot = graph.get_state(config)
            if snapshot and snapshot.values:
                if not snapshot.next:
                    return snapshot.values
                return graph.invoke(None, config)
            return graph.invoke(initial_state, config)
        finally:
            conn.close()
    finally:
        fcntl.flock(lockfd, fcntl.LOCK_UN)
        os.close(lockfd)
