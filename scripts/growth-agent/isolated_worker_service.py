"""Candidate-only supervised worker process: no polling, provider calls or writes.

A deployment is NOT authorized by this module. The process stays alive only
after strict local mount/owner checks. SIGTERM stops without launching work.
"""
from __future__ import annotations

import json
import signal
import threading
from pathlib import Path

from isolated_rag_worker import validate_private_root


def serve(root: Path = Path("/var/lib/capital-ai-agent"),
          *, stop: threading.Event | None = None) -> dict:
    result = validate_private_root(root, require_mount=True)
    if stop is None:
        stop = threading.Event()
        signal.signal(signal.SIGTERM, lambda *_: stop.set())
        signal.signal(signal.SIGINT, lambda *_: stop.set())
    # No implicit queue, model, provider, GitHub or Render activity.
    while not stop.wait(timeout=30):
        pass
    return {"status": "STOPPED", "localMount": result["mount"]}


if __name__ == "__main__":
    try:
        result = serve()
        print(json.dumps(result, sort_keys=True), flush=True)
    except (OSError, ValueError) as exc:
        print(json.dumps({"status": "BLOCKED", "reason": type(exc).__name__}),
              flush=True)
        raise SystemExit(2)
