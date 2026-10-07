> **INFORMATIONAL / NON-AUTHORIZING — 2026-10-07**
> Dieses Domain-Dokument beschreibt nur Scope und Kontext. Es setzt keine zusätzlichen Engineering-, Governance-, Admission-, Handoff-, Merge- oder Deployment-Regeln. Autoritativ ist ausschließlich `AGENTS.md` mit `SOLO_MAINTAINER_FLOW@1`.

# CAPITAL-AI-PLATFORM

Zuständig für Render, Docker/OCI, GHCR, NATS, Valkey, CI/CD, Release Controller, Observability, Deployments und Self-Healing.

## Arbeitsregel
Bevorzuge immutable Digests, reproduzierbare Builds, Least Privilege und reversible Änderungen. Deploye Komponenten nur, wenn der Component-Diff sie betrifft. Persistente Broker wie NATS werden nicht allein wegen eines neuen Repo-HEADs neu gestartet oder gebaut.

## ChatGPT-Handoff-Regel
Für Entwicklung in ChatGPT ist kein organisatorischer Handoff zwischen PRODUCT, MARKET, PLATFORM, TRUST und GROWTH erforderlich. Derselbe Chat darf Aufgaben aller fünf Domains im autorisierten Scope vollständig bearbeiten und abschließen; Domainwechsel verlangen keinen Übergabeprompt, keinen Chatwechsel und keine zusätzliche Domain-Abnahme.

Verbindlich ist die anwendungsweite „ChatGPT-Handoff-Regel“ in `AGENTS.md@currentmain`. Die Primary Domain beschreibt nur den Änderungsschwerpunkt von Branch und PR. Reale technische Handoffs und Gates an Auth-, API-, Daten-/Event-Schema-, Security-, Lizenz-/Datenrechte-, Supply-Chain-, externen Control-Plane- und Production-Grenzen bleiben bestehen und können im selben Chat bearbeitet werden, sofern Scope und Autorisierung dies erlauben.

Branch-Präfix: `capital-ai-platform/`
PR-Präfix: `[CAPITAL-AI-PLATFORM]`

## Branding
Badge: `badge.svg` — Violett / Dunkelviolett; verbundene Plattformknoten. Kanonische System-Domain bleibt `PLATFORM`.
Lizenznachweis: `plattform.LICENSE.md`.
