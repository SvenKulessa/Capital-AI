# PR #269: individual OAuth-state CodeQL triage

Observed source head: `9a51c92beffa680c495cfdb82c6106edbaaa2e0b`; synchronized main: `36013eb57238b7b2f65081d4a9e03246e006ecc7`.

| Alert | Location at observed head | Assessment | GitHub disposition |
| --- | --- | --- | --- |
| 13 | `server/social-media/provider-adapter.mjs:315` | False positive for insufficient password hashing: this hashes a cryptographically generated OAuth CSRF state, not a user password. | OPEN; dismissal not performed |
| 14 | `server/social-media/provider-store.test.mjs:70` | False positive: the regression test verifies the digest of that generated OAuth state and that raw state is absent from persisted request payloads. | OPEN; dismissal not performed |

## Evidence and reasoning

`createSocialOAuthState` generates 32 random bytes with Node `randomBytes`, encoded as base64url. At the historical observed head, the persisted value was its SHA-256 digest. See remediation below for the current derivation. The secret input therefore has 256 bits of generated entropy; it is not a human-selected password requiring a slow password derivation function. Callback validation binds the record to user, channel and redirect, rejects used or expired records, enforces a ten-minute lifetime, and compares equal-length digests with `timingSafeEqual`. The store uses `capital_social_consume_oauth_state` for atomic consume-before-exchange; a failed consume cannot exchange a code.

The regression tests exercise user/channel/redirect mismatch, expiry and replay rejection and confirm hash-only persistence. The database RPC contract remains required evidence for concurrency and authorization; mocks alone do not prove deployed behavior.

Rule reference: https://codeql.github.com/codeql-query-help/javascript/js-insufficient-password-hash/ (password-storage rule; checked 2026-10-08).

## Completion boundary

The source assessment is complete for these two locations. This document is neither a scanner waiver nor risk acceptance. No hash call was concealed, no test removed and no CodeQL threshold weakened. Actual GitHub alert dismissal, fresh CodeQL result and review-thread resolution remain unverified. The available GitHub connector does not expose the code-scanning disposition operation. Do not describe this PR as security-cleared until those live states have been checked.


## Remediation on 2026-10-08

Replaced both OAuth-state SHA-256 sinks with an explicit scrypt derivation
(N=16384, r=8, p=1, 32-byte output, 64 MiB maximum memory). The domain-separated
salt binds the random 256-bit state to the user ID, provider and exact redirect.
The persisted 64-hex-character contract and atomic consume RPC remain compatible.
Old SHA-256 states fail closed and expire after ten minutes; users restart OAuth.
The persistence regression independently computes the scrypt expected result.
Additional tests reject rewritten user/provider/redirect context and malformed digests.
No query suppression, ignored path, removed test or threshold change was introduced.
Fresh GitHub CodeQL completion is required before claiming alerts 13/14 resolved.

Local verification after remediation: `npm test`, `npm run test:security`,
`npm run test:social-provider` (36 tests) and Docker-context tests (5) pass.
