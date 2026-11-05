# Operator / Social Isolation Boundary — 2026-11-06

**Issue:** #388 (WP-02 / WP-06)  
**Main baseline:** `bea9223d1d661259d147d2cd22dc09004e62351f`  
**Status:** Boundary **documented and fail-closed in code**; live dual-account readback **NOT_PROVEN**.

## Separation rules (code)

- Customer Learning paths (favorites, notes, quiz, entitlements) bind exclusively to server-verified session `userId`. Client-supplied IDs are ignored.  
- Operator/Social/Content workers require explicit owner/IAM authorization and bound channel credentials.  
- No path mixes customer session tokens with operator social tokens.  
- Missing or mismatched token-owner binding fails closed before any provider dispatch.

## Existing test coverage

- Learning isolation: `server/vocabulary-checkout.test.mjs`, `server/learning-isolation.test.mjs` (pending PR).  
- Auth/session isolation: `server/auth.test.mjs`, `server/password-auth-isolation.test.mjs` (pending PR).

## Residual

Live production dual-user and dual-channel negative tests remain owner-orchestrated. This document does not claim live isolation proof.

## Next autonomous step (when unblocked)

Add focused unit tests for operator token-binding fail-closed paths once a safe mock harness for the social worker is identified.
