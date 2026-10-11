# platform-observability — Responsibilities

> Fachliche Arbeitsanweisung ohne eigenständige Freigabeautorität. Maßgeblich ist ausschließlich [AGENTS.md](../../../AGENTS.md) mit `SOLO_MAINTAINER_FLOW@1`. Keine zusätzlichen Required Checks, Admissions oder generellen Handoffs. Evidence-First; Fail Closed bei fehlender Berechtigung, Security-Evidence oder Quellenlage.

## Mission
SRE-Telemetrie, Traces, Logs, Metriken, SLOs, Alerting und sichere Cardinality; nur innerhalb vorhandener CAPITAL-AI-Domains.

## Scope
SRE-Telemetrie, Traces, Logs, Metriken, SLOs, Alerting und sichere Cardinality.

## Inputs
Service-Topologie, anonymisierte Traces, SLOs, Runbooks, Incident-Historie.

## Outputs
Dashboards, nachvollziehbare SLI/SLO-Definitionen, Alarme und evidenzgebundene Betriebsbefunde.

## Dependencies
- Source of Truth: `.agents/skills/registry.json#skillGovernance.platform-observability`
- Autorität: `AGENTS.md`
- Zuständige Domain: `PLATFORM`; geteilte Nutzung ist keine zusätzliche Ownership

## Domain Ownership
- Domain Owner: PLATFORM
- Escalation Owner: CAPITAL-AI-PLATFORM
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2

## KPIs
- SLO-Burn-Rate
- MTTD und MTTR je nach tatsächlicher Incident-Datenlage

## Evidence Requirements
Quellen- und Versionstand, Testkommando mit Ergebnis/Commit-SHA, Gegenprobe, beobachtete Grenzfälle und mögliche Rücknahme. KPI-Werte ohne Messung sind `NOT_PROVEN`.

## Security Constraints
- Security Boundary: Tokens, Provider-Keys, mandantenbezogene Nutzerdaten niemals in Logs oder Traces.
- Threat Assumptions: PII-Leaks, ungebremste Telemetrie-Kosten, blinde Alerts und falsche Verfügbarkeitsaussagen.
- Failure Behaviour: `BLOCKED` bei unbewiesener sicherheitskritischer Voraussetzung; keine stillen Fallback-Rechte.
- Fail Closed Policy: Nur den nachweislich betroffenen Wirkpfad sperren; kein Credential/PII-Leak, keine implizite Lizenzfreigabe.

## Failure Conditions
PII-Leaks, ungebremste Telemetrie-Kosten, blinde Alerts und falsche Verfügbarkeitsaussagen; keine ungeprüften Live-Daten, Auth- oder Tarif-Attests.

## Validation Rules
Redaktions-/Tenant-Isolation-Tests, Trace-Korrelation, Alert-Noise, Sampling und Kostenbudget. Dokumentations-/CI-Strukturprüfungen prüfen nur Struktur, nicht die externe Anwendung.

## Acceptance Criteria
Ownership mit Registry identisch; drei Skill-Dateien vorhanden; Test- und Quellenbelege unterscheidbar; Security-Grenzen und Exit-Criteria nachvollziehbar.

## Escalation Matrix
- Umsetzung: PLATFORM.
- Zugänge / Vertrag / Zahlung: CAPITAL-AI-PLATFORM, nur wenn persönlich erforderlich.
- Sicherheitsbezug: CAPITAL-AI-TRUST im selben Workflow, keine neue Freigabestufe.
