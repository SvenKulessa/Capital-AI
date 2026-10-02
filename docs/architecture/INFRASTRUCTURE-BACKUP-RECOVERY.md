# Infrastructure Backup, Recovery & Identity Continuity

Date: 2026-10-02  
Domains: PLATFORM + TRUST

## Objective

Recover the application without relying on a single provider or on undocumented operator memory. Recovery evidence must distinguish configuration backup, data backup, credential recovery and runtime artifact recovery.

## Recovery layers

1. **Source & release** — Git repository, signed/attested GHCR digests, SBOM, provenance, configuration schemas.
2. **Identity** — ZITADEL configuration/export where supported, recovery administrators/passkeys, OIDC client configuration references; never export plaintext user passwords.
3. **Database** — Supabase daily backup baseline plus separately verified export; PITR only after explicit cost decision.
4. **Object storage** — periodic inventory and independent copy of critical private buckets.
5. **Market event evidence** — JetStream file-store backup/restore validation; stream metadata + durable data.
6. **Cache** — Valkey is reconstructable and is not a backup authority.
7. **Runtime** — Render service settings/readbacks + immutable image reference; recovery deploy uses an already-attested digest.

## ZITADEL vs Supabase Auth

**ZITADEL** is the stronger primary identity boundary for CAPITAL-AI when passkeys, B2B/multi-tenancy, policy-driven MFA and long-lived event-sourced audit history are priority requirements. **Supabase Auth** is operationally simpler when tight Postgres/RLS integration and fewer moving parts are the dominant requirement. Running both as independent credential authorities for the same user population would increase account-recovery, session and audit ambiguity.

Recommended topology:
- ZITADEL: authentication/identity authority.
- Supabase: application data/evidence/storage authority.
- A stable internal user/subject mapping links them.
- Supabase Auth remains fallback/recovery candidate only after an explicit migration plan, not a shadow second login authority.

## Recovery validation

Quarterly tabletop + isolated restore test:
- restore database/export to an isolated target;
- verify user-subject mapping without exposing credentials;
- restore JetStream evidence and replay hashes;
- start application from a known GHCR digest;
- verify Render/health/source SHA correlation;
- run login/session/logout against a non-production callback;
- record RTO/RPO observations in Documentary.
