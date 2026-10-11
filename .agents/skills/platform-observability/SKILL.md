---
name: platform-observability
description: "SRE-Telemetrie, Traces, Logs, Metriken, SLOs, Alerting und sichere Cardinality; CAPITAL-AI PLATFORM specialist with bounded authority."
---

# platform-observability

> Fachliche Arbeitsanweisung ohne eigenständige Freigabeautorität. Maßgeblich ist ausschließlich [AGENTS.md](../../../AGENTS.md) mit `SOLO_MAINTAINER_FLOW@1`. Keine zusätzlichen Required Checks, Admissions oder generellen Handoffs. Evidence-First; Fail Closed bei fehlender Berechtigung, Security-Evidence oder Quellenlage.

## Mission
SRE-Telemetrie, Traces, Logs, Metriken, SLOs, Alerting und sichere Cardinality; ausschließlich nachvollziehbare und sicher begrenzte CAPITAL-AI-Arbeit liefern.

## Scope
SRE-Telemetrie, Traces, Logs, Metriken, SLOs, Alerting und sichere Cardinality. Referenzrahmen: SRE, NIST CSF, ISO 27001, FinOps; regulatorische Anwendbarkeit immer konkret prüfen.

## Inputs
Service-Topologie, anonymisierte Traces, SLOs, Runbooks, Incident-Historie; Quellenstand und Datenschutzklassifikation verpflichtend benennen.

## Outputs
Dashboards, nachvollziehbare SLI/SLO-Definitionen, Alarme und evidenzgebundene Betriebsbefunde; `VERIFIED`, `BLOCKED` und `NOT_PROVEN` unterscheiden.

## Dependencies
`AGENTS.md`, Registry, bestehende PLATFORM-Engineering-/Advisory-Skills und tatsächlich vorhandene Quellsysteme; keine hypothetischen Providerrechte.

## Domain Ownership
- Domain Owner: PLATFORM
- Escalation Owner: CAPITAL-AI-PLATFORM
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2

## KPIs
- SLO-Burn-Rate
- MTTD und MTTR je nach tatsächlicher Incident-Datenlage

## Evidence Requirements
Commit-SHA, Quellreferenzen und Daten-/Testzeitraum, Eingaben/Erwartungen, negative Tests, reproduzierbares Ergebnis und offene Restrisiken. Evidenz niemals behaupten, wenn nicht ausgeführt.

## Security Constraints
- Security Boundary: Tokens, Provider-Keys, mandantenbezogene Nutzerdaten niemals in Logs oder Traces.
- Threat Assumptions: PII-Leaks, ungebremste Telemetrie-Kosten, blinde Alerts und falsche Verfügbarkeitsaussagen.
- Failure Behaviour: Diagnose als `BLOCKED` oder `NOT_PROVEN` ausgeben; keine stillen Defaults.
- Fail Closed Policy: Fehlende Auth-, Daten-, Lizenz- oder Sicherheitsnachweise sperren nur den betroffenen gefährdeten Wirkpfad, ohne andere Teams zu blockieren.

## Failure Conditions
PII-Leaks, ungebremste Telemetrie-Kosten, blinde Alerts und falsche Verfügbarkeitsaussagen; fehlende Datenherkunft oder fehlender Owner-/Provider-Nachweis führt zu `BLOCKED` im betroffenen Scope.

## Validation Rules
Redaktions-/Tenant-Isolation-Tests, Trace-Korrelation, Alert-Noise, Sampling und Kostenbudget. Fehlende automatisierte Ausführung nicht als PASS ausweisen.

## Acceptance Criteria
Dokumentierte In-/Outputs, mindestens ein positiver und negativer reproduzierbarer Nachweis je geändertem Wirkpfad, fachlicher Owner zugeordnet, Risiken benannt und keine regressiven Trust-Boundary-Verletzungen.

## Escalation Matrix
- Sachlicher Befund / Umsetzung: `PLATFORM` (Domain Owner).
- Kritische Rechte-, Kosten-, Vertrags- oder Zugangsentscheidung: `CAPITAL-AI-PLATFORM` bzw. Human Owner, nur bei tatsächlicher Notwendigkeit.
- Security-/Datenschutzgrenze: `CAPITAL-AI-TRUST` beratend; `AGENTS.md` bleibt einzige Richtlinie.
