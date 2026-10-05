# CAPITAL-AI Domain-, Versions- und Release-Governance

Stand: 2026-10-04

## Oberste Engineering-Priorität

Die repository-weite Root-Policy `AGENTS.md` ist für Entwicklungs-, Update-, Docker- und Deployment-Arbeiten verbindlich. Security, Compliance, Lizenz-/Provenance-Sicherheit, Reproduzierbarkeit, Evidenz und Production-Stabilität haben Vorrang vor Bequemlichkeit, Geschwindigkeit und einem bloßen Versionssprung.

Patch-/Minor-Updates dürfen als Routineklasse behandelt werden, wenn Risiko und Kompatibilität niedrig sind. Major-Updates sind immer eigenständige Migrationen mit Breaking-Change-, Runtime-, Typ-, Lizenz- und Rollback-Prüfung. Security-Updates bleiben unabhängig davon freigaberelevant und dürfen nicht durch Komfortregeln unterdrückt werden.

Ein erfolgreicher Test, Build oder Scan ist niemals allein eine Lizenz-, Security- oder Production-Freigabe.

## Entwicklungsmodell

CAPITAL-AI verwendet anwendungsweit genau fünf fachliche Domains:

- CAPITAL-AI-PRODUCT — Frontend, Agent Client, UX und produktnahe Benutzerflüsse.
- CAPITAL-AI-MARKET — Fintech, Provider, Scoring, Screener und Market Data.
- CAPITAL-AI-PLATFORM — Render, Docker, NATS, Valkey, CI/CD und Observability.
- CAPITAL-AI-TRUST — Security, Compliance, Governance und QA.
- CAPITAL-AI-GROWTH — Dokumentation, SEO, Social, Branding und externe Produktkommunikation.

Eine Domain ist Orientierung und Ownership-Metadatum, keine künstliche Teamgrenze. Ein Work Package darf mehrere Domains berühren; die Primary Domain bestimmt Branch und PR. Harte Contracts gelten nur an echten technischen Grenzen wie Auth, Datenbank-/Event-Schema, Security Boundary, Public API, Evidence und Release Manifest.

## Domainübergreifende ChatGPT-Arbeit

Der Owner entwickelt alleine. Jeder Chat und Agent von PRODUCT, MARKET, PLATFORM, TRUST und GROWTH darf Aufgaben aller fünf Domains im autorisierten Scope vollständig übernehmen. Organisatorische Handoff-Verträge, verpflichtende Übergabeprompts, Chatwechsel und zusätzliche Domain-Abnahmen sind anwendungsweit deaktiviert. Die verbindliche Vorrang- und Geltungsregel steht in `AGENTS.md`, Abschnitt „Domainübergreifende ChatGPT-Arbeit“.

Domain-Zuordnung ist Metadatum; sie erzeugt weder eine Bearbeitungssperre noch einen neuen Freigabeschritt. Freiwillige Kontextübergaben bleiben möglich. Freigaben werden ausschließlich über konkrete technische, Security-, Lizenz-, Supply-Chain- und Production-Gates mit belastbarer Evidence bewertet. Reale technische und ausdrücklich vorgeschriebene unabhängige Prüfungen bleiben erforderlich.

Maschinenlesbare Evidence-/Datenverträge und der technische Production-Handoff bleiben verbindlich. Die Änderung deaktiviert ausschließlich organisatorische Chat-Handoffs, keine Auth-, Security-, Lizenz-, Datenrechte-, Supply-Chain-, Kosten- oder Release-Gates. Gespeicherte ChatGPT-Projekteinstellungen und Richtlinien anderer Repositories werden durch diesen Contract nicht automatisch geändert.

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

## Remote-AI-Änderungsevidenz

Schreibende oder zustandsverändernde Änderungen an externen Control Planes, die per Cloud Browser durch eine AI-gestützte Remote-Sitzung im Namen des Owners durchgeführt werden, müssen nach `docs/security/REMOTE-AI-CLOUD-BROWSER-SESSIONS.md` dokumentiert werden. Pflichtkennzeichnung: **Remote AI basierte Cloud Browser Sitzung — durch den Owner freigegeben**.

Die Evidence muss den autorisierten Scope, die ausgeführten Änderungen und einen verifizierten Endzustand enthalten. Sie ist Audit-/Change-Evidenz und ersetzt keine Security-, Lizenz- oder Production-Freigabe.

## Release-Vertrag

Ein Release ist erst Production-fähig, wenn Produktversion, Git SHA, OCI Digest, SBOM/Attestation und Runtime-Identität korreliert sind. `candidate.json` bleibt fail-closed; nur der bestehende Production-Handoff darf `deployEligible:true` erzeugen.

NATS wird nicht bei jedem App-Release neu deployed. Ein NATS-Deploy wird nur durch Änderungen an NATS-Image, Konfiguration, Entry Point, Broker-Security oder explizit freigegebene Runtime-/CVE-Maßnahmen ausgelöst.

## Daily Dependency & CVE Watch

Abhängigkeiten, Tools, Runtimes, GitHub Actions und Container-Bases werden regelmäßig auf neue stabile Versionen und bekannte Schwachstellen geprüft. Ziel ist grundsätzlich der neueste stabile, unterstützte Stand, sofern Herkunft, Integrität, Security, Lizenz/Redistribution und Kompatibilität positiv verifiziert sind.

**Jedes** Update, Upgrade, Patch und jeder dependency-bezogene Bugfix unterliegt zusätzlich dem `docs/security/DEPENDENCY-UPDATE-TRUST-MODEL.md`: offizielle Herkunft, Registry-/Artefakt-Evidenz, Security Intelligence, Lizenz-/Redistribution-Prüfung sowie Maintainer-/Community-Gegenprüfung auf Supply-Chain-Kompromittierung, Takeover, Typosquatting, zurückgezogene Releases und relevante Regressionen. Community-Signale ergänzen die offizielle Evidenz, ersetzen sie aber nicht.

Automatische Update-PRs dürfen erstellt werden; Deployment bleibt an CI, Security Gates, Component-Diff und Production-Handoff gebunden. Major Upgrades, Auth-/Security-Runtimes und persistente Broker werden niemals ungeprüft direkt aus einem Versionsscan deployed. Ungeklärte Herkunfts-, Kompromittierungs- oder Lizenzsignale führen fail-closed zu `BLOCKED` oder `ESCALATED`.

## Self-Healing

Jede automatische Reparatur folgt fünf Validierungsschritten:
1. DETECT — Fehler/Drift feststellen.
2. CORRELATE — Source, Version, Digest, Runtime und betroffene Komponente korrelieren.
3. CLASSIFY — transient, config drift, deploy drift, dependency, security oder data integrity.
4. REMEDIATE — nur bounded, reversible und policy-erlaubte Reparatur.
5. VERIFY — Health, Identity, Security, Dependency und Data Integrity erneut verifizieren.

Fehlgeschlagene Verifikation führt zu ESCALATED, nicht zu endlosen Redeploy-Schleifen.
