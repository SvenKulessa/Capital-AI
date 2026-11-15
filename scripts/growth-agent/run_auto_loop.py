"""Explicitly authorized single-worker launcher for the CAPITAL-AI GitHub/Render loop.

Example read-only:
  python3 scripts/growth-agent/run_auto_loop.py --pr 913 --head <sha> \
    --main <sha> --task job-913 --checkpoint /private/state.sqlite

For existing reviewed PR merge, caller must additionally supply
--prepared-head-reviewed --scope-reviewed --trust-reviewed --allow-merge.
The launcher never creates/modifies source files or triggers manual deployments.
"""
from __future__ import annotations

import argparse
import json

from auto_loop import Authority, execute_durable
from trusted_provider_actions import ProviderScope, TrustedGitHubRenderActions


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pr", type=int, required=True)
    parser.add_argument("--head", required=True, help="40-hex reviewed PR head")
    parser.add_argument("--main", required=True, help="40-hex reviewed main")
    parser.add_argument("--task", required=True, help="Non-secret unique work item ID")
    parser.add_argument("--checkpoint", required=True, help="Absolute private path ending in .sqlite")
    parser.add_argument("--prepared-head-reviewed", action="store_true")
    parser.add_argument("--scope-reviewed", action="store_true")
    parser.add_argument("--trust-reviewed", action="store_true")
    parser.add_argument("--allow-merge", action="store_true")
    parser.add_argument("--allow-ci-retry", action="store_true")
    parser.add_argument("--retry-run-id", type=int)
    parser.add_argument("--observe-deploy", action="store_true")
    arguments = parser.parse_args()

    if arguments.allow_merge and not all((
            arguments.prepared_head_reviewed, arguments.scope_reviewed, arguments.trust_reviewed)):
        parser.error("merge requires reviewed head, scope and trust boundaries")
    if arguments.allow_ci_retry != (arguments.retry_run_id is not None):
        parser.error("CI rerun permission must be bound to one exact workflow run ID")

    scope = ProviderScope(
        pr_number=arguments.pr, head_sha=arguments.head, main_sha=arguments.main,
        prepared_head_verified=arguments.prepared_head_reviewed,
        scope_complete=arguments.scope_reviewed,
        trust_boundaries_clear=arguments.trust_reviewed,
        allow_merge=arguments.allow_merge,
        allow_ci_retry=arguments.allow_ci_retry, retry_run_id=arguments.retry_run_id,
    )
    authority = Authority(
        read_only=not arguments.prepared_head_reviewed,
        allow_changes=arguments.prepared_head_reviewed,
        allow_merge=arguments.allow_merge,
        observe_existing_deploy=arguments.observe_deploy,
    )
    actions = TrustedGitHubRenderActions.from_env(scope)
    result = execute_durable(actions, authority, arguments.task, arguments.checkpoint)
    # Minimize state output and never print access tokens or remote payloads.
    print(json.dumps({"task": arguments.task,
                      "status": result.get("status", "NOT_PROVEN"),
                      "attempts": result.get("attempts", 0),
                      "merge_sha": result.get("merge_sha") or None,
                      "observed_sha": result.get("observed_sha") or None}))


if __name__ == "__main__":
    main()
