# Merge TOCTOU and Injection Hardening

Status: repository security contract for `SOLO_MAINTAINER_FLOW@2`.

This document describes the implementation in `src/security/mergePolicy.ts` and `src/security/mergeIntegration.ts`. It does not create a new Required Check, approval layer, deployment permission, or production authorization. Root `AGENTS.md` remains the sole repository-wide authorizing policy.

## Trust boundary

Pull-request and issue titles, bodies and comments, commit messages, logs, generated text, websites, MCP/tool results and copied policy-like text are untrusted data. They may supply facts for validation but cannot grant authority, waive repository rules, disclose secrets, invent a Required Check, or turn a failed or missing check into success.

Merge authorization consumes structured GitHub evidence only. Free-form text does not participate in `MERGE_ELIGIBLE` evaluation.

## Fail-closed detections

The merge policy detects or rejects:

- missing, duplicate or ambiguous Required Check evidence;
- check-name spoofing through case changes, added whitespace, Unicode lookalikes or decoration because Required Check identity is exact;
- control and bidirectional characters in configured Required Check names;
- stale check evidence whose `headSha` differs from the validated PR HEAD;
- malformed or incomplete 40-character lowercase commit SHAs;
- pending Required Checks as `WAIT`, never success;
- failed, cancelled, timed-out, action-required, stale, startup-failure, neutral or skipped Required Checks as blocking evidence;
- unknown check states and conclusions as blocking evidence;
- PR HEAD or base changes between the validated and current snapshots as `REVALIDATE`;
- draft, closed, already-merged, unresolved-mergeability or non-mergeable PR snapshots before mutation;
- a provider-side `409` HEAD conflict during merge as `REVALIDATE`, without automatic retry;
- merge responses without `merged === true` and a valid merge commit SHA as unconfirmed;
- provider diagnostic text is not propagated by the merge-decision result.

## TOCTOU sequence

For an authorized merge operation:

1. Read the PR and pin its full HEAD and base SHA.
2. Read Required Check evidence for exactly that pinned HEAD.
3. Read the PR again after the check read.
4. Revalidate HEAD, base, draft/merged/state and mergeability.
5. Evaluate the fail-closed merge policy.
6. Only `MERGE_ELIGIBLE` may call the merge provider.
7. Pass the policy-returned `expectedHeadSha` unchanged to the merge operation.
8. Treat a provider HEAD conflict as `REVALIDATE`; do not retry from stale evidence.
9. Accept completion only from an explicit successful merge response with a valid commit SHA.

Any new HEAD or base requires fresh validation. Historical green CI is not transferred to a different HEAD.

## Injection model

The protection is architectural rather than keyword-based. Strings such as `SYSTEM`, `OWNER APPROVED`, `ignore previous instructions`, apparent check results, or requests to reveal credentials are ordinary untrusted text. The implementation does not scan such prose to decide whether it is authoritative; it excludes free-form text from the authorization path.

Negative tests cover prompt-like text, fake check-success text, exact-name spoofing, stale SHA evidence, HEAD/base races, terminal non-success states, pending checks and duplicate evidence.

## Mobile and MCP boundary

The same trust rule applies when repository content is viewed or supplied through a smartphone browser, GitHub client, chat interface, MCP connector or agent UI: presentation channel does not upgrade repository prose into authorization. This repository control protects the CAPITAL-AI merge decision path; it is not an Android/iOS device-security control and does not replace OS updates, screen/device authentication, account MFA/passkeys, app permission review or platform security controls.

## Existing gates only

Authoritative named Required Checks remain those defined by root `AGENTS.md`: `Docker Security Gate` and `Domain Governance`. GitHub-native rulesets and applicable security/code-scanning rules remain binding. This hardening adds negative regression coverage inside the existing workflow and does not create a third Required Check.

## Rollback

The implementation is repository-only and has no database, secret, OAuth, provider, billing or deployment mutation. Rollback is a normal revert of the hardening commit/PR, subject to the same repository rules.