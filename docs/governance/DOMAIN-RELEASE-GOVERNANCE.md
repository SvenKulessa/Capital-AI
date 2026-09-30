# CAPITAL-AI Domain-, Versions- und Release-Governance

Stand: 2026-09-30

## Entwicklungsmodell

CAPITAL-AI verwendet anwendungsweit genau fünf fachliche Domains:

- CAPITAL-AI-PRODUCT — Frontend, Agent Client, UX und produktnahe Benutzerflüsse.
- CAPITAL-AI-MARKET — Fintech, Provider, Scoring, Screener und Market Data.
- CAPITAL-AI-PLATFORM — Render, Docker, NATS, Valkey, CI/CD und Observability.
- CAPITAL-AI-TRUST — Security, Compliance, Governance und QA.
- CAPITAL-AI-GROWTH — Dokumentation, SEO, Social, Branding und externe Produktkommunikation.

Eine Domain ist Orientierung und Ownership-Metadatum, keine künstliche Teamgrenze. Ein Work Package darf mehrere Domains berühren; die Primary Domain bestimmt Branch und PR. Harte Contracts gelten nur an echten technischen Grenzen wie Auth, Datenbank-/Event-Schema, Security Boundary, Public API, Evidence und Release Manifest.

## Branches und Pull Requests

Branch: `capital-ai-<domain>/<kurzer-zweck>-YYYYMMDD`

PR-Titel: `[CAPITAL-AI-<DOMAIN>] <präziser Titel>`

Labels beschreiben Art und Risiko, nicht die Domain. Zielmenge: `Bug`, `Fix`, `Patch`, `Security`, `Feature`, `Docs`, `Dependencies`, `Release`, `Breaking`.

## Versionierung

Produktversion: Semantic Versioning (SemVer), Quelle `VERSION`.
- PATCH: rückwärtskompatibler Fix.
- MINOR: rückwärtskompatible Funktion.
- MAJOR: inkompatible Änderung.
- Prerelease: `-alpha.N`, `-beta.N`, `-rc.N`.

Zusätzliche unveränderliche Identitäten:
- Source: Git SHA.
- Container: OCI Digest.
- Deployment: Render Deploy ID.
- Maschinenverträge: eigenes `schemaVersion`.

Dokumente behalten stabile Dateinamen. Inhaltliche Revisionen werden über Git-Historie und optional `documentVersion` im Dokumentkopf nachvollzogen; Dateinamen wie `final-v2-neu` sind zu vermeiden.

## Release-Vertrag

Ein Release ist erst Production-fähig, wenn Produktversion, Git SHA, OCI Digest, SBOM/Attestation und Runtime-Identität korreliert sind. `candidate.json` bleibt fail-closed; nur der bestehende Production-Handoff darf `deployEligible:true` erzeugen.

NATS wird nicht bei jedem App-Release neu deployed. Ein NATS-Deploy wird nur durch Änderungen an NATS-Image, Konfiguration, Entry Point, Broker-Security oder explizit freigegebene Runtime-/CVE-Maßnahmen ausgelöst.

## Daily Dependency & CVE Watch

Abhängigkeiten werden täglich auf neue Versionen und bekannte Schwachstellen geprüft. Automatische Update-PRs dürfen erstellt werden; Deployment bleibt an CI, Security Gates, Component-Diff und Production-Handoff gebunden. Major Upgrades, Auth-/Security-Runtimes und persistente Broker werden niemals ungeprüft direkt aus einem Versionsscan deployed.

## Self-Healing

Jede automatische Reparatur folgt fünf Validierungsschritten:
1. DETECT — Fehler/Drift feststellen.
2. CORRELATE — Source, Version, Digest, Runtime und betroffene Komponente korrelieren.
3. CLASSIFY — transient, config drift, deploy drift, dependency, security oder data integrity.
4. REMEDIATE — nur bounded, reversible und policy-erlaubte Reparatur.
5. VERIFY — Health, Identity, Security, Dependency und Data Integrity erneut verifizieren.

Fehlgeschlagene Verifikation führt zu ESCALATED, nicht zu endlosen Redeploy-Schleifen.
