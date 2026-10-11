# revenue-engineering — Interfaces

> Keine API- oder Berechtigungserweiterung; gilt ergänzend zum bestehenden `SKILL.md` und `AGENTS.md`.

## Inputs
- Versionsgebundener Stripe-Katalog, SKU-Bundles, anonymisierte Funnel-Events, Refund- und License-Evidence
- Repository-Commit und präziser Scope; tenant- und lizenzrelevante Daten nur minimal.

## Outputs
- Nachvollziehbare Funnel-Verbesserungen, Revenue-/Entitlement-Abgleiche und Rollback-Plan
- Verifizierter Status, Quelle, Validierungsweg und Restrisiken; keine erfundene Runtime-Evidence.

## Dependencies
- Registry-Eintrag: `skillGovernance.revenue-engineering`
- Domain Owner: GROWTH; cross-domain Konsultation ohne Transfer der Verantwortung.
- External Interfaces: ausschließlich real vorhandene und explizit berechtigte Provider/Tools.

## Security Boundary
Client niemals als Zahlungs- oder Entitlement-Autorität; keine Zahlungs-PII in Analytics.

## Threat Assumptions
Unberechtigte Freischaltung, doppelte Events, Mismatch zwischen Preis und Rechnung, erfundener Umsatz.

## Failure Behaviour
Bei fehlender Evidence `NOT_PROVEN`; bei Verletzung einer Trust Boundary `BLOCKED` (fail-closed). Kein automatischer Provider-/Kostenwechsel.

## Validation Contract
Signierte Stripe-Webhooks, idempotente Events, Tenant-Scope, Storno/Refund, Consent und Replay; Evidenz und exakten Commit speichern. Keine zusätzlichen Required Checks.

## Domain Ownership
- Domain Owner: GROWTH
- Escalation Owner: CAPITAL-AI-GROWTH
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2
