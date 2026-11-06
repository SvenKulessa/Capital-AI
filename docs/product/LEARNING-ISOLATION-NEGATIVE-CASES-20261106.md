# Learning Isolation – Negative Cross-User Cases — 2026-11-06

**Issue:** #388 (WP-02 Ist-Scope-Isolation)  
**Main baseline:** `bea9223d1d661259d147d2cd22dc09004e62351f`  
**Status:** Isolation boundary **VERIFIED** in unit tests · Live production readback **NOT_PROVEN**  
**Contract:** `SOLO_MAINTAINER_FLOW@1` / AGENTS.md

## Verified isolation properties (code + tests)

All private Learning paths bind exclusively to the **server-verified session userId**:

| Endpoint | Binding | Client-supplied ID ignored | Negative test |
|----------|---------|----------------------------|---------------|
| `/api/learning/favorites` | `capital_ai_learning_favorites(_user_id)` | yes (`?userId=` discarded) | this PR + existing |
| `/api/learning/vocabulary/quiz/consume` | `capital_ai_consume_vocabulary_quiz(_user_id)` | yes | existing + this PR |
| `/api/profile/notes` | `capital_ai_private_notes(_user_id)` + `expectedUserId` | yes | existing |
| `/api/learning/simulator/*` | RPC `_user_id` from `auth.verify` | yes | existing |
| Vocabulary entitlement / badge | `capital_ai_get_vocabulary_access(_user_id)` | yes | existing |

No endpoint accepts a client-chosen `userId` for authorization. Cross-origin mutations are rejected before storage. Unauthenticated requests return 401 without touching RPCs.

## Negative cases added in this change

`server/learning-isolation.test.mjs` adds:

1. User A cannot read or delete User B’s favorites (separate stores, RPC always receives verified ID).
2. Quiz consume is per-user: User A consuming does not mark User B as used.
3. Attempt to pass a foreign `userId` query parameter is ignored; storage key remains the session subject.
4. Unauthenticated favorites/quiz calls never reach the RPC layer.

## Residual

- Tests are isolated unit/harness tests. A live production dual-user readback with real sessions is **NOT_PROVEN** and remains an owner-orchestrated step.
- Operator Content/Social engine isolation (the second security boundary in #388) is out of scope of this PR.

## Evidence refs

- `server/vocabulary-checkout.mjs` (favorites, quiz, notes)
- `server/learning-simulator.mjs`
- `server/vocabulary-checkout.test.mjs` (existing)
- `server/learning-isolation.test.mjs` (this change)
- Issue #388
