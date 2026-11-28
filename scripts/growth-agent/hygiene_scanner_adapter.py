"""Explicit host-only bridge to the existing documentation drift scanner.

The operator supplies trusted absolute executables, a private checkout and
independently established SHA-256 pins for all scanner code/profile inputs.
No task data selects paths, commands, flags, credentials or shell code.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess

from hygiene_lifecycle import valid_handoff

PIN_PATHS = ("scripts/documentation-drift.mjs",
             "packages/benchmark-core/document-hygiene.mjs",
             "documentary/documentation-drift-profile.json")


def _unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate receipt key")
        result[key] = value
    return result


class PinnedScanner:
    def __init__(self, root, *, node, git, pins):
        root = Path(root)
        if not root.is_absolute() or root.resolve(strict=True) != root or not root.is_dir():
            raise ValueError("trusted checkout required")
        self.root = root
        self.node = self._executable(node)
        self.git = self._executable(git)
        if type(pins) is not dict or set(pins) != set(PIN_PATHS) or any(
                type(x) is not str or not re.fullmatch(r"[a-f0-9]{64}", x)
                for x in pins.values()):
            raise ValueError("explicit scanner pins required")
        self.pins = dict(pins)
        self._verify_pins()

    @staticmethod
    def _executable(value):
        path = Path(value)
        if not path.is_absolute() or not path.is_file():
            raise ValueError("absolute trusted executable required")
        return path.resolve(strict=True)

    def _verify_pins(self):
        for name, expected in self.pins.items():
            path = self.root / name
            if (path.resolve(strict=True) != path or not path.is_file()
                    or path.stat().st_size > 1_048_576
                    or hashlib.sha256(path.read_bytes()).hexdigest() != expected):
                raise ValueError("scanner source pin mismatch")

    def _run(self, args, timeout):
        # No inherited tokens, NODE_OPTIONS, git configuration variables or shell.
        env = {"PATH": str(self.git.parent), "LANG": "C", "LC_ALL": "C",
               "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
               "GIT_OPTIONAL_LOCKS": "0", "GIT_TERMINAL_PROMPT": "0"}
        result = subprocess.run(args, cwd=self.root, env=env, stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                timeout=timeout, check=True)
        if len(result.stdout) > 16384:
            raise ValueError("scanner output too large")
        return result.stdout.decode("utf-8", errors="strict")

    def _head(self):
        sha = self._run([str(self.git), "rev-parse", "--verify", "HEAD"], 5).strip()
        if not re.fullmatch(r"[a-f0-9]{40}", sha):
            raise ValueError("invalid checkout head")
        return sha

    def __call__(self, phase, task_id):
        if phase not in ("baseline", "final", "readback") or type(task_id) is not str or not re.fullmatch(
                r"[A-Za-z0-9._:-]{1,96}", task_id):
            raise ValueError("invalid observer input")
        self._verify_pins()
        before = self._head()
        args = [str(self.node), str(self.root / PIN_PATHS[0]), "--root",
                str(self.root), "--report-only", "--compact", "--hygiene"]
        if re.fullmatch(r"offline-[a-f0-9]{40}", task_id):
            args += ["--thread-id", task_id]
        raw = self._run(args, 30)
        self._verify_pins()
        if self._head() != before:
            raise ValueError("checkout changed during scan")
        receipt = valid_handoff(json.loads(raw, object_pairs_hook=_unique_pairs), task_id)
        if receipt is None or receipt["sourceSha"] != before:
            raise ValueError("unbound scanner receipt")
        return receipt
