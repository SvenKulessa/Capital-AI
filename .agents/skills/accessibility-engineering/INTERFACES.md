# accessibility-engineering — Interfaces

> Keine API- oder Berechtigungserweiterung; gilt ergänzend zum bestehenden `SKILL.md` und `AGENTS.md`.

## Inputs
- Betroffene React-Komponenten, Accessibility-Befunde, Browser- und AT-Matrix
- Repository-Commit und präziser Scope; tenant- und lizenzrelevante Daten nur minimal.

## Outputs
- Getestete Komponenten und dokumentierte Keyboard-/Screenreader-Reproduktionen
- Verifizierter Status, Quelle, Validierungsweg und Restrisiken; keine erfundene Runtime-Evidence.

## Dependencies
- Registry-Eintrag: `skillGovernance.accessibility-engineering`
- Domain Owner: PRODUCT; cross-domain Konsultation ohne Transfer der Verantwortung.
- External Interfaces: ausschließlich real vorhandene und explizit berechtigte Provider/Tools.

## Security Boundary
Kein PII in Testfixtures; zugängliche Formulare dürfen Auth-Sicherheit nicht aushebeln.

## Threat Assumptions
Unbedienbare Dialoge, Fokusverlust, kontrastarme Zustände, rein farbcodierte Finanzdaten.

## Failure Behaviour
Bei fehlender Evidence `NOT_PROVEN`; bei Verletzung einer Trust Boundary `BLOCKED` (fail-closed). Kein automatischer Provider-/Kostenwechsel.

## Validation Contract
Axe/Lint als Ergänzung; manuelle Tab-Reihenfolge, Tastatur, Screenreader, Touch und Zoom; Evidenz und exakten Commit speichern. Keine zusätzlichen Required Checks.

## Domain Ownership
- Domain Owner: PRODUCT
- Escalation Owner: CAPITAL-AI-PRODUCT
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2
