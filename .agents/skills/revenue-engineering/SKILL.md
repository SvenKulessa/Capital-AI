---
name: revenue-engineering
description: "Pricing-/Checkout-Funnel, Stripe-Entitlements, Revenue Attribution, Retention und Kostenwahrheit; CAPITAL-AI GROWTH specialist with bounded authority."
---

# revenue-engineering

> Fachliche Arbeitsanweisung ohne eigenständige Freigabeautorität. Maßgeblich ist ausschließlich [AGENTS.md](../../../AGENTS.md) mit `SOLO_MAINTAINER_FLOW@1`. Keine zusätzlichen Required Checks, Admissions oder generellen Handoffs. Evidence-First; Fail Closed bei fehlender Berechtigung, Security-Evidence oder Quellenlage.

## Mission
Pricing-/Checkout-Funnel, Stripe-Entitlements, Revenue Attribution, Retention und Kostenwahrheit; ausschließlich nachvollziehbare und sicher begrenzte CAPITAL-AI-Arbeit liefern.

## Scope
Pricing-/Checkout-Funnel, Stripe-Entitlements, Revenue Attribution, Retention und Kostenwahrheit. Referenzrahmen: FinOps, GDPR, OWASP ASVS, FinTech Governance; regulatorische Anwendbarkeit immer konkret prüfen.

## Inputs
Versionsgebundener Stripe-Katalog, SKU-Bundles, anonymisierte Funnel-Events, Refund- und License-Evidence; Quellenstand und Datenschutzklassifikation verpflichtend benennen.

## Outputs
Nachvollziehbare Funnel-Verbesserungen, Revenue-/Entitlement-Abgleiche und Rollback-Plan; `VERIFIED`, `BLOCKED` und `NOT_PROVEN` unterscheiden.

## Dependencies
`AGENTS.md`, Registry, bestehende GROWTH-Engineering-/Advisory-Skills und tatsächlich vorhandene Quellsysteme; keine hypothetischen Providerrechte.

## Domain Ownership
- Domain Owner: GROWTH
- Escalation Owner: CAPITAL-AI-GROWTH
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2

## KPIs
- verifizierte Checkout-Conversion
- Nettoerlös nach Refunds und Providerkosten

## Evidence Requirements
Commit-SHA, Quellreferenzen und Daten-/Testzeitraum, Eingaben/Erwartungen, negative Tests, reproduzierbares Ergebnis und offene Restrisiken. Evidenz niemals behaupten, wenn nicht ausgeführt.

## Security Constraints
- Security Boundary: Client niemals als Zahlungs- oder Entitlement-Autorität; keine Zahlungs-PII in Analytics.
- Threat Assumptions: Unberechtigte Freischaltung, doppelte Events, Mismatch zwischen Preis und Rechnung, erfundener Umsatz.
- Failure Behaviour: Diagnose als `BLOCKED` oder `NOT_PROVEN` ausgeben; keine stillen Defaults.
- Fail Closed Policy: Fehlende Auth-, Daten-, Lizenz- oder Sicherheitsnachweise sperren nur den betroffenen gefährdeten Wirkpfad, ohne andere Teams zu blockieren.

## Failure Conditions
Unberechtigte Freischaltung, doppelte Events, Mismatch zwischen Preis und Rechnung, erfundener Umsatz; fehlende Datenherkunft oder fehlender Owner-/Provider-Nachweis führt zu `BLOCKED` im betroffenen Scope.

## Validation Rules
Signierte Stripe-Webhooks, idempotente Events, Tenant-Scope, Storno/Refund, Consent und Replay. Fehlende automatisierte Ausführung nicht als PASS ausweisen.

## Acceptance Criteria
Dokumentierte In-/Outputs, mindestens ein positiver und negativer reproduzierbarer Nachweis je geändertem Wirkpfad, fachlicher Owner zugeordnet, Risiken benannt und keine regressiven Trust-Boundary-Verletzungen.

## Escalation Matrix
- Sachlicher Befund / Umsetzung: `GROWTH` (Domain Owner).
- Kritische Rechte-, Kosten-, Vertrags- oder Zugangsentscheidung: `CAPITAL-AI-GROWTH` bzw. Human Owner, nur bei tatsächlicher Notwendigkeit.
- Security-/Datenschutzgrenze: `CAPITAL-AI-TRUST` beratend; `AGENTS.md` bleibt einzige Richtlinie.
