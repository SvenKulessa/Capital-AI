"""Read-only Alpaquita APK license metadata readback inside the offline worker image.

A missing stripped APK database is NOT_PROVEN, never a zero-license proof.
No shell, network, mount mutation, credentials, or package manager.
"""
from __future__ import annotations

import json
from pathlib import Path

APK_PATHS = (Path("/var/lib/apk/db/installed"), Path("/lib/apk/db/installed"))
MAX_BYTES = 12 * 1024 * 1024


def parse_apk_installed(data: bytes) -> list[dict]:
    text = data.decode("utf-8")
    packages = []
    for record in text.split("\n\n"):
        fields = {}
        for row in record.splitlines():
            if len(row) > 2 and row[1] == ":" and row[0] in "PVLO":
                fields[row[0]] = row[2:]
        if not fields:
            continue
        if not fields.get("P") or not fields.get("V"):
            raise ValueError("incomplete installed APK record")
        packages.append({
            "name": fields["P"],
            "version": fields["V"],
            "license": fields.get("L") or "NOASSERTION",
            "origin": fields.get("O") or "NOASSERTION",
        })
    if len(packages) != len({(p["name"], p["version"]) for p in packages}):
        raise ValueError("ambiguous installed APK package identity")
    return sorted(packages, key=lambda p: (p["name"], p["version"]))


def inspect(paths=APK_PATHS) -> dict:
    for path in paths:
        if path.is_symlink():
            raise ValueError("symlinked APK database")
        if not path.exists():
            continue
        if not path.is_file() or not 1 <= path.stat().st_size <= MAX_BYTES:
            raise ValueError("invalid APK database file")
        packages = parse_apk_installed(path.read_bytes())
        if not packages:
            raise ValueError("empty APK database")
        return {
            "schema": "CAPITAL_AI_WORKER_APK_LICENSES@1",
            "status": "APK_METADATA_FOUND",
            "path": str(path),
            "packages": packages,
        }
    return {
        "schema": "CAPITAL_AI_WORKER_APK_LICENSES@1",
        "status": "APK_METADATA_NOT_PROVEN",
        "path": None,
        "packages": [],
    }


if __name__ == "__main__":
    print(json.dumps(inspect(), sort_keys=True))
