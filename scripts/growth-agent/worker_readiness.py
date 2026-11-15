"""Read-only, non-secret readiness inventory for an EXISTING trusted worker.

Does not create directories, read token values, ping providers or grant rights.
A local permission result is not proof of a running worker or valid token scope.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import stat


def _private_directory(path: Path) -> str:
    try:
        info = path.lstat()  # unlike stat, rejects a symlink even to private target
    except FileNotFoundError:
        return "NOT_PROVEN"
    except OSError:
        return "BLOCKED"
    if (not stat.S_ISDIR(info.st_mode) or info.st_uid != os.geteuid()
            or info.st_mode & 0o077 or not os.access(path, os.R_OK | os.W_OK | os.X_OK)):
        return "BLOCKED"
    return "VERIFIED_LOCAL_PERMISSIONS"


def inspect_worker(root: Path = Path("/var/lib/capital-ai-agent"), *, env=None) -> dict:
    root = Path(root)
    if not root.is_absolute():
        raise ValueError("worker root must be absolute")
    env = os.environ if env is None else env
    paths = {"root": _private_directory(root),
             "checkpoints": _private_directory(root / "checkpoints"),
             "approvals": _private_directory(root / "approvals")}
    return {
        "schema": "CAPITAL_AI_WORKER_READINESS@1",
        "directoryPermissions": paths,
        "githubCredentialPresent": bool(env.get("GITHUB_TOKEN")),
        "renderCredentialPresent": bool(env.get("RENDER_API_KEY")),
        "providerPermissions": "NOT_PROVEN",
        "runningWorker": "NOT_PROVEN",
        "status": ("BLOCKED" if "BLOCKED" in paths.values()
                   else "NOT_PROVEN" if "NOT_PROVEN" in paths.values()
                   else "LOCAL_PERMISSIONS_VERIFIED"),
    }


if __name__ == "__main__":
    # This is a readback only. Never print credentials or their values.
    print(json.dumps(inspect_worker(), sort_keys=True))
