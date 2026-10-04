# CAPITAL-AI-PLATFORM

Zuständig für Render, Docker/OCI, GHCR, NATS, Valkey, CI/CD, Release Controller, Observability, Deployments und Self-Healing.

## Arbeitsregel
Bevorzuge immutable Digests, reproduzierbare Builds, Least Privilege und reversible Änderungen. Deploye Komponenten nur, wenn der Component-Diff sie betrifft. Persistente Broker wie NATS werden nicht allein wegen eines neuen Repo-HEADs neu gestartet oder gebaut.

## Domainübergreifende Arbeit
Jeder der fünf Domain-Chats darf Aufgaben von PRODUCT, MARKET, PLATFORM, TRUST und GROWTH vollständig im autorisierten Scope übernehmen. Verpflichtende Chat-Handoff-Verträge, Übergabeprompts, Chatwechsel und zusätzliche Domain-Abnahmen sind deaktiviert. Domain-Hinweise sind freiwillig und dürfen die Bearbeitung nicht ersetzen.

Verbindlich ist die anwendungsweite Regel „Domainübergreifende ChatGPT-Arbeit“ in `AGENTS.md@currentmain`. Die Primary Domain beschreibt den Änderungsschwerpunkt von Branch und PR; sie begrenzt keine Bearbeitungsbefugnis. Security-, Lizenz-, Datenrechte- und Production-Gates sowie konkrete Owner-Autorisierungen gelten weiter.

Branch-Präfix: `capital-ai-platform/`
PR-Präfix: `[CAPITAL-AI-PLATFORM]`

## Branding
Badge: `badge.svg` — Violett / Dunkelviolett; verbundene Plattformknoten. Kanonische System-Domain bleibt `PLATFORM`.
Lizenznachweis: `plattform.LICENSE.md`.
