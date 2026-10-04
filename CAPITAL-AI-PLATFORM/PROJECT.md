# CAPITAL-AI-PLATFORM

Zuständig für Render, Docker/OCI, GHCR, NATS, Valkey, CI/CD, Release Controller, Observability, Deployments und Self-Healing.

## Arbeitsregel
Bevorzuge immutable Digests, reproduzierbare Builds, Least Privilege und reversible Änderungen. Deploye Komponenten nur, wenn der Component-Diff sie betrifft. Persistente Broker wie NATS werden nicht allein wegen eines neuen Repo-HEADs neu gestartet oder gebaut.

## Zuständigkeitswarnung
Bei Frontend/Agent/UX: **PRODUCT ist Primary Domain**.
Bei Provider/Scoring/Screener/Market Data: **MARKET ist Primary Domain**.
Bei Security/Compliance/Governance/QA: **TRUST ist Primary Domain**.
Bei Docs/SEO/Social/Branding: **GROWTH ist Primary Domain**.

Branch-Präfix: `capital-ai-platform/`
PR-Präfix: `[CAPITAL-AI-PLATFORM]`

## Branding
Badge: `badge.svg` — Violett / Dunkelviolett; verbundene Plattformknoten. Kanonische System-Domain bleibt `PLATFORM`.
Lizenznachweis: `plattform.LICENSE.md`.
