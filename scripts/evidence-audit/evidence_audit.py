#!/usr/bin/env python3
"""Offline, fail-closed GitHub Actions evidence renderer. No network or writes outside output directory."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re

SHA = re.compile(r"^[a-f0-9]{40}$")
REPO = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
CHECKS = ("Docker Security Gate", "Domain Governance")
STATUSES = {"VERIFIED", "BLOCKED", "NOT_PROVEN"}

def _clean(value, limit=180):
    if not isinstance(value, str):
        return ""
    # Treat all provider text as untrusted; never reproduce messages, PR bodies or log output.
    return "".join(ch for ch in value if ch.isalnum() or ch in " ._/-:").strip()[:limit]

def build_report(source):
    if not isinstance(source, dict) or not REPO.fullmatch(str(source.get("repository", ""))):
        raise ValueError("invalid repository")
    owner, name = source["repository"].split("/")
    if owner in (".", "..") or name in (".", ".."):
        raise ValueError("invalid repository")
    sha = source.get("head_sha")
    if not isinstance(sha, str) or not SHA.fullmatch(sha):
        raise ValueError("invalid head_sha")
    runs = source.get("checks")
    if not isinstance(runs, list) or len(runs) > 200:
        raise ValueError("checks must be a bounded list")
    findings = []
    for name in CHECKS:
        matching = [x for x in runs if isinstance(x, dict) and x.get("name") == name]
        # Ambiguous, stale or incomplete snapshots cannot prove a passing check.
        valid = [x for x in matching if x.get("head_sha") == sha and x.get("status") == "completed"
                 and isinstance(x.get("run_id"), int) and x["run_id"] > 0]
        if len(matching) != 1 or len(valid) != 1:
            status, reason, run_id = "NOT_PROVEN", "MISSING_AMBIGUOUS_OR_STALE", None
        else:
            item = valid[0]
            run_id = item["run_id"]
            if item.get("conclusion") == "success":
                status, reason = "VERIFIED", "MATCHING_COMPLETED_SUCCESS"
            elif item.get("conclusion") in ("failure", "timed_out", "cancelled", "action_required"):
                status, reason = "BLOCKED", "CHECK_NOT_SUCCESSFUL"
            else:
                status, reason = "NOT_PROVEN", "UNKNOWN_CONCLUSION"
        findings.append({"check": name, "status": status, "reason": reason, "run_id": run_id})
    overall = ("BLOCKED" if any(f["status"] == "BLOCKED" for f in findings)
               else "VERIFIED" if all(f["status"] == "VERIFIED" for f in findings) else "NOT_PROVEN")
    return {"schema_version": "1.0", "repository": source["repository"], "head_sha": sha,
            "scope": "offline_snapshot_only", "overall": overall, "findings": findings,
            "limitations": ["Not a certification or penetration test",
                            "Snapshot authenticity, rulesets, tenant authorization and live deployment not independently verified"]}

def render_pdf(report):
    # Minimal one-page ASCII-only PDF, no third-party dependencies or active content.
    lines = ["CAPITAL-AI Evidence Audit", "Repository: " + report["repository"],
             "Commit: " + report["head_sha"], "Overall: " + report["overall"]]
    lines += [f'{f["check"]}: {f["status"]} ({f["reason"]})' for f in report["findings"]]
    lines += ["Offline snapshot only; no certification or live validation."]
    def pdftext(s):
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = "BT /F1 11 Tf 50 780 Td 15 TL " + " ".join(
        ("(" + pdftext(line) + ") Tj" + (" T*" if i < len(lines)-1 else "")) for i, line in enumerate(lines)
    ) + " ET"
    payload = stream.encode("ascii")
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            b"<< /Length " + str(len(payload)).encode() + b" >>\nstream\n" + payload + b"\nendstream"]
    data = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objs, 1):
        offsets.append(len(data))
        data += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    start = len(data)
    data += f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode()
    for offset in offsets[1:]:
        data += f"{offset:010d} 00000 n \n".encode()
    data += f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n".encode()
    return bytes(data)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    path = Path(args.snapshot)
    if path.is_symlink() or path.stat().st_size > 1024 * 1024:
        raise ValueError("unsafe snapshot")
    report = build_report(json.loads(path.read_text(encoding="utf-8")))
    out = Path(args.out)
    if out.is_symlink() or (out.exists() and not out.is_dir()):
        raise ValueError("unsafe output directory")
    out.mkdir(mode=0o700, parents=True, exist_ok=True)
    if out.stat().st_mode & 0o077:
        raise ValueError("output directory must be private")
    for filename, data in (("evidence.json", (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()),
                           ("evidence.pdf", render_pdf(report))):
        target = out / filename
        if target.is_symlink():
            raise ValueError("output symlink forbidden")
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | getattr(os, "O_NOFOLLOW", 0), 0o600)
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
    print("status=" + report["overall"] + " sha256=" + hashlib.sha256(render_pdf(report)).hexdigest())

if __name__ == "__main__":
    main()
