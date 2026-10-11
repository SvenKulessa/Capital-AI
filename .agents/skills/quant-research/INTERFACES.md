# quant-research — Interfaces

> Keine API- oder Berechtigungserweiterung; gilt ergänzend zum bestehenden `SKILL.md` und `AGENTS.md`.

## Inputs
- Versionsgebundene Nutzeranforderung, betroffener Repository-Scope, Daten-/Lizenzquellen und Baseline-Evidence
- Repository-Commit und präziser Scope; tenant- und lizenzrelevante Daten nur minimal.

## Outputs
- Reproduzierbare Befunde oder Änderungen mit Artefakt-/Commit-Referenz, Risiken und Abnahmestatus
- Verifizierter Status, Quelle, Validierungsweg und Restrisiken; keine erfundene Runtime-Evidence.

## Dependencies
- Registry-Eintrag: `skillGovernance.quant-research`
- Domain Owner: MARKET; cross-domain Konsultation ohne Transfer der Verantwortung.
- External Interfaces: ausschließlich real vorhandene und explizit berechtigte Provider/Tools.

## Security Boundary
Least Privilege, tenant-isolierte Daten, keine Schlüssel im Client oder in Berichten, keine unbewiesenen Providerrechte.

## Threat Assumptions
Ungeprüfte Provider-/Tenant-Grenzen, nicht reproduzierbare Ergebnisse, falsche Live- oder Lizenzbehauptungen.

## Failure Behaviour
Bei fehlender Evidence `NOT_PROVEN`; bei Verletzung einer Trust Boundary `BLOCKED` (fail-closed). Kein automatischer Provider-/Kostenwechsel.

## Validation Contract
Unit-/Contract-/negative Tests je betroffenem Scope sowie nachvollziehbarer manueller Readback; Evidenz und exakten Commit speichern. Keine zusätzlichen Required Checks.

## Domain Ownership
- Domain Owner: MARKET
- Escalation Owner: CAPITAL-AI-MARKET
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2
