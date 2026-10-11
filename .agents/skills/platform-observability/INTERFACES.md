# platform-observability — Interfaces

> Keine API- oder Berechtigungserweiterung; gilt ergänzend zum bestehenden `SKILL.md` und `AGENTS.md`.

## Inputs
- Service-Topologie, anonymisierte Traces, SLOs, Runbooks, Incident-Historie
- Repository-Commit und präziser Scope; tenant- und lizenzrelevante Daten nur minimal.

## Outputs
- Dashboards, nachvollziehbare SLI/SLO-Definitionen, Alarme und evidenzgebundene Betriebsbefunde
- Verifizierter Status, Quelle, Validierungsweg und Restrisiken; keine erfundene Runtime-Evidence.

## Dependencies
- Registry-Eintrag: `skillGovernance.platform-observability`
- Domain Owner: PLATFORM; cross-domain Konsultation ohne Transfer der Verantwortung.
- External Interfaces: ausschließlich real vorhandene und explizit berechtigte Provider/Tools.

## Security Boundary
Tokens, Provider-Keys, mandantenbezogene Nutzerdaten niemals in Logs oder Traces.

## Threat Assumptions
PII-Leaks, ungebremste Telemetrie-Kosten, blinde Alerts und falsche Verfügbarkeitsaussagen.

## Failure Behaviour
Bei fehlender Evidence `NOT_PROVEN`; bei Verletzung einer Trust Boundary `BLOCKED` (fail-closed). Kein automatischer Provider-/Kostenwechsel.

## Validation Contract
Redaktions-/Tenant-Isolation-Tests, Trace-Korrelation, Alert-Noise, Sampling und Kostenbudget; Evidenz und exakten Commit speichern. Keine zusätzlichen Required Checks.

## Domain Ownership
- Domain Owner: PLATFORM
- Escalation Owner: CAPITAL-AI-PLATFORM
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2
