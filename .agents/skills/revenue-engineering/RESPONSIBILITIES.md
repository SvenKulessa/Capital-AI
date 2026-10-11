# revenue-engineering — Responsibilities

> Fachliche Arbeitsanweisung ohne eigenständige Freigabeautorität. Maßgeblich ist ausschließlich [AGENTS.md](../../../AGENTS.md) mit `SOLO_MAINTAINER_FLOW@1`. Keine zusätzlichen Required Checks, Admissions oder generellen Handoffs. Evidence-First; Fail Closed bei fehlender Berechtigung, Security-Evidence oder Quellenlage.

## Mission
Pricing-/Checkout-Funnel, Stripe-Entitlements, Revenue Attribution, Retention und Kostenwahrheit; nur innerhalb vorhandener CAPITAL-AI-Domains.

## Scope
Pricing-/Checkout-Funnel, Stripe-Entitlements, Revenue Attribution, Retention und Kostenwahrheit.

## Inputs
Versionsgebundener Stripe-Katalog, SKU-Bundles, anonymisierte Funnel-Events, Refund- und License-Evidence.

## Outputs
Nachvollziehbare Funnel-Verbesserungen, Revenue-/Entitlement-Abgleiche und Rollback-Plan.

## Dependencies
- Source of Truth: `.agents/skills/registry.json#skillGovernance.revenue-engineering`
- Autorität: `AGENTS.md`
- Zuständige Domain: `GROWTH`; geteilte Nutzung ist keine zusätzliche Ownership

## Domain Ownership
- Domain Owner: GROWTH
- Escalation Owner: CAPITAL-AI-GROWTH
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2

## KPIs
- verifizierte Checkout-Conversion
- Nettoerlös nach Refunds und Providerkosten

## Evidence Requirements
Quellen- und Versionstand, Testkommando mit Ergebnis/Commit-SHA, Gegenprobe, beobachtete Grenzfälle und mögliche Rücknahme. KPI-Werte ohne Messung sind `NOT_PROVEN`.

## Security Constraints
- Security Boundary: Client niemals als Zahlungs- oder Entitlement-Autorität; keine Zahlungs-PII in Analytics.
- Threat Assumptions: Unberechtigte Freischaltung, doppelte Events, Mismatch zwischen Preis und Rechnung, erfundener Umsatz.
- Failure Behaviour: `BLOCKED` bei unbewiesener sicherheitskritischer Voraussetzung; keine stillen Fallback-Rechte.
- Fail Closed Policy: Nur den nachweislich betroffenen Wirkpfad sperren; kein Credential/PII-Leak, keine implizite Lizenzfreigabe.

## Failure Conditions
Unberechtigte Freischaltung, doppelte Events, Mismatch zwischen Preis und Rechnung, erfundener Umsatz; keine ungeprüften Live-Daten, Auth- oder Tarif-Attests.

## Validation Rules
Signierte Stripe-Webhooks, idempotente Events, Tenant-Scope, Storno/Refund, Consent und Replay. Dokumentations-/CI-Strukturprüfungen prüfen nur Struktur, nicht die externe Anwendung.

## Acceptance Criteria
Ownership mit Registry identisch; drei Skill-Dateien vorhanden; Test- und Quellenbelege unterscheidbar; Security-Grenzen und Exit-Criteria nachvollziehbar.

## Escalation Matrix
- Umsetzung: GROWTH.
- Zugänge / Vertrag / Zahlung: CAPITAL-AI-GROWTH, nur wenn persönlich erforderlich.
- Sicherheitsbezug: CAPITAL-AI-TRUST im selben Workflow, keine neue Freigabestufe.
