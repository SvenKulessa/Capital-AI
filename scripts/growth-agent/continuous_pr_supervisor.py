"""Non-activating, single-worker continuous PR supervisor.

This module does not request GitHub/Render credentials or perform network,
shell, repository, or merge mutations. A separately authorized trusted adapter
must provide candidate selection, CI evidence, and one bounded execution.
CI polling is every 30 seconds while checks are pending; completion immediately
advances to the next distinct PR/head. No recursion or self-dispatch.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import fcntl
import os
import re
import stat
import time
from typing import Callable, Protocol

POLL_SECONDS = 30
_SHA = re.compile(r"[0-9a-f]{40}\Z")


@dataclass(frozen=True)
class Candidate:
    pr_number: int
    head_sha: str

    def __post_init__(self) -> None:
        if (type(self.pr_number) is not int or not 1 <= self.pr_number <= 999999
                or not isinstance(self.head_sha, str)
                or _SHA.fullmatch(self.head_sha) is None):
            raise ValueError("invalid or unbound PR candidate")

    @property
    def key(self) -> tuple[int, str]:
        return self.pr_number, self.head_sha


@dataclass(frozen=True)
class CheckReadback:
    """Result from a trusted reader, not PR text or a model assertion.

    PENDING must mean the authoritative provider actually reported pending;
    READY is only an indication to launch a fresh scoped admission, never
    authority to merge. FAILED and NOT_PROVEN are terminal for this head.
    """
    head_sha: str
    state: str  # PENDING, READY, FAILED, NOT_PROVEN


def check_state(candidate: Candidate, readback: object) -> str:
    if (not isinstance(readback, CheckReadback)
            or readback.head_sha != candidate.head_sha
            or readback.state not in {"PENDING", "READY", "FAILED", "NOT_PROVEN"}):
        return "NOT_PROVEN"
    return readback.state


class TrustedAdapter(Protocol):
    def next_candidate(self, already_processed: frozenset[tuple[int, str]]) -> Candidate | None: ...
    def read_ci(self, candidate: Candidate) -> CheckReadback: ...
    def execute_one(self, candidate: Candidate) -> str: ...
    def record_cycle(self, candidate: Candidate, result: str) -> None: ...


def _sleep_or_stop(seconds: int, stop_requested: Callable[[], bool], sleep: Callable[[int], None]) -> bool:
    if stop_requested():
        return False
    sleep(seconds)
    return not stop_requested()


def serve(
    adapter: TrustedAdapter,
    *,
    stop_requested: Callable[[], bool],
    sleep: Callable[[int], None] = time.sleep,
    max_cycles: int | None = None,
) -> int:
    """Process unique PR heads serially until stopped, optionally bounded for tests.

    An adapter must perform its *own* live expected-head/base, policy, trust,
    GitHub ruleset and provider authorization before each mutation. The
    supervisor never promotes a CI status to merge approval. Exception paths
    fail closed; invalid input cannot cause another action on that candidate.
    """
    if max_cycles is not None and (type(max_cycles) is not int or max_cycles < 0):
        raise ValueError("max_cycles invalid")
    completed: set[tuple[int, str]] = set()
    cycles = 0
    while not stop_requested() and (max_cycles is None or cycles < max_cycles):
        try:
            candidate = adapter.next_candidate(frozenset(completed))
        except Exception:
            # Missing or broken selection must never create a tight retry loop.
            if not _sleep_or_stop(POLL_SECONDS, stop_requested, sleep):
                break
            continue
        if candidate is None:
            if not _sleep_or_stop(POLL_SECONDS, stop_requested, sleep):
                break
            continue
        if not isinstance(candidate, Candidate):
            if not _sleep_or_stop(POLL_SECONDS, stop_requested, sleep):
                break
            continue
        if candidate.key in completed:
            # Reject adapters ignoring the deduplication contract.
            if not _sleep_or_stop(POLL_SECONDS, stop_requested, sleep):
                break
            continue

        result = "NOT_PROVEN"
        while not stop_requested():
            try:
                state = check_state(candidate, adapter.read_ci(candidate))
            except Exception:
                state = "NOT_PROVEN"
            if state == "PENDING":
                if not _sleep_or_stop(POLL_SECONDS, stop_requested, sleep):
                    break
                continue
            if state == "READY":
                # READY is not merge admission. execute_one must revalidate.
                try:
                    result = adapter.execute_one(candidate)
                    if result not in {"VERIFIED", "MERGED", "READ_ONLY_COMPLETE", "BLOCKED", "NOT_PROVEN"}:
                        result = "NOT_PROVEN"
                except Exception:
                    result = "NOT_PROVEN"
            else:
                result = "BLOCKED" if state == "FAILED" else "NOT_PROVEN"
            break
        if stop_requested():
            break
        completed.add(candidate.key)
        cycles += 1
        try:
            adapter.record_cycle(candidate, result)
        except Exception:
            # Evidence persistence failed: do not proceed to another task.
            break
        # Terminal cycle completed; start the next independent cycle now.
    return cycles


class SingleWorkerLock:
    """Owner-private state lock. Avoid concurrent workers or symlink swapping."""

    def __init__(self, filename: str):
        self.path = Path(filename)
        self.fd: int | None = None

    def __enter__(self):
        path = self.path
        if not path.is_absolute() or path.suffix != ".lock":
            raise ValueError("lock must be an absolute .lock file")
        parent = path.parent
        info = parent.stat()
        if (parent.is_symlink() or not stat.S_ISDIR(info.st_mode)
                or stat.S_IMODE(info.st_mode) != 0o700
                or info.st_uid != os.geteuid() or path.is_symlink()):
            raise ValueError("private worker state not proven")
        fd = os.open(path, os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0), 0o600)
        try:
            info = os.fstat(fd)
            if (not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid()
                    or stat.S_IMODE(info.st_mode) != 0o600):
                raise ValueError("unsafe supervisor lock")
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BaseException:
            os.close(fd)
            raise
        self.fd = fd
        return self

    def __exit__(self, exc_type, exc, tb):
        if self.fd is not None:
            fcntl.flock(self.fd, fcntl.LOCK_UN)
            os.close(self.fd)
            self.fd = None
