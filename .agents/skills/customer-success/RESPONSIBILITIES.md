# customer-success — Responsibilities

> Fachliche Arbeitsanweisung ohne eigenständige Freigabeautorität. Maßgeblich ist ausschließlich [AGENTS.md](../../../AGENTS.md) mit `SOLO_MAINTAINER_FLOW@1`. Keine zusätzlichen Required Checks, Admissions oder generellen Handoffs. Evidence-First; Fail Closed bei fehlender Berechtigung, Security-Evidence oder Quellenlage.

## Mission
User Feedback, Aktivierung, Churn, Retention und Support-Erfolg; nur innerhalb vorhandener CAPITAL-AI-Domains.

## Scope
User Feedback, Aktivierung, Churn, Retention und Support-Erfolg.

## Inputs
Versionsgebundene Nutzeranforderung, betroffener Repository-Scope, Daten-/Lizenzquellen und Baseline-Evidence.

## Outputs
Reproduzierbare Befunde oder Änderungen mit Artefakt-/Commit-Referenz, Risiken und Abnahmestatus.

## Dependencies
- Source of Truth: `.agents/skills/registry.json#skillGovernance.customer-success`
- Autorität: `AGENTS.md`
- Zuständige Domain: `PRODUCT`; geteilte Nutzung ist keine zusätzliche Ownership

## Domain Ownership
- Domain Owner: PRODUCT
- Escalation Owner: CAPITAL-AI-PRODUCT
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2

## KPIs
- verifizierte Onboarding-Completion
- Retention-Kohorten mit Quellen

## Evidence Requirements
Quellen- und Versionstand, Testkommando mit Ergebnis/Commit-SHA, Gegenprobe, beobachtete Grenzfälle und mögliche Rücknahme. KPI-Werte ohne Messung sind `NOT_PROVEN`.

## Security Constraints
- Security Boundary: Least Privilege, tenant-isolierte Daten, keine Schlüssel im Client oder in Berichten, keine unbewiesenen Providerrechte.
- Threat Assumptions: Ungeprüfte Provider-/Tenant-Grenzen, nicht reproduzierbare Ergebnisse, falsche Live- oder Lizenzbehauptungen.
- Failure Behaviour: `BLOCKED` bei unbewiesener sicherheitskritischer Voraussetzung; keine stillen Fallback-Rechte.
- Fail Closed Policy: Nur den nachweislich betroffenen Wirkpfad sperren; kein Credential/PII-Leak, keine implizite Lizenzfreigabe.

## Failure Conditions
Ungeprüfte Provider-/Tenant-Grenzen, nicht reproduzierbare Ergebnisse, falsche Live- oder Lizenzbehauptungen; keine ungeprüften Live-Daten, Auth- oder Tarif-Attests.

## Validation Rules
Unit-/Contract-/negative Tests je betroffenem Scope sowie nachvollziehbarer manueller Readback. Dokumentations-/CI-Strukturprüfungen prüfen nur Struktur, nicht die externe Anwendung.

## Acceptance Criteria
Ownership mit Registry identisch; drei Skill-Dateien vorhanden; Test- und Quellenbelege unterscheidbar; Security-Grenzen und Exit-Criteria nachvollziehbar.

## Escalation Matrix
- Umsetzung: PRODUCT.
- Zugänge / Vertrag / Zahlung: CAPITAL-AI-PRODUCT, nur wenn persönlich erforderlich.
- Sicherheitsbezug: CAPITAL-AI-TRUST im selben Workflow, keine neue Freigabestufe.
