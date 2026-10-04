# Infrastructure Backup, Recovery & Identity Continuity

Date: 2026-10-02  
Domains: PLATFORM + TRUST

## Objective

Recover the application without relying on a single provider or on undocumented operator memory. Recovery evidence must distinguish configuration backup, data backup, credential recovery and runtime artifact recovery.

## Recovery layers

1. **Source & release** — Git repository, signed/attested GHCR digests, SBOM, provenance, configuration schemas.
2. **Identity** — Supabase Auth project configuration, allowed redirects, recovery factors and server-side session configuration; never export plaintext user passwords, refresh tokens or privileged keys.
3. **Database** — Supabase daily backup baseline plus separately verified export; PITR only after explicit cost decision.
4. **Object storage** — periodic inventory and independent copy of critical private buckets.
5. **Market event evidence** — JetStream file-store backup/restore validation; stream metadata + durable data.
6. **Cache** — Valkey is reconstructable and is not a backup authority.
7. **Runtime** — Render service settings/readbacks + immutable image reference; recovery deploy uses an already-attested digest.

## Supabase Auth als führende Identity Authority

Supabase Auth ist die aktive Authentifizierungs- und Identity Authority für CAPITAL-AI. Eine zweite parallele Credential Authority würde Account-Recovery, Sessionbindung und Auditierbarkeit unnötig mehrdeutig machen und ist deshalb nicht Teil des aktiven Recovery-Pfads.

Recommended topology:
- Supabase Auth: authentication and identity authority.
- Supabase Postgres/RLS/Vault: application data and private credential storage with separate least-privilege boundaries.
- The verified Supabase `user.id` is the stable application identity key; historical Finance data is not linked solely by matching email addresses.
- Historical ZITADEL evidence remains immutable documentation only and is not an active recovery dependency.

## Recovery validation

Quarterly tabletop + isolated restore test:
- restore database/export to an isolated target;
- verify user-subject mapping without exposing credentials;
- restore JetStream evidence and replay hashes;
- start application from a known GHCR digest;
- verify Render/health/source SHA correlation;
- run login/session/logout against a non-production callback;
- record RTO/RPO observations in Documentary.
