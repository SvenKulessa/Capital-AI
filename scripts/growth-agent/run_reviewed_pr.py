"""Explicit trusted-worker CLI for an already implemented GitHub PR.

No CI workflow invokes this with write credentials. No cost, secret or provider
approval may be obtained from PR text, model output or this command itself.
"""
import argparse
from datetime import datetime, timezone, timedelta
import json
import os
from pathlib import Path
import stat

from auto_loop import Authority, execute_durable
from provider_adapters import GitHubRenderActions, SafeHTTP, TrustedAssessment, sha


def assessment_from_private_file(path: str, *, pr_number: int):
    p = Path(path)
    if not p.is_absolute() or p.is_symlink():
        raise ValueError("trusted assessment must be an absolute regular file")
    checkout = Path(__file__).resolve().parents[2]
    if p.resolve().is_relative_to(checkout):
        raise ValueError("trusted assessment cannot live inside the repository")
    info = p.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise ValueError("trusted assessment must be private and owned by the worker")
    if info.st_size > 4096:
        raise ValueError("oversized assessment")
    record = json.loads(p.read_text("utf-8"))
    if not isinstance(record, dict) or record.get("schema") != "CAPITAL_AI_TRUSTED_PR_ASSESSMENT@1":
        raise ValueError("assessment contract invalid")
    if record.get("pr") != pr_number or not sha(record.get("head_sha")) or not sha(record.get("base_sha")):
        raise ValueError("assessment not bound to PR SHA")
    expiry = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    if expiry.tzinfo is None or not now < expiry <= now + timedelta(minutes=15):
        raise ValueError("assessment must be current and expire within 15 minutes")
    flags = record.get("review") or {}
    if not isinstance(flags, dict):
        raise ValueError("assessment is not a review")
    result = TrustedAssessment(
        scope_complete=flags.get("scope_complete") is True,
        trust_boundaries_clear=flags.get("trust_boundaries_clear") is True,
        no_active_hold=flags.get("no_active_hold") is True,
        applicable_checks_green=flags.get("applicable_checks_green") is True,
    )
    return record, result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pr", type=int, required=True)
    parser.add_argument("--task-id", required=True)
    # Fixed, administrator-owned worker state directory; no CLI path injection.
    private_root = Path("/var/lib/capital-ai-agent")
    parser.add_argument("--merge", action="store_true")
    parser.add_argument("--observe-existing-deploy", action="store_true")
    args = parser.parse_args()
    if args.observe_existing_deploy and not args.merge:
        parser.error("deployment observation requires a merged PR")
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        parser.error("GITHUB_TOKEN not configured in trusted worker")
    assessment = TrustedAssessment()
    http = SafeHTTP(github_token=token, render_token=os.environ.get("RENDER_API_KEY", ""))
    record = None
    if args.merge:
        approval_path = private_root / "approvals" / (str(args.pr) + ".json")
        record, assessment = assessment_from_private_file(str(approval_path), pr_number=args.pr)
        if not assessment.approved():
            parser.error("trusted assessment is not complete")
        pr = http.github(f"/pulls/{args.pr}")
        if pr.get("head", {}).get("sha") != record["head_sha"] or pr.get("base", {}).get("sha") != record["base_sha"]:
            parser.error("approval stale: PR head or base changed")
    adapter = GitHubRenderActions(
        http, pr_number=args.pr, assessment=assessment, enable_merge=args.merge,
        approved_head_sha=record["head_sha"] if record else None,
        approved_base_sha=record["base_sha"] if record else None,
    )
    authority = Authority(
        read_only=not args.merge,
        allow_changes=args.merge,
        allow_merge=args.merge,
        observe_existing_deploy=args.observe_existing_deploy,
    )
    checkpoint_path = private_root / "checkpoints" / (args.task_id + ".sqlite3")
    result = execute_durable(adapter, authority, args.task_id, str(checkpoint_path))
    # Never log raw responses or credentials.
    print(json.dumps({"task_id": result["task_id"], "status": result["status"],
                      "merge_sha": result.get("merge_sha"), "history": result.get("history")}))
    if result["status"] not in ("VERIFIED", "MERGED", "READ_ONLY_COMPLETE"):
        raise SystemExit(2)


if __name__ == "__main__":
    main()
